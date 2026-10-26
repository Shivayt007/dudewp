import Link from "next/link";
import { Eye, Play } from "lucide-react";
import Poster from "./Poster";
import { formatViews, type Movie } from "@/lib/models";

export default function MovieCard({ movie, rank }: { movie: Movie; rank?: number }) {
  return (
    <Link className="movie-card" href={`/watch/${movie.id}`} aria-label={`Watch ${movie.title}`}>
      <div className="movie-card-poster"><Poster id={movie.id} title={movie.title} hasPoster={movie.hasPoster} />{rank ? <span className="rank-badge">#{rank}</span> : null}<span className="card-play"><Play size={24} fill="currentColor" /></span></div>
      <div className="movie-card-info"><h3 title={movie.title}>{movie.title}</h3><div className="movie-card-meta"><span>{movie.language}</span><span className="meta-eyes"><Eye size={13}/>{formatViews(movie.views)}</span></div></div>
    </Link>
  );
}

