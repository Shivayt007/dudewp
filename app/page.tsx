import Link from "next/link";
import { Play, ArrowRight, SearchX } from "lucide-react";
import MovieCard from "@/components/MovieCard";
import { findMovies, catalogFilters } from "@/lib/movies";
export const dynamic = "force-dynamic";
type Params = Record<string, string | string[] | undefined>;
const one = (value: Params[string]) => typeof value === "string" ? value : "";
export default async function Home({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const search = one(p.search).slice(0,80), genre = one(p.genre), year = Number(one(p.year)) || undefined;
  const sort = one(p.sort) === "popular" ? "popular" : one(p.sort) === "title" ? "title" : "latest";
  const page = Math.max(1, Number.parseInt(one(p.page) || "1", 10) || 1);
  let data, featured, filters;
  let unavailable = false;
  try {
    const [catalog, recent, choices] = await Promise.all([findMovies({search,genre,year,sort,page}), findMovies({limit:1}), catalogFilters()]);
    data = catalog; featured = recent.movies[0]; filters = choices;
  } catch { unavailable = true; }
  const paging = (next:number) => { const q = new URLSearchParams(); if(search)q.set('search',search);if(genre)q.set('genre',genre);if(year)q.set('year',String(year));q.set('sort',sort);q.set('page',String(next));return `/?${q}#movies`; };
  return <>
    {!search && page === 1 && <section className="cinema-hero" aria-labelledby="featured-title"><img className="hero-backdrop" src={featured?.backdrop_url || featured?.poster_url || "/images/hollywood-fallback.svg"} alt={featured ? `${featured.title} backdrop` : "DUDE Hollywood cinema"} fetchPriority="high"/><div className="hero-shade"/><div className="shell hero-inner"><p className="hero-label">{featured ? "JUST ADDED TO DUDE" : "DUDE HOLLYWOOD"}</p><h1 id="featured-title">{featured?.title || "A screen for every story."}</h1>{featured && <p className="hero-meta">{featured.year} · {featured.genres.slice(0,2).join(" / ") || featured.language}{featured.duration_seconds > 0 ? ` · ${Math.round(featured.duration_seconds/60)} min` : ""}{featured.rating > 0 ? ` · ★ ${featured.rating.toFixed(1)}` : ""}</p>}<p className="hero-description">{featured?.description || "Big stories. Unforgettable characters. Find your next movie in the DUDE collection."}</p><div className="hero-actions">{featured ? <><Link className="btn cinema-primary" href={`/watch/${featured.id}`}><Play size={18} fill="currentColor"/> Watch now</Link><Link className="cinema-secondary" href={`/movie/${featured.id}`}>Movie details <ArrowRight size={17}/></Link></> : <a className="btn cinema-primary" href="#movies">Explore movies <ArrowRight size={18}/></a>}</div></div><div className="hero-bottom shell"><span>THE HOLLYWOOD COLLECTION</span><a href="#movies">Explore below ↓</a></div></section>}
    <section id="movies" className="shell film-collection"><div className="collection-heading"><div><p>YOUR NEXT GREAT WATCH</p><h2>{search ? `Results for “${search}”` : "The collection"}</h2></div><span>{data ? `${data.count} movies` : "Hollywood movies"}</span></div>
    <form action="/#movies" className="film-filters"><input type="hidden" name="search" value={search}/><label>Genre<select name="genre" defaultValue={genre}><option value="">All genres</option>{filters?.genres.map(g=><option key={g}>{g}</option>)}</select></label><label>Year<select name="year" defaultValue={year || ""}><option value="">All years</option>{filters?.years.map(y=><option key={y}>{y}</option>)}</select></label><label>Sort<select name="sort" defaultValue={sort}><option value="latest">Recently added</option><option value="popular">Most watched</option><option value="title">A–Z</option></select></label><button className="filter-apply" type="submit">Apply filters</button>{(search||genre||year) && <Link href="/#movies">Clear</Link>}</form>
    {unavailable ? <div className="cinema-empty" role="status"><h3>The collection is temporarily unavailable.</h3><p>Please try again in a moment.</p><Link href="/" className="btn cinema-primary">Try again</Link></div> : data?.movies.length ? <div className="film-grid">{data.movies.map(movie=><MovieCard key={movie.id} movie={movie}/>)}</div> : <div className="cinema-empty"><SearchX size={32}/><h3>{search||genre||year ? "No movies match these filters." : "The next great watch is on its way."}</h3><p>{search||genre||year ? "Try a different title, genre or year." : "New movies will appear here as they are published."}</p>{(search||genre||year) && <Link href="/#movies">Clear filters</Link>}</div>}
    {data && data.totalPages > 1 && <nav className="pager" aria-label="Movie pages">{page > 1 ? <Link href={paging(page-1)}>← Previous</Link>:<span/>}<span>{page} / {data.totalPages}</span>{page < data.totalPages ? <Link href={paging(page+1)}>Next →</Link>:<span/>}</nav>}</section>
  </>;
}
