"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Minimize,
  PictureInPicture2, Settings2, Captions, Download, AlertTriangle, LoaderCircle, RefreshCw,
  ChevronDown, RotateCcw, Film, Check, Gauge, ListVideo,
} from "lucide-react";
import type { Movie } from "@/lib/models";

type ShakaTrack = { id: number; height?: number; language?: string; active?: boolean; bandwidth?: number };
type ShakaInstance = {
  attach: (video: HTMLVideoElement) => Promise<void>;
  load: (uri: string, startTime?: number, mimeType?: string) => Promise<void>;
  destroy: () => Promise<void>;
  configure: (config: unknown) => void;
  getVariantTracks: () => ShakaTrack[];
  selectVariantTrack: (track: ShakaTrack, clearBuffer?: boolean) => void;
};

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
function clock(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const time = Math.floor(value);
  const hh = Math.floor(time / 3600);
  const mm = Math.floor((time % 3600) / 60);
  const ss = time % 60;
  return hh ? `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${mm}:${String(ss).padStart(2, "0")}`;
}

export default function AdvancedPlayer({ movie, initialIndex = 0 }: { movie: Movie; initialIndex?: number }) {
  const video = useRef<HTMLVideoElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const shaka = useRef<ShakaInstance | null>(null);
  const sourceFetch = useRef<AbortController | null>(null);
  const counted = useRef(new Set<number>());
  const lastProgressSave = useRef(-1);
  const externalTrack = useRef<HTMLTrackElement | null>(null);
  const subtitleObjectUrl = useRef<string | null>(null);
  const [fileIndex, setFileIndex] = useState(initialIndex);
  const file = movie.files[fileIndex];
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [panel, setPanel] = useState<"none" | "settings" | "versions" | "captions">("none");
  const [tracks, setTracks] = useState<ShakaTrack[]>([]);
  const [quality, setQuality] = useState<number | "auto">("auto");
  const [captions, setCaptions] = useState(false);
  const [loadCount, setLoadCount] = useState(0);
  const [gesture, setGesture] = useState("");

  const refresh = useCallback(() => setLoadCount(x => x + 1), []);
  const seek = useCallback((delta: number) => {
    const el = video.current;
    if (!el || !Number.isFinite(el.duration)) return;
    el.currentTime = Math.min(el.duration, Math.max(0, el.currentTime + delta));
    setGesture(delta < 0 ? "−10s" : "+10s");
  }, []);
  const togglePlay = useCallback(() => {
    const el = video.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setError("Unable to play this source in your browser. Check the file format and server response."));
    else el.pause();
  }, []);
  const onPlay = useCallback(() => {
    setPlaying(true);
    setBuffering(false);
    if (!counted.current.has(fileIndex)) {
      counted.current.add(fileIndex);
      void fetch(`/api/views/${movie.id}`, { method: "POST", keepalive: true }).catch(() => {});
    }
  }, [fileIndex, movie.id]);

  useEffect(() => {
    sourceFetch.current?.abort();
    shaka.current?.destroy().catch(() => {});
    shaka.current = null;
    if (externalTrack.current) { externalTrack.current.remove(); externalTrack.current = null; }
    if (subtitleObjectUrl.current) { URL.revokeObjectURL(subtitleObjectUrl.current); subtitleObjectUrl.current = null; }
    const controller = new AbortController();
    sourceFetch.current = controller;
    setSource(""); setLoading(true); setError(""); setElapsed(0); setDuration(0); setPlaying(false);
    setPanel("none"); setQuality("auto"); setTracks([]); setCaptions(false);
    if (!file) { setError("There are no video files for this title."); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`/api/media/${movie.id}/${fileIndex}`, { method: "POST", signal: controller.signal, cache: "no-store" });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Temporary link unavailable");
        if (!controller.signal.aborted) setSource(result.url);
      } catch (err) {
        if (!controller.signal.aborted) { setError(err instanceof Error ? err.message : "Unable to obtain video link"); setLoading(false); }
      }
    })();
    return () => controller.abort();
  }, [movie.id, fileIndex, file, loadCount]);

  useEffect(() => {
    if (!source || !video.current || !file) return;
    const element = video.current;
    let disposed = false;
    let instance: ShakaInstance | null = null;
    const load = async () => {
      if (file.playableHint === "manifest") {
        try {
          const module = await import("shaka-player/dist/shaka-player.compiled.js");
          if (disposed) return;
          const imported = module as unknown as { default?: { Player: new () => ShakaInstance }; Player?: new () => ShakaInstance };
          const Player = imported.default?.Player ?? imported.Player;
          if (!Player) throw new Error("Shaka Player unavailable");
          const player: ShakaInstance = new Player();
          instance = player;
          shaka.current = player;
          await player.attach(element);
          const declaredFormat = `${file.file_name} ${file.mime_type}`;
          const manifestType = /\.mpd|dash\+xml/i.test(declaredFormat) ? "application/dash+xml" : "application/x-mpegurl";
          await player.load(source, undefined, manifestType);
          if (disposed) return;
          setTracks(player.getVariantTracks());
          setLoading(false);
          await element.play().catch(() => {});
        } catch {
          if (!disposed) { setError("Could not load this HLS/DASH stream. The source must support CORS and valid media segments."); setLoading(false); }
        }
      } else {
        element.src = source;
        element.load();
        // Native MP4/WebM; raw MKV compatibility depends on the user's browser.
        void element.play().catch(() => {});
      }
    };
    void load();
    return () => {
      disposed = true;
      element.pause(); element.removeAttribute("src"); element.load();
      if (instance) { void instance.destroy().catch(() => {}); if (shaka.current === instance) shaka.current = null; }
    };
  }, [source, file]);

  useEffect(() => {
    const onFullScreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullScreen);
    return () => document.removeEventListener("fullscreenchange", onFullScreen);
  }, []);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    try {
      const position = localStorage.getItem(`dude-progress:${movie.id}:${fileIndex}`);
      if (position && Number(position) > 0) {
        const resume = () => { if (Number(position) < el.duration - 10) el.currentTime = Number(position); };
        el.addEventListener("loadedmetadata", resume, { once: true });
        return () => el.removeEventListener("loadedmetadata", resume);
      }
    } catch { /* Storage may be disabled */ }
  }, [fileIndex, movie.id, source]);

  const onTimeUpdate = () => {
    const el = video.current;
    if (!el) return;
    setElapsed(el.currentTime);
    const second = Math.floor(el.currentTime);
    if (second > 2 && second % 5 === 0 && second !== lastProgressSave.current) {
      lastProgressSave.current = second;
      try { localStorage.setItem(`dude-progress:${movie.id}:${fileIndex}`, String(el.currentTime)); } catch { /* Storage may be disabled */ }
    }
  };

  useEffect(() => {
    if (!gesture) return;
    const timeout = setTimeout(() => setGesture(""), 600);
    return () => clearTimeout(timeout);
  }, [gesture]);

  const onKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const tag = (event.target as HTMLElement).tagName;
    if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(tag)) return;
    if (event.code === "Space" || event.key.toLowerCase() === "k") { event.preventDefault(); togglePlay(); }
    if (event.key === "ArrowRight") { event.preventDefault(); seek(10); }
    if (event.key === "ArrowLeft") { event.preventDefault(); seek(-10); }
    if (event.key.toLowerCase() === "f") void toggleFullscreen();
    if (event.key.toLowerCase() === "m") toggleMute();
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (wrapper.current?.requestFullscreen) await wrapper.current.requestFullscreen();
    } catch { setError("Fullscreen is not supported in this browser."); }
  };
  const togglePip = async () => {
    const el = video.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await el.requestPictureInPicture();
    } catch { setError("Picture-in-Picture is not available for this video."); }
  };
  const toggleMute = () => {
    const el = video.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };
  const changeRate = (value: number) => {
    if (!video.current) return;
    video.current.playbackRate = value;
    setRate(value);
  };
  const changeQuality = (value: number | "auto") => {
    const player = shaka.current;
    if (!player) return;
    if (value === "auto") { player.configure({ abr: { enabled: true } }); setQuality("auto"); return; }
    const track = player.getVariantTracks().find(x => x.id === value);
    if (!track) return;
    player.configure({ abr: { enabled: false } });
    player.selectVariantTrack(track, true);
    setQuality(value);
  };
  const uploadSubtitle = async (picked: File | undefined) => {
    const element = video.current;
    if (!picked || !element) return;
    const text = await picked.text();
    const vtt = picked.name.toLowerCase().endsWith(".srt")
      ? "WEBVTT\n\n" + text.replace(/^\uFEFF/, "").replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, "$1.$2").replace(/^\d+\s*\r?\n(?=\d\d:)/gm, "")
      : text;
    if (externalTrack.current) externalTrack.current.remove();
    if (subtitleObjectUrl.current) URL.revokeObjectURL(subtitleObjectUrl.current);
    const url = URL.createObjectURL(new Blob([vtt], { type: "text/vtt" }));
    subtitleObjectUrl.current = url;
    const elementTrack = document.createElement("track");
    elementTrack.src = url; elementTrack.kind = "subtitles"; elementTrack.srclang = "en"; elementTrack.label = picked.name; elementTrack.default = true;
    element.appendChild(elementTrack);
    externalTrack.current = elementTrack;
    elementTrack.addEventListener("load", () => { for (const track of Array.from(element.textTracks)) track.mode = track === elementTrack.track ? "showing" : "disabled"; setCaptions(true); }, { once: true });
  };
  const toggleCaptions = () => {
    const el = video.current;
    if (!el) return;
    const next = !captions;
    for (const track of Array.from(el.textTracks)) track.mode = next ? "showing" : "disabled";
    setCaptions(next);
  };

  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;
  return <div className="player-shell" ref={wrapper} tabIndex={0} onKeyDown={onKeys} aria-label="Movie video player">
    <div className="player-stage">
      <video ref={video} className="video-element" playsInline preload="metadata" onClick={togglePlay}
        onDoubleClick={e => { const rect = e.currentTarget.getBoundingClientRect(); seek(e.clientX < rect.left + rect.width / 2 ? -10 : 10); }}
        onPlay={onPlay} onPause={() => setPlaying(false)} onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={() => { setDuration(Number.isFinite(video.current?.duration) ? Number(video.current?.duration) : 0); setLoading(false); }}
        onDurationChange={() => setDuration(Number.isFinite(video.current?.duration) ? Number(video.current?.duration) : 0)}
        onWaiting={() => setBuffering(true)} onPlaying={() => setBuffering(false)}
        onError={() => { if (!loading || source) { setError("This file could not be decoded or loaded. MKV files and unsupported codecs may require downloading or browser-compatible MP4/HLS encoding."); setLoading(false); } }}
        onEnded={() => { setPlaying(false); try { localStorage.removeItem(`dude-progress:${movie.id}:${fileIndex}`); } catch {} }} />
      {!source && !error ? <div className="player-overlay"><LoaderCircle className="spin" size={28}/><span>Generating a secure streaming link...</span></div> : null}
      {source && (loading || buffering) && !error ? <div className="player-loading"><LoaderCircle className="spin" size={33}/></div> : null}
      {source && !playing && !error && !loading ? <button className="big-play" onClick={togglePlay} aria-label="Play video"><Play size={31} fill="currentColor"/></button> : null}
      {gesture ? <div className="gesture-indicator">{gesture}</div> : null}
      {error ? <div className="player-error"><AlertTriangle size={30}/><strong>Playback unavailable</strong><span>{error}</span><div className="error-actions"><button className="btn btn-primary" onClick={refresh}><RefreshCw size={16}/> Retry link</button>{file ? <a className="btn btn-outline" href={`/api/download/${movie.id}/${file.index}`} target="_blank" rel="noopener noreferrer"><Download size={16}/> Download file</a> : null}</div></div> : null}
      <div className="player-gradient"/>
      <div className="player-topbar"><span className="player-logo"><Film size={16}/> DUDE PLAYER</span><span className="player-resolution">{file?.display_name || "Video"}</span></div>
      <div className="player-controls">
        <input aria-label="Seek video" className="video-seek" type="range" min={0} max={duration > 0 ? duration : 100} step={0.1} value={Math.min(elapsed, duration || 100)} disabled={!source || duration <= 0} style={{ "--played": `${progress}%` } as CSSProperties} onChange={e => { if (video.current) video.current.currentTime = Number(e.target.value); }} />
        <div className="player-control-row"><div className="player-control-group"><button aria-label="Skip back 10 seconds" onClick={() => seek(-10)}><SkipBack size={20}/></button><button aria-label={playing ? "Pause" : "Play"} onClick={togglePlay}>{playing ? <Pause size={22} fill="currentColor"/> : <Play size={22} fill="currentColor"/>}</button><button aria-label="Skip forward 10 seconds" onClick={() => seek(10)}><SkipForward size={20}/></button><span className="time-label">{clock(elapsed)} <span>/ {clock(duration)}</span></span></div>
        <div className="player-control-group player-right-controls"><button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>{muted || volume === 0 ? <VolumeX size={20}/> : <Volume2 size={20}/>}</button><input className="volume-slider" type="range" aria-label="Volume" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={e => { const v = Number(e.target.value); if (video.current) { video.current.volume = v; video.current.muted = false; } setVolume(v); setMuted(false); }}/><button title="External subtitles" aria-label="Subtitles" onClick={() => setPanel(panel === "captions" ? "none" : "captions")}><Captions size={21}/></button><button title="Versions" aria-label="Choose version" onClick={() => setPanel(panel === "versions" ? "none" : "versions")}><ListVideo size={20}/></button><button title="Speed and quality" aria-label="Settings" onClick={() => setPanel(panel === "settings" ? "none" : "settings")}><Settings2 size={20}/></button><button title="Picture in Picture" onClick={() => void togglePip()} className="optional-control"><PictureInPicture2 size={20}/></button><button title="Fullscreen" aria-label="Fullscreen" onClick={() => void toggleFullscreen()}>{fullscreen ? <Minimize size={20}/> : <Maximize size={20}/>}</button></div></div>
      </div>
      {panel !== "none" ? <div className="player-panel"><div className="panel-heading"><strong>{panel === "settings" ? "Playback settings" : panel === "captions" ? "Subtitles" : "Video versions"}</strong><button onClick={() => setPanel("none")} aria-label="Close menu"><ChevronDown size={19}/></button></div>
        {panel === "versions" && <div className="panel-options">{movie.files.map(item => <button key={item.index} className={fileIndex === item.index ? "option-active" : ""} onClick={() => { setFileIndex(item.index); setPanel("none"); }}>{item.display_name}<small>{item.file_size_readable}</small>{fileIndex === item.index && <Check size={15}/>}</button>)}</div>}
        {panel === "settings" && <div className="panel-options"><div className="panel-subheading"><Gauge size={15}/> Playback speed</div><div className="speed-grid">{RATES.map(x => <button key={x} className={rate === x ? "selected-speed" : ""} onClick={() => changeRate(x)}>{x}×</button>)}</div>{tracks.length ? <><div className="panel-subheading">Quality</div><button onClick={() => changeQuality("auto")} className={quality === "auto" ? "option-active" : ""}>Auto {quality === "auto" ? "✓" : ""}</button>{tracks.filter(t => t.height).filter((v, i, a) => a.findIndex(t => t.height === v.height) === i).sort((a, b) => (b.height || 0) - (a.height || 0)).map(t => <button key={t.id} className={quality === t.id ? "option-active" : ""} onClick={() => changeQuality(t.id)}>{t.height}p {quality === t.id ? "✓" : ""}</button>)}</> : <div className="panel-note">Adaptive quality options appear for supported HLS/DASH streams.</div>}</div>}
        {panel === "captions" && <div className="panel-options"><button onClick={toggleCaptions}>{captions ? "Turn subtitles off" : "Enable available subtitles"}</button><label className="upload-subtitle">Load .srt / .vtt file<input type="file" accept=".srt,.vtt,text/vtt" onChange={e => void uploadSubtitle(e.target.files?.[0])}/></label><div className="panel-note">Choose a subtitle file stored on your device. Embedded subtitle tracks depend on browser support.</div></div>}
      </div> : null}
    </div>
    <div className="player-bottom-meta"><span className="player-source-caption">Secure link created per playback · Stored files are never modified</span><div><button onClick={refresh} className="inline-action"><RotateCcw size={14}/> Refresh link</button>{file && <a className="inline-action" href={`/api/download/${movie.id}/${fileIndex}`} target="_blank" rel="noopener noreferrer"><Download size={14}/> Download version</a>}</div></div>
  </div>;
}
