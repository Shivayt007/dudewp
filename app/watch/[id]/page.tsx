import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ListVideo } from "lucide-react";
import { findMovie } from "@/lib/movies";
import AdvancedPlayer from "@/components/AdvancedPlayer";
export const dynamic = "force-dynamic";
export default async function Watch({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ file?: string }> }) {
  const { id } = await params;
  const movie = await findMovie(id);
  if (!movie) notFound();
  const query = await searchParams;
  const file = query.file && /^\d+$/.test(query.file) ? Number(query.file) : 0;
  const initial = movie.files[file] ? file : 0;
  return <div className="watch-page shell"><div className="watch-header"><Link href={`/movie/${movie.id}`} className="backlink"><ArrowLeft size={16}/> Episode details</Link><span>Season 10 <span className="streaming-dot"/></span></div><AdvancedPlayer movie={movie} initialIndex={initial}/><section className="watch-info"><div><span className="section-eyebrow">Bigg Boss Tamil</span><h1>{movie.title}</h1><p>{movie.caption}</p><span className="tag-highlight">{movie.language}</span></div><div className="watch-info-links"><Link href={`/movie/${movie.id}#available-versions`} className="btn btn-outline"><ListVideo size={16}/> All qualities</Link></div></section></div>;
}
