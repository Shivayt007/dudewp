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

const diagnosis: Record<string, string> = {
  "ok": "Poster is accessible. If it is not visible, clear the browser cache and verify that EasyPanel serves this deployment.",
  "movie-not-found": "MongoDB movie ID is invalid or no longer exists.",
  "poster-file-id-missing": "MongoDB movie has no poster_file_id. poster_msg_id and poster_filename alone cannot be downloaded using Telegram getFile.",
  "telegram-bot-token-missing": "Set TELEGRAM_POSTER_BOT_TOKEN to the exact bot used to upload/store poster_file_id; then redeploy the EasyPanel service.",
  "telegram-getfile-rejected": "Telegram getFile rejected this poster_file_id. The token may be invalid or from a different bot; re-upload the poster with the configured bot and store its new file_id.",
  "invalid-file-path": "Telegram returned an unsafe file path.",
  "telegram-image-download-failed": "Telegram supplied a file path, but the image download failed or exceeded permitted limits.",
  "telegram-returned-non-image": "The stored Telegram file_id did not resolve to an image.",
  "poster-proxy-error": "Telegram access failed, timed out, or the server could not fetch the poster. Inspect EasyPanel service logs and outbound HTTPS access to api.telegram.org.",
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const movie = await getRawMovie(id);
    const diagnostic = new URL(request.url).searchParams.has("diagnose");
    const report = (status: string, httpStatus = 200) => new Response(JSON.stringify({ status, message: diagnosis[status] || "Check server logs and Telegram poster configuration." }), { status: httpStatus, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
    if (!movie) return diagnostic ? report("movie-not-found", 404) : unavailable("movie-not-found");
    const fileId = String(movie.poster_file_id || "").trim();
    if (!fileId) return diagnostic ? report("poster-file-id-missing", 404) : unavailable("poster-file-id-missing");

    // Some catalogs upload posters with a different Telegram bot than the
    // streaming bot. The poster bot token can be configured independently.
    const token = (process.env.TELEGRAM_POSTER_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "").trim();
    if (!token) {
      console.warn("Poster unavailable: set TELEGRAM_POSTER_BOT_TOKEN or TELEGRAM_BOT_TOKEN in EasyPanel");
      return diagnostic ? report("telegram-bot-token-missing", 503) : unavailable("telegram-bot-token-missing", 503);
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
        return diagnostic ? report("telegram-getfile-rejected", 502) : unavailable("telegram-getfile-rejected", 502);
      }
      if (path.startsWith("/") || path.split("/").includes("..")) return diagnostic ? report("invalid-file-path", 502) : unavailable("invalid-file-path", 502);

      const image = await fetch(`https://api.telegram.org/file/bot${token}/${path}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!image.ok || !image.body) return diagnostic ? report("telegram-image-download-failed", 502) : unavailable("telegram-image-download-failed", 502);
      const type = (image.headers.get("content-type") || "").toLowerCase();
      if (!type.startsWith("image/")) return diagnostic ? report("telegram-returned-non-image", 502) : unavailable("telegram-returned-non-image", 502);
      if (diagnostic) { await image.body.cancel(); return report("ok"); }
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
    if (new URL(request.url).searchParams.has("diagnose")) return new Response(JSON.stringify({ status: "poster-proxy-error", message: diagnosis["poster-proxy-error"] }), { status: 503, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
    return unavailable("poster-proxy-error", 503);
  }
}