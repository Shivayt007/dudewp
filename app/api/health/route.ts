import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    return NextResponse.json({ status: "ok", mongodb: "connected" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Do not leak URI, credentials, or server error details.
    return NextResponse.json({ status: "error", mongodb: "unavailable" }, { status: 503 });
  }
}
