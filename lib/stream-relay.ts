/** Forward bytes with backpressure; never buffer or convert the movie. */
export async function relayStream(request: Request, url: string): Promise<Response> {
  const range = request.headers.get("range");
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) {
    return new Response("Only a single byte range is supported", { status: 400 });
  }
  const abort = new AbortController();
  const onAbort = () => abort.abort();
  if (request.signal.aborted) abort.abort();
  request.signal.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(onAbort, 25000);
  const release = () => request.signal.removeEventListener("abort", onAbort);
  try {
    const headers = new Headers({ "Accept-Encoding": "identity" });
    if (range) headers.set("Range", range);
    // Some media hosts reject Node's default UA even for valid signed URLs.
    const ua = request.headers.get("user-agent");
    if (ua) headers.set("User-Agent", ua);
    const upstream = await fetch(url, {
      method: request.method, headers, signal: abort.signal,
      redirect: "manual", cache: "no-store",
    });
    clearTimeout(timeout);
    if (![200, 206, 416].includes(upstream.status)) {
      await upstream.body?.cancel();
      release();
      return new Response(`Stream server returned HTTP ${upstream.status}. Refresh the link and retry.`, {
        status: 502, headers: { "Cache-Control": "no-store" },
      });
    }
    // A wrong range response can silently corrupt seeking; surface it instead.
    if (range && upstream.status === 200) {
      await upstream.body?.cancel();
      release();
      return new Response("Stream server ignored the byte range", { status: 502 });
    }
    const responseHeaders = new Headers({
      "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff",
    });
    for (const name of ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    if (request.method === "HEAD" || !upstream.body) {
      await upstream.body?.cancel();
      release();
      return new Response(null, { status: upstream.status, headers: responseHeaders });
    }
    const reader = upstream.body.getReader();
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) { release(); controller.close(); }
          else controller.enqueue(value);
        } catch (error) { release(); controller.error(error); }
      },
      async cancel(reason) {
        abort.abort();
        release();
        await reader.cancel(reason).catch(() => {});
      },
    });
    return new Response(body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    release();
    throw error;
  } finally { clearTimeout(timeout); }
}
