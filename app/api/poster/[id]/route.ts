import { getRawMovie } from "@/lib/movies";
import { thumbnailFileId } from "@/lib/episode-meta.mjs";
import type { Document } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The old MovieBot (ads/main14) writes poster_filename to its static poster
// directory. The new website can fetch via the same bot's file_id or, when
// POSTER_SOURCE_BASE_URL is configured, via that already-hosted static image.
const MAX_BYTES = 15 * 1024 * 1024;
type ImageResult = { bytes: Buffer; type: string; source: "telegram" | "legacy" };
type Attempt = { source: "telegram" | "legacy"; status: string; httpStatus?: number };
const jsonHeaders = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const token = () => (process.env.TELEGRAM_POSTER_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "").trim();
const staticBase = () => (process.env.POSTER_SOURCE_BASE_URL || "").trim();

function detectRaster(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes.length >= 6 && /^GIF8[79]a$/.test(bytes.toString("ascii", 0, 6))) return "image/gif";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp" && /^(avif|avis)$/.test(bytes.toString("ascii", 8, 12))) return "image/avif";
  return null;
}

async function readRaster(response: Response): Promise<{ bytes: Buffer; type: string } | null> {
  if (!response.ok || !response.body) return null;
  const len = Number(response.headers.get("content-length") || 0);
  if (len > MAX_BYTES) { await response.body.cancel(); return null; }
  const reader = response.body.getReader();
  const parts: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); return null; }
      parts.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = Buffer.concat(parts, size);
  const type = detectRaster(bytes);
  return type ? { bytes, type } : null;
}

async function fromTelegram(fileId: string, attempts: Attempt[]): Promise<ImageResult | null> {
  const botToken = token();
  if (!botToken) { attempts.push({ source: "telegram", status: "bot-token-missing" }); return null; }
  if (!fileId) { attempts.push({ source: "telegram", status: "poster-file-id-missing" }); return null; }
  try {
    const meta = await fetch(`https://api.telegram.org/bot${botToken}/getFile`, {
      method: "POST",
      body: new URLSearchParams({ file_id: fileId }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const result = await meta.json() as {
      ok?: boolean; description?: string; error_code?: number;
      result?: { file_path?: string; file_size?: number };
    };
    const path = result.result?.file_path || "";
    if (!meta.ok || !result.ok || !path) {
      attempts.push({ source: "telegram", status: meta.status === 401 || result.error_code === 401 ? "invalid-bot-token" : "getfile-rejected", httpStatus: result.error_code || meta.status });
      return null;
    }
    if (path.startsWith("/") || path.split("/").includes("..") || !/^[a-zA-Z0-9_./-]+$/.test(path)) {
      attempts.push({ source: "telegram", status: "unsafe-telegram-file-path" }); return null;
    }
    if ((result.result?.file_size || 0) > MAX_BYTES) {
      attempts.push({ source: "telegram", status: "telegram-file-too-large" }); return null;
    }
    const imageResponse = await fetch(`https://api.telegram.org/file/bot${botToken}/${path}`, {
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
    });
    if (!imageResponse.ok) {
      attempts.push({ source: "telegram", status: "telegram-download-failed", httpStatus: imageResponse.status }); return null;
    }
    const image = await readRaster(imageResponse);
    if (!image) { attempts.push({ source: "telegram", status: "invalid-or-large-image" }); return null; }
    attempts.push({ source: "telegram", status: "ok" });
    return { ...image, source: "telegram" };
  } catch (error) {
    console.warn("Poster Telegram retrieval failed:", error instanceof Error ? error.name : "network-error");
    attempts.push({ source: "telegram", status: "telegram-network-or-response-error" }); return null;
  }
}

function safePosterName(movie: Document): string | null {
  const name = typeof movie.poster_filename === "string" ? movie.poster_filename.trim() : "";
  if (!name || name.length > 200 || name === "." || name === ".." || /[/\\\u0000-\u001f]/.test(name)) return null;
  return name;
}

async function fromLegacy(movie: Document, attempts: Attempt[]): Promise<ImageResult | null> {
  const base = staticBase();
  if (!base) { attempts.push({ source: "legacy", status: "poster-source-not-configured" }); return null; }
  const name = safePosterName(movie);
  if (!name) { attempts.push({ source: "legacy", status: "poster-filename-missing-or-unsafe" }); return null; }
  try {
    const url = new URL(base.endsWith("/") ? base : base + "/");
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      attempts.push({ source: "legacy", status: "invalid-poster-source-base-url" }); return null;
    }
    const imageUrl = new URL(encodeURIComponent(name), url);
    const response = await fetch(imageUrl, {
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      attempts.push({ source: "legacy", status: "legacy-image-http-error", httpStatus: response.status }); return null;
    }
    const image = await readRaster(response);
    if (!image) { attempts.push({ source: "legacy", status: "legacy-invalid-or-large-image" }); return null; }
    attempts.push({ source: "legacy", status: "ok" });
    return { ...image, source: "legacy" };
  } catch (error) {
    console.warn("Poster static fallback failed:", error instanceof Error ? error.name : "network-error");
    attempts.push({ source: "legacy", status: "legacy-network-error" }); return null;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const diagnostic = new URL(request.url).searchParams.has("diagnose");
  const attempts: Attempt[] = [];
  try {
    const { id } = await params;
    const movie = await getRawMovie(id);
    if (!movie) {
      if (diagnostic) return Response.json({ status: "movie-not-found" }, { status: 404, headers: jsonHeaders });
      return new Response(null, { status: 404, headers: { "Cache-Control": "no-store", "X-Poster-Status": "movie-not-found" } });
    }
    if (typeof movie.poster_url === "string" && /^https:\/\/image\.tmdb\.org\/t\/p\//.test(movie.poster_url)) return Response.redirect(movie.poster_url, 302);
    const fileId = thumbnailFileId(movie);
    const image = await fromTelegram(fileId, attempts) || await fromLegacy(movie, attempts);
    if (diagnostic) {
      return Response.json({
        status: image ? "ok" : "unavailable",
        fetchedFrom: image?.source || null,
        hasFileId: Boolean(fileId),
        hasFilename: Boolean(safePosterName(movie)),
        botConfigured: Boolean(token()),
        staticFallbackConfigured: Boolean(staticBase()),
        attempts,
        guidance: image ? "Poster retrieval succeeds. Refresh the website after deploying this commit."
          : "If Telegram rejects this file ID, set POSTER_SOURCE_BASE_URL to your original MovieBot website /static/images/posters/ path, or regenerate poster_file_id using the configured bot.",
      }, { headers: jsonHeaders });
    }
    if (!image) return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store", "X-Poster-Status": attempts.map(x => x.status).join(",").slice(0, 180) },
    });
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": image.type,
        "Content-Length": String(image.bytes.length),
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "X-Poster-Status": "ok",
        "X-Poster-Source": image.source,
      },
    });
  } catch (error) {
    console.error("Poster route error:", error instanceof Error ? error.name : "unknown");
    if (diagnostic) return Response.json({ status: "server-error", attempts }, { status: 503, headers: jsonHeaders });
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store", "X-Poster-Status": "server-error" } });
  }
}
