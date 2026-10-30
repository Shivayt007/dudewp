"use client";

import Link from "next/link";
import { Bookmark, Check, Download, Play, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Movie } from "@/lib/models";

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${minutes}:${String(secs).padStart(2, "0")}`;
};

export default function MovieActions({ movie }: { movie: Movie }) {
  const [saved, setSaved] = useState(false);
  const [resume, setResume] = useState(0);
  const [shared, setShared] = useState(false);
  useEffect(() => {
    try {
      setResume(Math.max(0, Number(localStorage.getItem(`dude-progress:${movie.id}`)) || 0));
      setSaved(localStorage.getItem(`dude-list:${movie.id}`) === "1");
    } catch { /* Storage may be disabled. */ }
  }, [movie.id]);
  const toggleSaved = () => {
    const next = !saved;
    setSaved(next);
    try { next ? localStorage.setItem(`dude-list:${movie.id}`, "1") : localStorage.removeItem(`dude-list:${movie.id}`); } catch { /* ignore */ }
  };
  const share = async () => {
    const data = { title: movie.title, text: `Watch ${movie.title} on DUDE Hollywood`, url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else await navigator.clipboard.writeText(location.href);
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch { /* User cancelled sharing. */ }
  };
  const first = movie.files[0]?.index ?? 0;
  return <div className="movie-actions" aria-label="Movie actions">
    <Link href={`/watch/${movie.id}?file=${first}`} className="action action-primary"><Play size={19} fill="currentColor"/>{resume > 10 ? `Resume from ${formatTime(resume)}` : "Play movie"}</Link>
    <a href={`/api/download/${movie.id}/${first}`} target="_blank" rel="noopener noreferrer" className="action action-secondary"><Download size={19}/>Download</a>
    <button type="button" className="action action-secondary" onClick={toggleSaved} aria-pressed={saved}>{saved ? <Check size={19}/> : <Bookmark size={19}/>} {saved ? "In my list" : "Add to list"}</button>
    <button type="button" className="action action-secondary" onClick={share}>{shared ? <Check size={19}/> : <Share2 size={19}/>} {shared ? "Link copied" : "Share"}</button>
  </div>;
}
