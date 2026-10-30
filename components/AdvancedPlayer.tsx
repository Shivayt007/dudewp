"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Download, Gauge, LoaderCircle, MoreHorizontal, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import type { MoviElement } from "movi-player/element";
import type { Movie } from "@/lib/models";
import { createMovi, loadMovi, MOVI_ASSETS } from "@/lib/movi-loader";
import { choosePlaybackSource } from "@/lib/playback-source";

const clock = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${minutes}:${String(secs).padStart(2, "0")}`;
};

export default function AdvancedPlayer({ movie, initialIndex = 0 }: { movie: Movie; initialIndex?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const counted = useRef(new Set<number>());
  const [fileIndex, setFileIndex] = useState(initialIndex);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resumeAt, setResumeAt] = useState(0);
  const file = movie.files.find(item => item.index === fileIndex);

  useEffect(() => {
    try { setResumeAt(Math.max(0, Number(localStorage.getItem(`dude-progress:${movie.id}`)) || 0)); } catch { /* ignore */ }
  }, [movie.id]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setSheetOpen(false); setMenuOpen(false); } };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);

  useEffect(() => {
    const rotate = async () => {
      try {
        const orientation = screen.orientation as ScreenOrientation & { lock?: (mode: string) => Promise<void> };
        if (document.fullscreenElement) await orientation.lock?.("landscape");
        else orientation.unlock?.();
      } catch { /* Orientation lock is not available on every browser. */ }
    };
    document.addEventListener("fullscreenchange", rotate);
    return () => document.removeEventListener("fullscreenchange", rotate);
  }, []);

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
      setResumeAt(0);
      try { localStorage.removeItem(progressKey); } catch { /* Storage may be disabled. */ }
    };
    const onReady = () => setLoading(false);

    void (async () => {
      try {
        if (!file) throw new Error("There are no video files for this title.");
        const [, response] = await Promise.all([
          loadMovi(),
          fetch(`/api/media/${movie.id}/${fileIndex}?engine=movi`, { method: "POST", signal: controller.signal, cache: "no-store" }),
        ]);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Temporary link unavailable");
        if (typeof result.url !== "string" || !/^https?:\/\//i.test(result.url)) throw new Error("The server did not return a valid streaming link.");
        const playbackUrl = file.playableHint === "manifest" ? result.url : await choosePlaybackSource(result.url, `/api/stream/${movie.id}/${fileIndex}`, controller.signal);
        if (controller.signal.aborted) return;

        element = createMovi();
        element.className = "dude-movi-player";
        element.setAttribute("controls", "");
        element.setAttribute("playsinline", "");
        element.setAttribute("poster", movie.backdrop_url || movie.poster_url || "/images/hollywood-fallback.svg");
        element.setAttribute("posterfit", "cover");
        element.setAttribute("posterdelay", "0");
        element.setAttribute("autoplay", "");
        element.setAttribute("subtitlepicker", "");
        element.setAttribute("showtitle", "");
        element.setAttribute("title", movie.title);
        element.setAttribute("theme", "dark");
        element.setAttribute("themecolor", "#E8B04A");
        element.setAttribute("wasmurl", `${MOVI_ASSETS}/movi.wasm`);
        element.setAttribute("persist", "volume speed audiolang subtitlelang");
        element.setAttribute("persistkey", "dude-player");
        element.setAttribute("aria-label", `${movie.title} video player`);
        element.addEventListener("play", onPlay);
        element.addEventListener("timeupdate", onTime);
        element.addEventListener("loadedmetadata", onMetadata, { once: true });
        element.addEventListener("canplay", onReady, { once: true });
        element.addEventListener("ended", onEnded);
        container.appendChild(element);
        element.src = playbackUrl;
      } catch (cause) {
        if (controller.signal.aborted) return;
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
        element.removeEventListener("canplay", onReady);
        element.removeEventListener("ended", onEnded);
        try {
          if (element.currentTime > 2 && element.currentTime < element.duration - 10) localStorage.setItem(progressKey, String(element.currentTime));
        } catch { /* ignore */ }
        element.dispose();
        element.remove();
      }
    };
  }, [movie.id, movie.title, movie.backdrop_url, movie.poster_url, fileIndex, file, attempt]);

  const selectFile = (index: number) => { setFileIndex(index); setSheetOpen(false); setResumeAt(0); };

  return <div className="player-shell dude-player-shell" aria-label="Movie video player">
    <div className="dude-player-stage">
      {(loading || error) && <img className="stream-preview" src={movie.backdrop_url || movie.poster_url || "/images/hollywood-fallback.svg"} alt="" width={1536} height={864}/>}
      <div ref={host} className="dude-player-host"/>
      {loading && !error && <div className="stream-loading" role="status"><div className="stream-shimmer"/><LoaderCircle className="stream-ring" size={35}/><strong>Preparing secure stream</strong><span>{file?.quality} · {file?.language}</span></div>}
      {error && <div className="stream-error" role="alert"><AlertTriangle size={31}/><strong>We couldn’t start this stream</strong><span>{error}</span><button className="action action-primary" onClick={() => setAttempt(value => value + 1)}><RefreshCw size={17}/> Retry</button></div>}
      {resumeAt > 10 && loading && <span className="resume-toast">Resume from {clock(resumeAt)}</span>}
    </div>

    <div className="player-toolbar">
      <button type="button" className="current-stream" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
        <span><strong>{file?.quality || "Quality"}</strong><small>{file?.language} · {file?.codec} · {file?.file_size_readable}</small></span><SlidersHorizontal size={20}/>
      </button>
      <div className="player-toolbar-actions">
        <button type="button" onClick={() => setSheetOpen(true)} aria-label="Choose quality and audio"><Gauge size={19}/><span>Quality</span></button>
        <button type="button" onClick={() => setMenuOpen(value => !value)} aria-label="More player actions" aria-expanded={menuOpen}><MoreHorizontal size={21}/></button>
        {menuOpen && <div className="player-overflow"><button onClick={() => { setAttempt(value => value + 1); setMenuOpen(false); }}><RefreshCw size={17}/>Refresh secure link</button>{file && <a href={`/api/download/${movie.id}/${fileIndex}`} target="_blank" rel="noopener noreferrer"><Download size={17}/>Download this file</a>}</div>}
      </div>
    </div>

    {sheetOpen && <div className="sheet-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSheetOpen(false); }}>
      <section className="quality-sheet" role="dialog" aria-modal="true" aria-labelledby="quality-sheet-title">
        <div className="sheet-handle"/>
        <header><div><p>Playback options</p><h2 id="quality-sheet-title">Quality & audio</h2></div><button onClick={() => setSheetOpen(false)} aria-label="Close quality selector"><X size={21}/></button></header>
        <div className="sheet-options">{movie.files.map((item, index) => <button key={item.index} className={item.index === fileIndex ? "selected" : ""} onClick={() => selectFile(item.index)}>
          <span className="sheet-resolution">{item.quality}</span>
          <span className="sheet-copy"><strong>{item.language}</strong><small>{item.codec} · {item.file_size_readable}</small>{index === 0 && <em>Recommended for your connection</em>}</span>
          {item.index === fileIndex && <Check size={20}/>}
        </button>)}</div>
      </section>
    </div>}
  </div>;
}
