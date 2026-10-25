import { getRawMovie } from "@/lib/movies";
import { tempUrlForFile } from "@/lib/temp-links.mjs";
import { relayStream } from "@/lib/stream-relay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function stream(request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  try {
    const { id, index } = await params;
    if (!/^\d+$/.test(index)) return new Response("Invalid file", { status: 400 });
    const movie = await getRawMovie(id);
    if (!movie) return new Response("Movie not found", { status: 404 });
    const file = Array.isArray(movie.files) ? movie.files[Number(index)] : null;
    if (!file) return new Response("File not found", { status: 404 });
    // Only database-backed URLs signed for the configured FileToLink origin
    // are accepted. This endpoint never accepts an arbitrary proxy target.
    const url = tempUrlForFile(file);
    if (!url) return new Response("No usable source URL", { status: 422 });
    return await relayStream(request, url);
  } catch {
    return new Response("The stream server could not be reached. Refresh the link and retry.", { status: 502 });
  }
}

export { stream as GET, stream as HEAD };
