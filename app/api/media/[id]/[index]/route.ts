import { NextResponse } from "next/server";
import { getRawMovie } from "@/lib/movies";
import { tempUrlForFile } from "@/lib/temp-links.mjs";
import { createHlsSession, mkvHlsEnabled } from "@/lib/server-hls";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  try {
    const { id, index } = await params;
    if (!/^\d+$/.test(index)) return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    const movie = await getRawMovie(id);
    if (!movie) return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    const file = Array.isArray(movie.files) ? movie.files[Number(index)] : null;
    if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });
    const url = tempUrlForFile(file);
    if (!url) return NextResponse.json({ error: "A usable stored stream_link with ?hash= is missing" }, { status: 422 });
    const isMkv = /\.mkv$/i.test(String(file.file_name || "")) || /matroska/i.test(String(file.mime_type || ""));
    if (isMkv && mkvHlsEnabled()) {
      try {
        const session = await createHlsSession(url);
        return NextResponse.json({
          url: `/api/hls/${session.id}/master.m3u8`, streamingType: "manifest", hlsSession: session.id,
          embeddedSubtitles: session.subtitles,
          mimeType: "application/vnd.apple.mpegurl", expiresIn: 1200, fileName: file.file_name || "",
        }, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        return NextResponse.json({ error: `MKV processing unavailable: ${error instanceof Error ? error.message : "Unknown error"}` }, { status: 503 });
      }
    }
    return NextResponse.json({ url, streamingType: "direct", expiresIn: Number(process.env.TEMP_LINK_EXPIRY_SECONDS || 5600), mimeType: file.mime_type || "", fileName: file.file_name || "" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not create a video link" }, { status: 503 });
  }
}