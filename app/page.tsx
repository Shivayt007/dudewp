import Link from "next/link";
import { ArrowRight, Flame, Play, Film, SearchX, TrendingUp, Sparkles, AlertCircle } from "lucide-react";
import Poster from "@/components/Poster";
import MovieCard from "@/components/MovieCard";
import { findMovies, listLanguages } from "@/lib/movies";
import { formatViews } from "@/lib/models";
export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
function single(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }
function withQuery(input: { search: string; language: string; sort: string; page?: number }) {
  const p = new URLSearchParams();
  if (input.search) p.set("search", input.search);
  if (input.language && input.language !== "All") p.set("language", input.language);
  if (input.sort && input.sort !== "latest") p.set("sort", input.sort);
  if (input.page && input.page !== 1) p.set("page", String(input.page));
  return `/?${p.toString()}`;
}
export default async function Home({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const search = single(p.search).slice(0, 80);
  const language = single(p.language);
  const sortValue = single(p.sort);
  const sort = sortValue === "popular" || sortValue === "title" ? sortValue : "latest";
  const page = Math.max(1, Number.parseInt(single(p.page) || "1", 10) || 1);
  let data, languages: string[];
  try {
    [data, languages] = await Promise.all([findMovies({ search, language, sort, page, limit: 24 }), listLanguages()]);
  } catch (error) {
    console.error("Catalog unavailable", error instanceof Error ? error.message : "Unknown error");
    return <section className="shell state-box"><AlertCircle size={42} /><span className="state-kicker">CONNECTION NOT READY</span><h1>Let’s connect your movie library.</h1><p>Add <code>MONGODB_URI</code>, <code>MONGODB_DB</code> and <code>MONGODB_COLLECTION</code> to your server environment. Check the README for setup steps.</p><Link href="/api/health" className="btn btn-outline">Check database connection <ArrowRight size={16}/></Link></section>;
  }
  const featured = !search && !language && page === 1 && sort === "latest" ? data.movies[0] : null;
  const movies = featured ? data.movies.slice(1) : data.movies;
  return <>
    {featured ? <section className="hero"><div className="shell hero-inner">
      <div className="hero-copy"><div className="eyebrow"><Sparkles size={14}/> FRESHLY ADDED TO DUDE</div><div className="hero-tag">FEATURED PREMIERE</div><h1>{featured.title}</h1><div className="hero-meta"><span className="tag-highlight">{featured.language}</span><span>{featured.file_count} {featured.file_count === 1 ? "version" : "versions"}</span><span>{formatViews(featured.views)} views</span></div><p>{featured.description || "A new addition to the Dude Movies collection. Choose your preferred version and enjoy."}</p><div className="hero-actions"><Link className="btn btn-primary" href={`/watch/${featured.id}`}><Play size={18} fill="currentColor"/>Watch Now</Link><Link className="btn btn-frost" href={`/movie/${featured.id}`}>Movie Details<ArrowRight size={16}/></Link></div></div>
      <div className="hero-art"><div className="hero-poster"><Poster id={featured.id} title={featured.title} hasPoster={featured.hasPoster} large/></div><div className="hero-shine"/></div>
    </div></section> : <section className="mini-banner"><div className="shell"><div className="eyebrow"><Film size={15}/> THE DUDE COLLECTION</div><h1>{search ? `Results for “${search}”` : language ? `${language} Movies` : "Explore Movies"}</h1><p>Discover new favorites and stream your way.</p></div></section>}
    <section className="shell catalog-section"><div className="catalog-heading"><div><div className="section-eyebrow"><Flame size={15}/> YOUR MOVIE UNIVERSE</div><h2>{sort === "popular" ? "Trending now" : sort === "title" ? "A to Z" : "Explore the collection"}<span className="heading-dot">.</span></h2><p>Find your next favorite. {data.count} {data.count === 1 ? "title" : "titles"} available.</p></div><div className="catalog-tools"><form action="/" className="sort-form"><input type="hidden" name="search" value={search}/><input type="hidden" name="language" value={language}/><label htmlFor="sort">Sort by</label><select id="sort" name="sort" defaultValue={sort} aria-label="Sort movies"><option value="latest">Recently added</option><option value="popular">Most viewed</option><option value="title">Title A–Z</option></select><button type="submit" className="btn-small">Apply</button></form></div></div>
    <div className="language-list"><Link href={withQuery({ search, language: "", sort })} className={`language-pill ${!language ? "active" : ""}`}>All Movies</Link>{languages.map(lang => <Link key={lang} className={`language-pill ${language === lang ? "active" : ""}`} href={withQuery({ search, language: lang, sort })}>{lang}</Link>)}</div>
    {movies.length ? <div className="movie-grid">{movies.map((movie, index) => <MovieCard movie={movie} key={movie.id} rank={sort === "popular" && page === 1 ? index + 1 : undefined}/>)}</div> : <div className="empty-search"><SearchX size={38}/><h3>No movies found</h3><p>Try another search or language filter.</p><Link className="btn btn-outline" href="/">Clear filters</Link></div>}
    {data.totalPages > 1 ? <div className="pager"><Link aria-disabled={page <= 1} className={page <= 1 ? "disabled" : ""} href={withQuery({ search, language, sort, page: page - 1 })}>Previous</Link><span>Page {page} of {data.totalPages}</span><Link aria-disabled={page >= data.totalPages} className={page >= data.totalPages ? "disabled" : ""} href={withQuery({ search, language, sort, page: page + 1 })}>Next <ArrowRight size={15}/></Link></div> : null}
    </section>
    <section className="bottom-band"><div className="shell bottom-band-inner"><div><span className="section-eyebrow"><TrendingUp size={15}/> WATCH YOUR WAY</span><h2>Every screen. One experience.</h2><p>Pick a movie, choose a version, and watch with distraction-free controls.</p></div><Link href="/?sort=popular" className="btn btn-frost">Explore trending <ArrowRight size={16}/></Link></div></section>
  </>;
}
