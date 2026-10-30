import { NextRequest, NextResponse } from "next/server";
import { findMovies } from "@/lib/movies";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams;
    const sortValue = query.get("sort") || "latest";
    const sort = sortValue === "title" || sortValue === "popular" ? sortValue : "latest";
    const data = await findMovies({
      kind: ["episode", "promo", "highlight"].includes(query.get("kind") || "") ? query.get("kind") as "episode" | "promo" | "highlight" : undefined,
      genre: query.get("genre") || "",
      year: Number(query.get("year")) || undefined,
      search: query.get("search") || "",
      language: query.get("language") || "",
      sort,
      page: Number(query.get("page") || 1),
      limit: Number(query.get("limit") || 24),
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "private, max-age=15" } });
  } catch {
    return NextResponse.json({ error: "Could not load movies" }, { status: 503 });
  }
}
