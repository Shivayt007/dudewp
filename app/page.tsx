import Link from "next/link";
import { ArrowRight, Play, SearchX, Radio } from "lucide-react";
import Poster from "@/components/Poster";
import EpisodeCard from "@/components/EpisodeCard";
import { findMovies } from "@/lib/movies";
export const dynamic = 'force-dynamic';
type Params = Record<string, string | string[] | undefined>;
const single = (value: Params[string]) => typeof value === 'string' ? value : '';
export default async function Home({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const search = single(p.search).slice(0, 80);
  const kindValue = single(p.kind);
  const kind = kindValue === 'episode' || kindValue === 'promo' || kindValue === 'highlight' ? kindValue : undefined;
  const page = Math.max(1, Number.parseInt(single(p.page) || '1', 10) || 1);
  const query = (next: { kind?: string; page?: number } = {}) => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (next.kind ?? kind) q.set('kind', next.kind ?? kind!);
    if (next.page && next.page > 1) q.set('page', String(next.page));
    return `/?${q}#episodes`;
  };
  let data, latest, promos, highlights;
  let unavailable = false;
  try {
    [data, latest, promos, highlights] = await Promise.all([
      findMovies({ search, kind, page, limit: 24 }), findMovies({ kind: 'episode', limit: 1 }),
      findMovies({ kind: 'promo', limit: 4 }), findMovies({ kind: 'highlight', limit: 4 }),
    ]);
  } catch { unavailable = true; }
  const featured = latest?.movies[0];
  const showHero = !search && !kind && page === 1;
  return <>
    {showHero && <section className="bb-hero"><div className="shell bb-hero-inner"><div className="bb-hero-copy"><p className="bb-season"><Radio size={18}/> Tamil · Season 10</p><h1>Bigg Boss<br/>Tamil</h1><p className="bb-intro">Every day. Every episode.</p>{featured ? <><h2>{featured.title}</h2><p className="bb-hero-meta">{featured.language} · {featured.file_count} quality {featured.file_count === 1 ? 'option' : 'options'}</p><div className="bb-hero-actions"><Link className="btn btn-primary" href={`/watch/${featured.id}`}><Play size={19} fill="currentColor"/> Watch episode</Link><Link className="btn btn-outline" href={`/movie/${featured.id}`}>View details <ArrowRight size={18}/></Link></div></> : <><p>Episodes, promos and highlights, together in one place.</p><a className="btn btn-primary" href="#episodes">Browse episodes <ArrowRight size={18}/></a></>}</div><div className="bb-hero-art">{featured ? <Poster id={featured.id} title={featured.title} hasPoster={featured.hasPoster} large/> : <div className="bb-season-art"><Radio size={100} strokeWidth={1}/><strong>Bigg Boss Tamil</strong><span>Season 10</span></div>}</div></div></section>}
    <section id="episodes" className="shell bb-catalog"><div className="bb-section-heading"><div>{!showHero && <h1 className="bb-results-title">{search ? `Search: ${search}` : 'Bigg Boss Tamil'}</h1>}<h2>{kind === 'promo' ? 'Promos' : kind === 'highlight' ? 'Highlights' : kind === 'episode' ? 'Full episodes' : 'All episodes'}</h2></div><span className="bb-season-select">Season 10</span></div><nav className="bb-filters" aria-label="Episode type">{[['', 'All episodes'], ['episode', 'Full episodes'], ['promo', 'Promos'], ['highlight', 'Highlights']].map(([value, label]) => <Link key={value} href={query({ kind: value })} aria-current={(kind || '') === value ? 'page' : undefined}>{label}</Link>)}</nav>
    {unavailable ? <div className="bb-empty" role="status"><h3>Episodes are temporarily unavailable</h3><p>Please try again in a moment.</p><Link className="btn btn-outline" href="/">Try again</Link></div> : data?.movies.length ? <div className="episode-grid">{data.movies.map(episode => <EpisodeCard key={episode.id} episode={episode}/>)}</div> : <div className="bb-empty"><SearchX size={32}/><h3>{search ? 'No matching episodes' : 'No uploads yet'}</h3><p>{search ? 'Try another title or clear your filters.' : 'Season 10 episodes and clips will appear here when they are added.'}</p>{(search || kind) && <Link className="btn btn-outline" href="/">Clear filters</Link>}</div>}
    {data && data.totalPages > 1 && <nav className="pager" aria-label="Episode pages">{page > 1 ? <Link href={query({ page: page - 1 })}>Previous</Link> : <span/>}<span>Page {page} of {data.totalPages}</span>{page < data.totalPages ? <Link href={query({ page: page + 1 })}>Next <ArrowRight size={16}/></Link> : <span/>}</nav>}</section>
    {showHero && Boolean(promos?.movies.length || highlights?.movies.length) && <section id="promos" className="shell bb-promos"><div className="bb-section-heading"><h2>Promos & highlights</h2><Link className="text-link" href="/?kind=promo#episodes">All promos <ArrowRight size={16}/></Link></div><div className="episode-grid clip-grid">{[...(promos?.movies || []), ...(highlights?.movies || [])].map(episode => <EpisodeCard key={episode.id} episode={episode}/>)}</div></section>}
  </>;
}
