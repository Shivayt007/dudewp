/** Browser fetch requires CORS even when navigating to Download works. */
export async function choosePlaybackSource(url: string, relay: string, signal: AbortSignal): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: { Range: "bytes=0-0" }, signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]), cache: "no-store",
    });
    await response.body?.cancel();
    if (response.status === 206 && /^bytes 0-0\/\d+$/.test(response.headers.get("Content-Range") || "")) return url;
  } catch (error) {
    if (signal.aborted) throw error;
  }
  return relay;
}
