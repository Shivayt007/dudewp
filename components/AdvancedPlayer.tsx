"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, LoaderCircle, RefreshCw } from "lucide-react";
import type { MoviElement } from "movi-player/element";
import type { Movie } from "@/lib/models";
import { createMovi, loadMovi, MOVI_ASSETS } from "@/lib/movi-loader";
import { choosePlaybackSource } from "@/lib/playback-source";

export default function AdvancedPlayer({ movie, initialIndex = 0 }: { movie: Movie; initialIndex?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const counted = useRef(new Set<number>());
  const [fileIndex, setFileIndex] = useState(initialIndex);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const file = movie.files.find(item => item.index === fileIndex);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    const controller = new AbortController();
    let element: MoviElement | undefined;
    let lastSaved = -1;
    const progressKey = `dude-progress:${movie.id}`;
    setLoading(true);
    setError("");

    const onPlay = () => {
      if (!counted.current.has(fileIndex)) {
        counted.current.add(fileIndex);
        void fetch(`/api/views/${movie.id}`, { method: "POST", keepalive: true }).catch(() => {});
      }
    };
    const onTime = () => {
      if (!element) return;
      const second = Math.floor(element.currentTime);
      if (second > 2 && second % 5 === 0 && second !== lastSaved) {
        lastSaved = second;
        try { localStorage.setItem(progressKey, String(element.currentTime)); } catch { /* Storage may be disabled. */ }
      }
    };
    const onMetadata = () => {
      if (!element) return;
      try {
        const saved = Number(localStorage.getItem(progressKey));
        if (Number.isFinite(saved) && saved > 0 && saved < element.duration - 10) element.currentTime = saved;
      } catch { /* Storage may be disabled. */ }
    };
    const onEnded = () => {
      try { localStorage.removeItem(progressKey); } catch { /* Storage may be disabled. */ }
    };

    void (async () => {
      try {
        if (!file) throw new Error("There are no video files for this title.");
        const [, response] = await Promise.all([
          loadMovi(),
          fetch(`/api/media/${movie.id}/${fileIndex}?engine=movi`, {
            method: "POST", signal: controller.signal, cache: "no-store",
          }),
        ]);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Temporary link unavailable");
        if (typeof result.url !== "string" || !/^https?:\/\//i.test(result.url)) throw new Error("The server did not return a valid streaming link.");
        const playbackUrl = file.playableHint === "manifest" ? result.url : await choosePlaybackSource(
          result.url, `/api/stream/${movie.id}/${fileIndex}`, controller.signal,
        );
        if (controller.signal.aborted) return;

        element = createMovi();
        element.className = "dude-movi-player";
        element.setAttribute("controls", "");
        element.setAttribute("playsinline", "");
        element.setAttribute("poster", movie.backdrop_url || movie.poster_url || "/images/hollywood-fallback.svg");
        element.setAttribute("posterfit", "contain");
        element.setAttribute("posterdelay", "0");
        element.setAttribute("autoplay", "");
        element.setAttribute("subtitlepicker", "");
        element.setAttribute("showtitle", "");
        element.setAttribute("title", movie.title);
        element.setAttribute("theme", "dark");
        element.setAttribute("themecolor", "#c6ff3d");
        element.setAttribute("wasmurl", `${MOVI_ASSETS}/movi.wasm`);
        element.setAttribute("persist", "volume speed audiolang subtitlelang");
        element.setAttribute("persistkey", "dude-player");
        element.setAttribute("aria-label", `${movie.title} video player`);
        element.addEventListener("play", onPlay);
        element.addEventListener("timeupdate", onTime);
        element.addEventListener("loadedmetadata", onMetadata, { once: true });
        element.addEventListener("ended", onEnded);
        // Configure the WASM URL before connection. Source is assigned last so
        // metadata events cannot race the resume and view-count listeners.
        container.appendChild(element);
        element.src = playbackUrl;
        setLoading(false);
      } catch (cause) {
        if (controller.signal.aborted) return;
        controller.abort();
        if (!container.isConnected) return;
        setError(cause instanceof Error ? cause.message : "Unable to load this video.");
        setLoading(false);
      }
    })();

    return () => {
      controller.abort();
      if (element) {
        element.removeEventListener("play", onPlay);
        element.removeEventListener("timeupdate", onTime);
        element.removeEventListener("loadedmetadata", onMetadata);
        element.removeEventListener("ended", onEnded);
        // dispose aborts source reads; disconnect also releases player-wide listeners.
        try {
          if (element.currentTime > 2 && element.currentTime < element.duration - 10) localStorage.setItem(progressKey, String(element.currentTime));
        } catch { /* Storage may be disabled. */ }
        element.dispose();
        element.remove();
      }
    };
  }, [movie.id, movie.title, fileIndex, file, attempt]);

  return <div className="player-shell dude-player-shell" aria-label="Movie video player">
    <div className="dude-player-stage">
      {loading && <img className="bb-player-preview" src={movie.backdrop_url || movie.poster_url || "/images/hollywood-fallback.svg"} alt="Movie video preview" width={1536} height={864}/>}
      <div ref={host} className="dude-player-host" />
      {loading && !error ? <div className="player-overlay" role="status"><LoaderCircle className="spin" size={28}/><span>Loading player and secure streaming link…</span></div> : null}
      {error ? <div className="player-error" role="alert"><AlertTriangle size={30}/><strong>Playback unavailable</strong><span>{error}</span><div className="error-actions"><button className="btn btn-primary" onClick={() => setAttempt(value => value + 1)}><RefreshCw size={16}/> Retry</button>{file && <a className="btn btn-outline" href={`/api/download/${movie.id}/${fileIndex}`} target="_blank" rel="noopener noreferrer"><Download size={16}/> Download file</a>}</div></div> : null}
    </div>
    <div className="dude-player-toolbar">
      <label className="dude-version-picker">Video quality
        <select value={fileIndex} onChange={event => setFileIndex(Number(event.target.value))} disabled={!movie.files.length}>
          {movie.files.map(item => <option key={item.index} value={item.index}>{item.display_name}{item.file_size_readable ? ` · ${item.file_size_readable}` : ""}</option>)}
        </select>
      </label>
      <div className="dude-player-actions">
        {file && <a className="dude-download-button" href={`/api/download/${movie.id}/${fileIndex}`} target="_blank" rel="noopener noreferrer"><Download size={19} aria-hidden="true"/> Download</a>}
        <button type="button" className="dude-refresh-button" onClick={() => setAttempt(value => value + 1)}><RefreshCw size={17} aria-hidden="true"/> Refresh link</button>
      </div>
    </div>
  </div>;
}
