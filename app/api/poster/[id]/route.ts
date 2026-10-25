import { getRawMovie } from "@/lib/movies";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A poster Telegram file_id only works with a bot authorized to retrieve that
// particular file. This proxy never exposes the bot token or Telegram file URL.
// Distinct X-Poster-Status values make EasyPanel/network diagnosis possible.
function unavailable(status: string, code = 404) {
  return new Response(null, {
    status: code,
    headers: { "Cache-Control": "no-store", "X-Poster-Status": status },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const movie = await getRawMovie(id);
    if (!movie) return unavailable("movie-not-found");
    const fileId = String(movie.poster_file_id || "").trim();
    if (!fileId) return unavailable("poster-file-id-missing");

    // Some catalogs upload posters with a different Telegram bot than the
    // streaming bot. The poster bot token can be configured independently.
    const token = (process.env.TELEGRAM_POSTER_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "").trim();
    if (!token) {
      console.warn("Poster unavailable: set TELEGRAM_POSTER_BOT_TOKEN or TELEGRAM_BOT_TOKEN in EasyPanel");
      return unavailable("telegram-bot-token-missing", 503);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const metadataResponse = await fetch(`https://api.telegram.org/bot${token}/getFile`, {
        method: "POST", body: new URLSearchParams({ file_id: fileId }),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: controller.signal, cache: "no-store",
      });
      const metadata = await metadataResponse.json() as {
        ok?: boolean;
        description?: string;
        error_code?: number;
        result?: { file_path?: string };
      };
      const path = metadata.result?.file_path;
      if (!metadataResponse.ok || !metadata.ok || !path) {
        console.warn("Telegram poster getFile rejected:", metadata.error_code || metadataResponse.status, metadata.description || "no file path");
        return unavailable("telegram-getfile-rejected", 502);
      }
      if (path.startsWith("/") || path.split("/").includes("..")) return unavailable("invalid-file-path", 502);

      const image = await fetch(`https://api.telegram.org/file/bot${token}/${path}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!image.ok || !image.body) return unavailable("telegram-image-download-failed", 502);
      const type = (image.headers.get("content-type") || "").toLowerCase();
      if (!type.startsWith("image/")) return unavailable("telegram-returned-non-image", 502);
      return new Response(image.body, {
        status: 200,
        headers: {
          "Content-Type": type,
          "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
          "X-Content-Type-Options": "nosniff",
          "X-Poster-Status": "ok",
        },
      });
    } finally { clearTimeout(timeout); }
  } catch (error) {
    console.error("Telegram poster proxy failed:", error instanceof Error ? error.name : "error");
    return unavailable("poster-proxy-error", 503);
  }
}