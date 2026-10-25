import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { relayStream } = await load('../lib/stream-relay.ts');
const { choosePlaybackSource } = await load('../lib/playback-source.ts');
const realFetch = globalThis.fetch;
const signal = new AbortController().signal;
const target = 'https://media.example/123?temp_token=private';
const relay = '/api/stream/movie/0';
try {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  assert.equal(await choosePlaybackSource(target, relay, signal), relay);
  globalThis.fetch = async () => new Response(new Uint8Array([1]), { status: 206, headers: { 'Content-Range': 'bytes 0-0/100' } });
  assert.equal(await choosePlaybackSource(target, relay, signal), target);
  globalThis.fetch = async () => new Response(new Uint8Array([1]), { status: 206 });
  assert.equal(await choosePlaybackSource(target, relay, signal), relay);
  const aborted = new AbortController(); aborted.abort();
  globalThis.fetch = async () => { throw new DOMException('Aborted', 'AbortError'); };
  await assert.rejects(choosePlaybackSource(target, relay, aborted.signal));

  let cancelled = false;
  let observed;
  globalThis.fetch = async (url, options) => {
    observed = { url, options };
    return new Response(new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array([42])); },
      cancel() { cancelled = true; },
    }), { status: 206, headers: { 'Content-Range': 'bytes 5-7/100', 'Content-Length': '3', 'Content-Type': 'video/x-matroska', 'Set-Cookie': 'secret=1' } });
  };
  const request = new Request('https://website.example/api/stream/movie/0', { headers: { Range: 'bytes=5-7', 'User-Agent': 'Browser test', Cookie: 'private=1' } });
  const response = await relayStream(request, target);
  assert.equal(observed.options.headers.get('Range'), 'bytes=5-7');
  assert.equal(observed.options.headers.get('User-Agent'), 'Browser test');
  assert.equal(observed.options.headers.get('Cookie'), null);
  assert.equal(observed.options.redirect, 'manual');
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('Content-Range'), 'bytes 5-7/100');
  assert.equal(response.headers.get('Set-Cookie'), null);
  const reader = response.body.getReader();
  assert.deepEqual((await reader.read()).value, new Uint8Array([42]));
  await reader.cancel();
  assert.equal(cancelled, true);
  assert.equal(observed.options.signal.aborted, true);

  const invalid = await relayStream(new Request('https://website.example', { headers: { Range: 'bytes=0-1,4-5' } }), target);
  assert.equal(invalid.status, 400);
  globalThis.fetch = async () => new Response('denied', { status: 403 });
  assert.equal((await relayStream(request, target)).status, 502);
  globalThis.fetch = async () => new Response('whole file', { status: 200 });
  assert.equal((await relayStream(request, target)).status, 502);
  globalThis.fetch = async () => new Response(null, { status: 200, headers: { 'Content-Length': '100', 'Accept-Ranges': 'bytes' } });
  const head = await relayStream(new Request('https://website.example', { method: 'HEAD' }), target);
  assert.equal(head.body, null);
  assert.equal(head.headers.get('Content-Length'), '100');
  globalThis.fetch = async () => new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */100' } });
  const unsatisfied = await relayStream(request, target);
  assert.equal(unsatisfied.status, 416);
  assert.equal(unsatisfied.headers.get('Content-Range'), 'bytes */100');
  console.log('Streaming tests passed: CORS fallback, direct ranges, cancellation, HEAD, errors and header isolation.');
} finally { globalThis.fetch = realFetch; }
