import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import AdvancedPlayer from "@/components/AdvancedPlayer";
import { findMovie } from "@/lib/movies";

export const dynamic = "force-dynamic";

export default async function Watch({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ file?: string }> }) {
  const { id } = await params;
  const movie = await findMovie(id);
  if (!movie) notFound();
  const query = await searchParams;
  const requested = query.file && /^\d+$/.test(query.file) ? Number(query.file) : 0;
  const initialIndex = movie.files.find(item => item.index === requested)?.index ?? movie.files[0]?.index ?? 0;
  return <section className="watch-minimal shell" aria-labelledby="watch-title">
    <Link href="/" className="watch-back"><ArrowLeft size={18} aria-hidden="true"/> All movies</Link>
    <h1 id="watch-title">{movie.title}</h1>
    <AdvancedPlayer movie={movie} initialIndex={initialIndex}/>
  </section>;
}
