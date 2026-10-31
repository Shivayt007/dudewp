import Link from "next/link";
import { Play } from "lucide-react";
import Poster from "./Poster";
import type { Movie } from "@/lib/models";

export default function MovieCard({ movie }: { movie: Movie; rank?: number }) {
  const target = "/watch/" + movie.id;
  return <article className="film-card">
    <Link href={target} aria-label={"Play " + movie.title} className="film-art">
      <Poster id={movie.id} title={movie.title} image={movie.poster_url}/>
      <span className="film-play" aria-hidden="true"><Play size={24} fill="currentColor"/></span>
      <span className="film-quality">{movie.files[0]?.quality || "HD"}</span>
    </Link>
    <div className="film-title"><Link href={target}>{movie.title}</Link></div>
    <p>{[movie.year || null, movie.language && movie.language !== "Unknown" ? movie.language.replaceAll("+", " · ") : null].filter(Boolean).join(" · ")}</p>
  </article>;
}
