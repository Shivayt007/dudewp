import { NextResponse } from 'next/server';
import { getHlsSession, requestSubtitle, subtitleStatus } from '@/lib/server-hls';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ session: string; index: string }> };
function parse(session: string, value: string) {
  if (!getHlsSession(session) || !/^\d+$/.test(value)) return null;
  const index = Number(value);
  return index <= 100 ? index : null;
}
export async function POST(_req: Request, { params }: Params) {
  const { session, index: raw } = await params;
  const index = parse(session, raw);
  if (index === null) return NextResponse.json({ error: 'Invalid playback session or track' }, { status: 404 });
  const job = requestSubtitle(session, index);
  return NextResponse.json(subtitleStatus(session, index) || { status: job.status }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function GET(_req: Request, { params }: Params) {
  const { session, index: raw } = await params;
  const index = parse(session, raw);
  if (index === null) return NextResponse.json({ error: 'Invalid playback session or track' }, { status: 404 });
  return NextResponse.json(subtitleStatus(session, index), { headers: { 'Cache-Control': 'no-store' } });
}