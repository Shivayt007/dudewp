import { getHlsSession, readHlsAsset, readSubtitle } from '@/lib/server-hls';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ session: string; asset: string }> }) {
  const { session, asset } = await params;
  if (!getHlsSession(session)) return new Response('Playback session expired', { status: 404 });
  if (/^subtitle_\d+\.vtt$/.test(asset)) {
    const index = Number(asset.match(/^subtitle_(\d+)\.vtt$/)?.[1]);
    const content = await readSubtitle(session, index);
    return content ? new Response(new Uint8Array(content), { headers: { 'Content-Type': 'text/vtt; charset=utf-8', 'Cache-Control': 'private, max-age=3600' } }) : new Response('Subtitle unavailable', { status: 404 });
  }
  const result = await readHlsAsset(session, asset);
  if (!result) return new Response('Segment not ready or unavailable', { status: 503, headers: { 'Retry-After': '1', 'Cache-Control': 'no-store' } });
  return new Response(new Uint8Array(result.content), { headers: {
    'Content-Type': result.mime, 'Cache-Control': asset.endsWith('.m3u8') ? 'no-store' : 'private, max-age=600',
    'Access-Control-Allow-Origin': '*',
  } });
}