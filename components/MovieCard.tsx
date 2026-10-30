import Link from "next/link";
import { Play } from "lucide-react";
import Poster from "./Poster";
import type { Movie } from "@/lib/models";
export default function MovieCard({ movie }: { movie: Movie; rank?: number }) {
  return <article className="film-card"><Link href={`/movie/${movie.id}`} aria-label={`View ${movie.title}`} className="film-art"><Poster id={movie.id} title={movie.title} image={movie.poster_url}/><span className="film-play"><Play size={22} fill="currentColor"/></span><span className="film-quality">{movie.files[0]?.quality || "HD"}</span></Link><div className="film-title"><Link href={`/movie/${movie.id}`}>{movie.title}</Link>{movie.rating > 0 && <span aria-label={`TMDB rating ${movie.rating.toFixed(1)}`}>★ {movie.rating.toFixed(1)}</span>}</div><p>{movie.year || ""}<span> · </span>{movie.genres[0] || movie.language}</p></article>;
}
