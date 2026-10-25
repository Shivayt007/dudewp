import { getRawMovie } from "@/lib/movies";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Telegram poster URLs are retrieved server-side; the bot token is never exposed.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const notFound = () => new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
  try {
    const { id } = await params;
    const movie = await getRawMovie(id);
    const fileId = movie?.poster_file_id;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || typeof fileId !== "string" || !fileId) return notFound();

    const abort = AbortSignal.timeout(12000);
    const metadataResponse = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`, { signal: abort, cache: "no-store" });
    const metadata: { ok?: boolean; result?: { file_path?: string } } = await metadataResponse.json();
    const path = metadata.result?.file_path;
    if (!metadata.ok || !path || path.startsWith("/") || path.includes("..")) return notFound();
    const image = await fetch(`https://api.telegram.org/file/bot${token}/${path}`, { signal: abort, cache: "no-store" });
    if (!image.ok || !image.body) return notFound();
    const type = image.headers.get("content-type") || "application/octet-stream";
    if (!type.startsWith("image/")) return notFound();
    return new Response(image.body, {
      status: 200,
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return notFound();
  }
}
