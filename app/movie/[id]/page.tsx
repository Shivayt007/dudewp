import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, ArrowLeft } from "lucide-react";
import { findMovie } from "@/lib/movies";
export const dynamic = "force-dynamic";
export default async function MovieDetail({ params }: { params: Promise<{ id: string }> }) {
  const {id} = await params; const movie = await findMovie(id); if(!movie) notFound();
  return <section className="shell movie-detail"><Link href="/#movies" className="backlink"><ArrowLeft size={14}/> Back to movies</Link><div className="movie-detail-grid"><div className="movie-detail-art"><img src={movie.poster_url || "/images/hollywood-fallback.svg"} alt={`${movie.title} poster`}/></div><div className="movie-detail-copy"><p className="hero-label">THE HOLLYWOOD COLLECTION</p><h1>{movie.title}</h1><p>{movie.year} · {movie.genres.join(" / ") || movie.language}{movie.rating>0 ? ` · ★ ${movie.rating.toFixed(1)}` : ""}{movie.duration_seconds>0 ? ` · ${Math.round(movie.duration_seconds/60)} min` : ""}</p><p>{movie.description || "Choose a quality and enjoy the movie."}</p><div className="hero-actions"><Link href={`/watch/${movie.id}`} className="btn cinema-primary"><Play size={18} fill="currentColor"/> Watch now</Link><span>{movie.file_count} quality option{movie.file_count!==1 ? 's' : ''}</span></div><div className="quality-list" aria-label="Available video qualities">{movie.files.map(file=><Link key={file.index} href={`/watch/${movie.id}?file=${file.index}`}><span>{file.display_name}</span><span>{file.file_size_readable} · Watch →</span></Link>)}</div></div></div></section>;
}
