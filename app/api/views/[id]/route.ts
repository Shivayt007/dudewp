import { ObjectId } from "mongodb";
import { getMovieCollection } from "@/lib/mongodb";
export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id) || id.length !== 24) return new Response(null, { status: 400 });
    const result = await (await getMovieCollection()).updateOne({ content_type: "hollywood", published: true, "files.0": { $exists: true }, _id: new ObjectId(id) }, { $inc: { views: 1 } });
    return new Response(null, { status: result.matchedCount ? 204 : 404, headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response(null, { status: 503 });
  }
}

