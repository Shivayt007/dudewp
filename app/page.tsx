import Link from "next/link";
import { ArrowRight, Play, SearchX } from "lucide-react";
import EpisodeCard from "@/components/EpisodeCard";
import { findMovies } from "@/lib/movies";
export const dynamic = "force-dynamic";
type Params = Record<string, string | string[] | undefined>;
const single = (value: Params[string]) => typeof value === "string" ? value : "";
export default async function Home({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const search = single(p.search).slice(0, 80);
  const page = Math.max(1, Number.parseInt(single(p.page) || "1", 10) || 1);
  const pageUrl = (next: number) => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (next > 1) query.set("page", String(next));
    return `/?${query}#episodes`;
  };
  let data, latest;
  let unavailable = false;
  try {
    [data, latest] = await Promise.all([findMovies({ search, page, limit: 24 }), findMovies({ kind: "episode", limit: 1 })]);
  } catch { unavailable = true; }
  const featured = latest?.movies[0];
  const showHero = !search && page === 1;
  return <>
    {showHero && <section className="bb-banner shell" aria-labelledby="show-title">
      <img className="bb-banner-image" src="/images/biggboss-season-10.webp" alt="Bigg Boss Tamil Season 10 — golden eye on a red and gold stage" width={1536} height={864} fetchPriority="high"/>
      <div className="bb-banner-copy" id="latest"><div><h1 id="show-title">Bigg Boss Tamil</h1><p className="bb-banner-subtitle">Season 10. Every day. Every episode.</p>{featured && <p className="bb-latest-title">{featured.title}</p>}</div>
      <div className="bb-banner-actions">{featured ? <><Link className="btn btn-primary" href={`/watch/${featured.id}`}><Play size={19} fill="currentColor"/> Watch latest</Link><Link className="btn btn-outline" href={`/movie/${featured.id}`}>Choose quality <ArrowRight size={18}/></Link></> : <a className="btn btn-primary" href="#episodes">Browse episodes <ArrowRight size={18}/></a>}</div></div>
    </section>}
    <section id="episodes" className="shell bb-catalog"><div className="bb-section-heading">{search ? <h1 className="bb-results-title">Search: {search}</h1> : showHero ? <h2>Episodes</h2> : <h1 className="bb-results-title">Episodes</h1>}<span>{data ? `${data.count} ${data.count === 1 ? "upload" : "uploads"}` : "Season 10"}</span></div>
    {unavailable ? <div className="bb-empty" role="status"><h3>Episodes are temporarily unavailable</h3><p>Please try again in a moment.</p><Link className="btn btn-outline" href="/">Try again</Link></div> : data?.movies.length ? <div className="episode-grid">{data.movies.map(episode => <EpisodeCard key={episode.id} episode={episode}/>)}</div> : <div className="bb-empty"><SearchX size={32}/><h3>{search ? "No matching episodes" : "No uploads yet"}</h3><p>{search ? "Try another title." : "Season 10 episodes will appear here when they are added."}</p>{search && <Link className="btn btn-outline" href="/">Clear search</Link>}</div>}
    {data && data.totalPages > 1 && <nav className="pager" aria-label="Episode pages">{page > 1 ? <Link href={pageUrl(page - 1)}>Previous</Link> : <span/>}<span>Page {page} of {data.totalPages}</span>{page < data.totalPages ? <Link href={pageUrl(page + 1)}>Next <ArrowRight size={16}/></Link> : <span/>}</nav>}</section>
  </>;
}
