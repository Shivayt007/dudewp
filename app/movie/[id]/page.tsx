import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Play, Download, Eye, Layers, CalendarClock, HardDrive, Clapperboard } from "lucide-react";
import { findMovie, findMovies } from "@/lib/movies";
import { formatViews } from "@/lib/models";
import Poster from "@/components/Poster";
import MovieCard from "@/components/MovieCard";
export const dynamic = "force-dynamic";
export default async function MovieDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movie = await findMovie(id).catch(() => null);
  if (!movie) notFound();
  const related = await findMovies({ language: movie.language, limit: 8 }).catch(() => ({ movies: [] }));
  const date = movie.uploaded_at && !Number.isNaN(Date.parse(movie.uploaded_at)) ? new Date(movie.uploaded_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "Date not specified";
  return <div className="movie-detail shell"><Link href="/" className="backlink"><ArrowLeft size={16}/>Back to Discover</Link>
    <section className="detail-top"><div className="detail-poster"><Poster id={movie.id} title={movie.title} hasPoster={movie.hasPoster} large/></div><div className="detail-copy"><span className="section-eyebrow"><Clapperboard size={15}/> DUDE ORIGINAL EXPERIENCE</span><h1>{movie.title}</h1><div className="detail-tags"><span className="tag-highlight">{movie.language}</span><span><Eye size={15}/>{formatViews(movie.views)} views</span><span><Layers size={15}/>{movie.files.length} files</span></div><p className="detail-description">{movie.description || "No description has been added for this movie yet."}</p><div className="detail-actions"><Link className="btn btn-primary" href={`/watch/${movie.id}`}><Play size={17} fill="currentColor"/> Start Watching</Link><a className="btn btn-outline" href="#available-versions"><Download size={17}/> Download Options</a></div><div className="info-line"><CalendarClock size={16}/><span>Added {date}</span></div></div></section>
    <section className="file-section" id="available-versions"><div className="section-titlebar"><div><div className="section-eyebrow">PICK YOUR EXPERIENCE</div><h2>Available versions<span className="heading-dot">.</span></h2></div><span className="subtle-count">{movie.files.length} options</span></div>
      {movie.files.length ? <div className="version-list">{movie.files.map(file => <div className="version-row" key={file.index}><div className="version-icon"><HardDrive size={21}/></div><div className="version-info"><strong>{file.display_name}</strong><span>{file.file_size_readable} · {file.mime_type || "Video file"}</span></div><div className="version-actions"><Link href={`/watch/${movie.id}?file=${file.index}`} className="btn btn-small-primary"><Play size={15}/> Watch</Link><a href={`/api/download/${movie.id}/${file.index}`} target="_blank" rel="noopener noreferrer" className="btn btn-small-outline"><Download size={15}/> Download</a></div></div>)}</div> : <div className="empty-search">No video files are associated with this movie.</div>}
      <p className="version-disclaimer">MKV, unsupported codecs, and some Telegram source responses may not play in every browser. Download is still available when the source supports it.</p>
    </section>
    {related.movies.filter(m => m.id !== movie.id).length ? <section className="related-section"><div className="section-titlebar"><div><div className="section-eyebrow">MORE TO DISCOVER</div><h2>More in {movie.language}<span className="heading-dot">.</span></h2></div><Link href={`/?language=${encodeURIComponent(movie.language)}`} className="text-link">View all <ArrowRight size={15}/></Link></div><div className="movie-grid">{related.movies.filter(m => m.id !== movie.id).slice(0, 6).map(m => <MovieCard key={m.id} movie={m}/>)}</div></section> : null}
  </div>;
}
