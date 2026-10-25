/** Optional, bounded server-side MKV -> HLS playback bridge.
 * Requires ENABLE_MKV_HLS=true and ffmpeg/ffprobe binaries in the Docker image.
 * One Node.js instance only; HLS sessions are intentionally ephemeral in /tmp.
 */
import 'server-only';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = '/tmp/dude-hls';
const IDLE_MS = 20 * 60_000;
const MAX_LIFETIME_MS = 3 * 60 * 60_000;
const MAX_AUDIO = 6;
const MAX_SUBTITLES = 12;
const MAX_PROBE_BYTES = 1_500_000;
const MAX_ACTIVE = 1; // Avoid accidentally saturating a shared VPS.
const TEXT_CODECS = new Set(['subrip', 'srt', 'ass', 'ssa', 'webvtt', 'mov_text', 'text']);

export type EmbeddedSubtitle = { index: number; label: string; language: string };
type ProbeStream = {
  index: number;
  codec_type?: string;
  codec_name?: string;
  pix_fmt?: string;
  tags?: { language?: string; title?: string };
  disposition?: { default?: number };
};
type ProbeResult = { streams?: ProbeStream[] };
type SubtitleJob = { status: 'working' | 'ready' | 'error'; message?: string; proc?: ChildProcess };
export type HlsSession = {
  id: string; directory: string; sourceUrl: string; created: number; touched: number;
  proc: ChildProcess | null; state: 'starting' | 'running' | 'done' | 'error'; error: string;
  subtitles: EmbeddedSubtitle[]; subtitleJobs: Map<number, SubtitleJob>;
};

declare global {
  // Shared across Next dev module reloads. No persistence or multi-instance guarantees.
  // eslint-disable-next-line no-var
  var __dudeHlsSessions: Map<string, HlsSession> | undefined;
  // eslint-disable-next-line no-var
  var __dudeHlsSweep: ReturnType<typeof setInterval> | undefined;
}
const sessions = globalThis.__dudeHlsSessions ?? (globalThis.__dudeHlsSessions = new Map());

function sweep() {
  const now = Date.now();
  for (const s of sessions.values()) {
    if (now - s.touched > IDLE_MS || now - s.created > MAX_LIFETIME_MS) {
      s.proc?.kill('SIGKILL');
      for (const job of s.subtitleJobs.values()) job.proc?.kill('SIGKILL');
      sessions.delete(s.id);
      void rm(s.directory, { recursive: true, force: true }).catch(() => {});
    }
  }
}
if (!globalThis.__dudeHlsSweep) {
  globalThis.__dudeHlsSweep = setInterval(sweep, 60_000);
  globalThis.__dudeHlsSweep.unref();
}

function limitedSpawn(binary: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let result = '';
    let stderr = '';
    let done = false;
    const finish = (error?: Error) => {
      if (done) return;
      done = true; clearTimeout(timer);
      if (error) reject(error);
      else resolve(result);
    };
    const timer = setTimeout(() => { proc.kill('SIGKILL'); finish(new Error('Source probing timed out')); }, timeoutMs);
    proc.on('error', err => finish(err));
    proc.stdout.on('data', chunk => {
      result += chunk.toString();
      if (result.length > MAX_PROBE_BYTES) { proc.kill('SIGKILL'); finish(new Error('Too many media tracks')); }
    });
    proc.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-3000); });
    proc.on('close', code => finish(code === 0 ? undefined : new Error('Source probe failed. Check the TgLink URL, expiration, and HTTP Range support.')));
  });
}

function cleanLanguage(value: string | undefined): string {
  // FFmpeg variant arguments must not contain whitespace or separators.
  return /^[a-z]{2,3}$/i.test(value || '') ? value!.toLowerCase() : 'und';
}
function labelFor(stream: ProbeStream, n: number): string {
  const title = (stream.tags?.title || '').trim().slice(0, 80);
  return title || `Subtitle ${n + 1} (${cleanLanguage(stream.tags?.language)})`;
}
function humanError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 180) : 'Media processing unavailable';
}

export function mkvHlsEnabled() { return process.env.ENABLE_MKV_HLS === 'true'; }

export async function createHlsSession(sourceUrl: string): Promise<HlsSession> {
  if (!mkvHlsEnabled()) throw new Error('MKV HLS is not enabled on this server');
  sweep();
  if (Array.from(sessions.values()).filter(s => s.state === 'starting' || s.state === 'running').length >= MAX_ACTIVE)
    throw new Error('The video converter is busy. Try again after the current session finishes.');
  // Never fetch arbitrary URLs: the media route only passes values returned by the
  // existing TgLink signer, which validates source host and protocol.
  const id = randomUUID();
  const directory = join(ROOT, id);
  const now = Date.now();
  const session: HlsSession = {
    id, directory, sourceUrl, created: now, touched: now, proc: null,
    state: 'starting', error: '', subtitles: [], subtitleJobs: new Map(),
  };
  sessions.set(id, session);
  try {
    await mkdir(directory, { recursive: true });
    const output = await limitedSpawn('ffprobe', [
      '-v', 'error', '-rw_timeout', '12000000', '-probesize', '12000000',
      '-analyzeduration', '5000000', '-show_streams', '-of', 'json', sourceUrl,
    ], 25000);
    const streams = (JSON.parse(output) as ProbeResult).streams || [];
    const vid = streams.find(x => x.codec_type === 'video');
    if (!vid) throw new Error('This source has no video track');
    const audio = streams.filter(x => x.codec_type === 'audio').slice(0, MAX_AUDIO);
    // Map only text subtitle indexes by their order among *all* subtitle streams.
    const allSubtitleStreams = streams.filter(x => x.codec_type === 'subtitle');
    const supportedSubs = allSubtitleStreams.map((x, index) => ({ stream: x, index })).filter(x => TEXT_CODECS.has(x.stream.codec_name || ''))
      .slice(0, MAX_SUBTITLES).map(({ stream, index }) => ({ index, label: labelFor(stream, index), language: cleanLanguage(stream.tags?.language) }));

    const args = [
      '-hide_banner', '-loglevel', 'warning', '-nostdin', '-rw_timeout', '12000000',
      '-i', sourceUrl, '-map', '0:v:0',
      ...audio.flatMap((_, n) => ['-map', `0:a:${n}`]),
    ];
    if (vid.codec_name === 'h264' && vid.pix_fmt === 'yuv420p') {
      args.push('-c:v', 'copy');
    } else {
      args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '29',
        '-pix_fmt', 'yuv420p', '-vf', 'scale=w=min(1280\\,iw):h=-2',
        '-threads', '2', '-force_key_frames', 'expr:gte(t,n_forced*5)');
    }
    if (audio.length) args.push('-c:a', 'aac', '-b:a', '112k', '-ar', '48000', '-ac', '2');
    const mappings = ['v:0,agroup:aud', ...audio.map((stream, n) => `a:${n},agroup:aud,language:${cleanLanguage(stream.tags?.language)}${n === 0 ? ',default:yes' : ''}`)];
    if (!audio.length) mappings[0] = 'v:0';
    args.push('-f', 'hls', '-hls_time', '5', '-hls_list_size', '0', '-hls_playlist_type', 'event',
      '-hls_flags', 'independent_segments', '-var_stream_map', mappings.join(' '),
      '-master_pl_name', 'master.m3u8',
      '-hls_segment_filename', join(directory, 'stream_%v_%05d.ts'),
      join(directory, 'stream_%v.m3u8'));

    session.subtitles = supportedSubs;
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    session.proc = proc;
    let log = '';
    proc.stderr?.on('data', part => { log = (log + part.toString()).slice(-4000); });
    proc.on('error', err => { session.state = 'error'; session.error = humanError(err); });
    proc.on('close', code => {
      session.proc = null;
      session.state = code === 0 ? 'done' : 'error';
      if (code !== 0) session.error = 'FFmpeg could not read or encode this video. Check the EasyPanel logs for the cause.';
    });
    // Wait for playable segments and a manifest with EXTINF; not just an empty master.
    const masterPath = join(directory, 'master.m3u8');
    const firstPlaylistPath = join(directory, 'stream_0.m3u8');
    for (let i = 0; i < 160; i++) {
      if (session.state === 'error') throw new Error(session.error);
      if (await stat(masterPath).then(x => x.size > 0).catch(() => false)) {
        const first = await readFile(firstPlaylistPath, 'utf8').catch(() => '');
        if (first.includes('#EXTINF')) {
          session.state = 'running';
          return session;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error('Source did not produce a playable stream within 40 seconds');
  } catch (error) {
    const session = sessions.get(id);
    session?.proc?.kill('SIGKILL');
    sessions.delete(id);
    void rm(directory, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

export function getHlsSession(id: string): HlsSession | null {
  if (!/^[a-f\d-]{36}$/i.test(id)) return null;
  const session = sessions.get(id) || null;
  if (!session) return null;
  session.touched = Date.now();
  return session;
}

export async function readHlsAsset(id: string, asset: string): Promise<{ content: Buffer; mime: string } | null> {
  if (!/^(?:master|stream_\d+)\.m3u8$/.test(asset) && !/^stream_\d+_\d{5}\.ts$/.test(asset)) return null;
  const session = getHlsSession(id);
  if (!session) return null;
  for (let i = 0; i < 30; i++) {
    try {
      const content = await readFile(join(session.directory, asset));
      if (content.length) return { content, mime: asset.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t' };
    } catch { /* May still be generated. */ }
    if (session.state === 'error' || session.state === 'done') break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return null;
}

export function requestSubtitle(id: string, index: number): SubtitleJob {
  const session = getHlsSession(id);
  if (!session || !Number.isInteger(index) || !session.subtitles.some(x => x.index === index))
    return { status: 'error', message: 'This subtitle track is unavailable' };
  const existing = session.subtitleJobs.get(index);
  if (existing) return existing;
  if (Array.from(session.subtitleJobs.values()).some(j => j.status === 'working')) return { status: 'error', message: 'Another subtitle is being extracted; try again shortly' };
  const job: SubtitleJob = { status: 'working' };
  session.subtitleJobs.set(index, job);
  const output = join(session.directory, `subtitle_${index}.vtt`);
  const proc = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-rw_timeout', '12000000',
    '-i', session.sourceUrl, '-map', `0:s:${index}`, '-c:s', 'webvtt', '-f', 'webvtt', '-y', output,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  job.proc = proc;
  let logs = '';
  proc.stderr?.on('data', data => { logs = (logs + data.toString()).slice(-1000); });
  proc.on('error', err => { job.status = 'error'; job.message = humanError(err); });
  proc.on('close', code => {
    job.proc = undefined;
    if (job.status === 'error') return;
    if (code === 0) job.status = 'ready';
    else { job.status = 'error'; job.message = 'Subtitle could not be converted to WebVTT or the remote source could not be read.'; }
  });
  return job;
}
export function subtitleStatus(id: string, index: number): { status: string; message?: string; url?: string } {
  const session = getHlsSession(id);
  if (!session) return { status: 'error', message: 'Playback session expired' };
  const job = session.subtitleJobs.get(index);
  if (!job) return { status: 'error', message: 'Subtitle extraction not started' };
  return { status: job.status, ...(job.message ? { message: job.message } : {}), ...(job.status === 'ready' ? { url: `/api/hls/${id}/subtitle_${index}.vtt` } : {}) };
}
export async function readSubtitle(id: string, index: number) {
  const session = getHlsSession(id);
  if (!session || session.subtitleJobs.get(index)?.status !== 'ready') return null;
  return readFile(join(session.directory, `subtitle_${index}.vtt`)).catch(() => null);
}