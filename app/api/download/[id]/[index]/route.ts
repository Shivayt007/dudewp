import { NextResponse } from "next/server";
import { getRawMovie } from "@/lib/movies";
import { tempUrlForFile } from "@/lib/temp-links.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  try {
    const { id, index } = await params;
    if (!/^\d+$/.test(index)) return new Response("Invalid file", { status: 400 });
    const movie = await getRawMovie(id);
    if (!movie) return new Response("Movie not found", { status: 404 });
    const file = Array.isArray(movie.files) ? movie.files[Number(index)] : null;
    if (!file) return new Response("File not found", { status: 404 });
    const link = tempUrlForFile(file);
    if (!link) return new Response("No usable source URL", { status: 422 });
    // A redirect avoids sending multi-GB media through your Next.js VPS.
    // Whether it downloads or opens inline depends on TgLink's Content-Disposition.
    return NextResponse.redirect(new URL(link), { status: 307, headers: { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer" } });
  } catch {
    return new Response("Could not generate download URL", { status: 503 });
  }
}
