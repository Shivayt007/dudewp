import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Play, Download } from "lucide-react";
import { findMovie } from "@/lib/movies";
import Poster from "@/components/Poster";
import { duration } from "@/components/EpisodeCard";
export const dynamic = 'force-dynamic';
export default async function EpisodeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const episode = await findMovie(id);
  if (!episode) notFound();
  return <div className="shell bb-detail"><Link href="/#episodes" className="backlink"><ArrowLeft size={17}/> Back to episodes</Link><section className="bb-detail-top"><div className="bb-detail-art"><Poster id={episode.id} title={episode.title} hasPoster={episode.hasPoster} large/></div><div className="bb-detail-copy"><p className="bb-season">Bigg Boss Tamil · Season 10</p><h1>{episode.title}</h1><p className="episode-meta">{episode.language} · {episode.kind === 'episode' ? 'Full episode' : episode.kind === 'promo' ? 'Promo' : 'Highlight'}{episode.duration_seconds ? ` · ${duration(episode.duration_seconds)}` : ''}</p>{episode.caption && <p className="bb-caption">{episode.caption}</p>}{episode.files.length > 0 && <a className="btn btn-primary" href="#available-versions">Choose video quality</a>}</div></section><section id="available-versions" className="bb-qualities"><div className="bb-section-heading"><h2>Choose quality</h2><span>{episode.files.length} options</span></div>{episode.files.length ? <div className="bb-quality-list">{[...episode.files].sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0)).map(file => <div key={file.index} className="bb-quality-row"><div><strong>{file.quality}</strong><span>{file.file_size_readable}</span></div><div className="bb-quality-actions"><Link href={`/watch/${episode.id}?file=${file.index}`} className="btn btn-primary"><Play size={16}/> Watch</Link><a className="btn btn-outline" href={`/api/download/${episode.id}/${file.index}`}><Download size={16}/> Download</a></div></div>)}</div> : <p className="bb-empty">Video files have not been added yet.</p>}</section></div>;
}
