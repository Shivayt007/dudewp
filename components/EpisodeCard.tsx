import Link from "next/link";
import { Play } from "lucide-react";
import type { Movie } from "@/lib/models";
import Poster from "./Poster";
export function duration(seconds: number) {
  if (!seconds) return '';
  const s = Math.floor(seconds);
  return s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export default function EpisodeCard({ episode }: { episode: Movie }) {
  const qualities = [...new Set(episode.files.map(f => f.quality))];
  return <article className="episode-card"><Link className="episode-art" href={`/movie/${episode.id}`} aria-label={`${episode.title}, choose quality`}><Poster id={episode.id} title={episode.title} hasPoster={episode.hasPoster}/><span className="episode-play"><Play size={19} fill="currentColor"/></span>{episode.duration_seconds > 0 && <span className="episode-duration">{duration(episode.duration_seconds)}</span>}</Link><Link className="episode-title" href={`/movie/${episode.id}`}>{episode.title}</Link><p className="episode-meta">{episode.language}{qualities.length ? ` · ${qualities.join(' / ')}` : ' · Coming soon'}</p></article>;
}
