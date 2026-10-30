import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { findMovie } from "@/lib/movies";
import AdvancedPlayer from "@/components/AdvancedPlayer";
export const dynamic = "force-dynamic";
export default async function Watch({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ file?: string }> }) {
  const {id} = await params; const movie = await findMovie(id); if(!movie)notFound();
  const query = await searchParams; const file = query.file && /^\d+$/.test(query.file) ? Number(query.file) : 0;
  return <div className="shell watch-page"><div className="watch-header"><Link href={`/movie/${id}`} className="backlink"><ArrowLeft size={15}/> Movie details</Link><span>DUDE Hollywood</span></div><AdvancedPlayer movie={movie} initialIndex={movie.files[file] ? file : 0}/><section className="watch-info"><h1>{movie.title} ({movie.year})</h1><p>{movie.language} · {movie.genres.join(' / ')}</p><p>{movie.description}</p></section></div>;
}
