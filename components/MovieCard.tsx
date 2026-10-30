import Link from "next/link";
import { Play, Star } from "lucide-react";
import Poster from "./Poster";
import type { Movie } from "@/lib/models";

export default function MovieCard({ movie, rank }: { movie: Movie; rank?: number }) {
  const target = "/watch/" + movie.id;
  return <article className={"film-card" + (rank ? " ranked-card" : "")}>
    {rank && <span className="home-rank" aria-hidden="true">{rank}</span>}
    <Link href={target} aria-label={"Play " + movie.title} className="film-art">
      <Poster id={movie.id} title={movie.title} image={movie.poster_url}/>
      <span className="film-play"><Play size={22} fill="currentColor"/></span>
      <span className="film-quality">{movie.files[0]?.quality || "HD"}</span>
    </Link>
    <div className="film-title"><Link href={target}>{movie.title}</Link>{movie.rating > 0 && <span><Star size={11} fill="currentColor"/> {movie.rating.toFixed(1)}</span>}</div>
    <p>{movie.year || ""} · {movie.genres[0] || movie.language}</p>
  </article>;
}
