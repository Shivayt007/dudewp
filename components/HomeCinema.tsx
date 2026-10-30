"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Play, Plus, Search, SlidersHorizontal } from "lucide-react";
import MovieCard from "./MovieCard";
import type { Movie } from "@/lib/models";

type Query = { search: string; genre: string; year: number; sort: string; page: number };
type Props = {
  catalog: { movies: Movie[]; count: number; totalPages: number };
  recent: Movie[]; popular: Movie[];
  filters: { genres: string[]; years: number[] }; query: Query;
};
const languages = (movie: Movie) => [...new Set(movie.files.flatMap(file => (file.language || movie.language).split("+")).map(s => s.trim()).filter(s => s && s !== "Unknown"))];
const minutes = (seconds: number) => Math.max(1, Math.ceil(seconds / 60)) + " min left";
export default function HomeCinema({ catalog, recent, popular, filters, query }: Props) {
  const [language, setLanguage] = useState("All");
  const [slide, setSlide] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [showList, setShowList] = useState(false);
  useEffect(() => {
    const read = () => {
      const next: Record<string, number> = {}, list: string[] = [];
      try {
        for (const movie of recent) {
          const value = Number(localStorage.getItem("dude-progress:" + movie.id));
          if (Number.isFinite(value) && value > 5 && (!movie.duration_seconds || value < movie.duration_seconds - 10)) next[movie.id] = value;
          if (localStorage.getItem("dude-list:" + movie.id) === "1") list.push(movie.id);
        }
      } catch {}
      setProgress(next); setSaved(list); setShowList(location.hash === "#library");
    };
    read(); window.addEventListener("hashchange", read); window.addEventListener("storage", read);
    return () => { window.removeEventListener("hashchange", read); window.removeEventListener("storage", read); };
  }, [recent]);
  const pool = recent.filter(movie => language === "All" || languages(movie).includes(language));
  const featured = pool[slide % Math.min(pool.length || 1, 5)];
  const availableLanguages = [...new Set(recent.flatMap(languages))].sort();
  const continuing = recent.filter(movie => progress[movie.id]);
  const filtered = catalog.movies.filter(movie => (language === "All" || languages(movie).includes(language)) && (!showList || saved.includes(movie.id)));
  const discovery = !query.search && !query.genre && !query.year && query.page === 1 && !showList;
  const toggleSave = () => {
    if (!featured) return;
    const exists = saved.includes(featured.id);
    setSaved(exists ? saved.filter(id => id !== featured.id) : [...saved, featured.id]);
    try { exists ? localStorage.removeItem("dude-list:" + featured.id) : localStorage.setItem("dude-list:" + featured.id, "1"); } catch {}
  };
  const pageLink = (page: number) => {
    const params = new URLSearchParams({ sort: query.sort, page: String(page) });
    if (query.search) params.set("search", query.search);
    if (query.genre) params.set("genre", query.genre);
    if (query.year) params.set("year", String(query.year));
    return "/?" + params + "#movies";
  };
  return <div className="home-cinema">
    {discovery && featured && <section className="home-feature" aria-label="Featured movie">
      <img className="home-feature-image" src={featured.backdrop_url || featured.poster_url || "/images/hollywood-fallback.svg"} alt="" fetchPriority="high"/>
      <div className="home-feature-shade"/>
      <div className="shell home-feature-inner">
        <div className="home-feature-copy">
          <p className="home-eyebrow">Featured on DUDE</p>
          <h1>{featured.title}</h1>
          <div className="home-meta"><span>{featured.year}</span>{featured.genres[0] && <span>{featured.genres[0]}</span>}{featured.duration_seconds > 0 && <span>{Math.floor(featured.duration_seconds / 3600)}h {Math.round(featured.duration_seconds % 3600 / 60)}m</span>}</div>
          <div className="home-badges">{languages(featured).map(item => <span key={item}>{item}</span>)}<span className="home-quality">{featured.files[0]?.quality || "HD"}</span></div>
          {featured.description && <p className="home-feature-synopsis">{featured.description}</p>}
          <div className="home-feature-actions"><Link className="home-play" href={"/watch/" + featured.id}><Play size={21} fill="currentColor"/>Play now</Link><button onClick={toggleSave} aria-label={saved.includes(featured.id) ? "Remove from my list" : "Add to my list"} aria-pressed={saved.includes(featured.id)}>{saved.includes(featured.id) ? <Check/> : <Plus/>}</button></div>
          {pool.length > 1 && <div className="home-slide-controls"><button onClick={() => setSlide(value => (value + Math.min(pool.length, 5) - 1) % Math.min(pool.length, 5))} aria-label="Previous featured movie"><ChevronLeft size={17}/></button><div>{pool.slice(0, 5).map((movie, index) => <button key={movie.id} className={slide % Math.min(pool.length, 5) === index ? "active" : ""} onClick={() => setSlide(index)} aria-label={"Feature " + movie.title} aria-pressed={slide % Math.min(pool.length, 5) === index}/>)}</div><button onClick={() => setSlide(value => (value + 1) % Math.min(pool.length, 5))} aria-label="Next featured movie"><ChevronRight size={17}/></button></div>}
        </div>
      </div>
    </section>}
    <div className="shell home-content">
      {availableLanguages.length > 0 && <nav className="home-languages" aria-label="Filter by audio language">{["All", ...availableLanguages].map(item => <button key={item} className={language === item ? "active" : ""} aria-pressed={language === item} onClick={() => { setLanguage(item); setSlide(0); }}>{item}</button>)}</nav>}
      {discovery && continuing.length > 0 && <section className="home-section"><div className="home-section-heading"><h2>Continue watching</h2><span>Pick up where you left off</span></div><div className="continue-rail">{continuing.map(movie => <Link href={"/watch/" + movie.id} className="continue-card" key={movie.id}><div className="continue-image"><img src={movie.backdrop_url || movie.poster_url || "/images/hollywood-fallback.svg"} alt="" loading="lazy"/><span className="continue-play"><Play size={20} fill="currentColor"/></span><div className="continue-progress">{movie.duration_seconds > 0 && <span style={{ width: Math.min(100, progress[movie.id] / movie.duration_seconds * 100) + "%" }}/>}</div></div><strong>{movie.title}</strong><small>{movie.duration_seconds > 0 ? minutes(movie.duration_seconds - progress[movie.id]) : "Resume at " + Math.floor(progress[movie.id] / 60) + ":" + String(Math.floor(progress[movie.id] % 60)).padStart(2, "0")}</small></Link>)}</div></section>}
      {discovery && pool.length > 0 && <section className="home-section" id="new-arrivals"><div className="home-section-heading"><h2>New arrivals</h2><a href="#movies">See all <ChevronRight size={16}/></a></div><div className="home-poster-rail">{pool.slice(0, 12).map(movie => <MovieCard movie={movie} key={movie.id}/>)}</div></section>}
      {discovery && popular.length > 1 && <section className="home-section"><div className="home-section-heading"><h2>Most watched</h2><Link href="/?sort=popular#movies">See all <ChevronRight size={16}/></Link></div><div className="home-rank-rail">{popular.filter(movie => language === "All" || languages(movie).includes(language)).slice(0, 10).map((movie, index) => <MovieCard movie={movie} rank={index + 1} key={movie.id}/>)}</div></section>}
      <section className="home-section home-library" id="movies">
        <div id="library" className="home-section-heading"><h2>{showList ? "My list" : query.search ? "Results for “" + query.search + "”" : "Explore all movies"}</h2><span>{query.search || query.genre || query.year ? catalog.count : filtered.length} titles</span></div>
        <form action="/#movies" className="home-search" id="catalog-search"><Search size={19}/><input name="search" defaultValue={query.search} aria-label="Search movie titles" placeholder="Find your next movie"/><button type="submit" aria-label="Search"><ArrowRight size={20}/></button></form>
        <details className="home-filter-panel"><summary><SlidersHorizontal size={17}/> Refine collection<span>{query.genre || query.year || query.sort !== "latest" ? "Filters active" : "Genre · Year · Sort"}</span></summary><form action="/#movies"><input type="hidden" name="search" value={query.search}/><label>Genre<select name="genre" defaultValue={query.genre}><option value="">All genres</option>{filters.genres.map(item => <option key={item}>{item}</option>)}</select></label><label>Year<select name="year" defaultValue={query.year || ""}><option value="">All years</option>{filters.years.map(item => <option key={item}>{item}</option>)}</select></label><label>Sort<select name="sort" defaultValue={query.sort}><option value="latest">Recently added</option><option value="popular">Most watched</option><option value="title">A–Z</option></select></label><button type="submit">Apply</button><Link href="/#movies">Reset</Link></form></details>
        {filtered.length ? <div className="home-grid">{filtered.map(movie => <MovieCard key={movie.id} movie={movie}/>)}</div> : <div className="home-empty"><h3>{showList ? "Keep your next watch close." : "Nothing here just yet."}</h3><p>{showList ? "Tap + on a featured movie to save it on this device." : "Try another language or search, or check back for new arrivals."}</p></div>}
        {catalog.totalPages > 1 && !showList && <nav className="home-pagination" aria-label="Movie pages">{query.page > 1 ? <Link href={pageLink(query.page - 1)}>← Previous</Link> : <span/>}<span>{query.page} / {catalog.totalPages}</span>{query.page < catalog.totalPages ? <Link href={pageLink(query.page + 1)}>Next →</Link> : <span/>}</nav>}
      </section>
    </div>
  </div>;
}
