import { NextResponse } from "next/server";
import { getRawMovie } from "@/lib/movies";
import { tempUrlForFile } from "@/lib/temp-links.mjs";
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
    return NextResponse.json({ url, expiresIn: Number(process.env.TEMP_LINK_EXPIRY_SECONDS || 5600), mimeType: file.mime_type || "", fileName: file.file_name || "" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not create a video link" }, { status: 503 });
  }
}
