import Link from "next/link";
import MovieCard from "./MovieCard";
import type { Movie } from "@/lib/models";

type Catalog = { movies: Movie[]; count: number; page: number; totalPages: number };

export default function HomeCinema({ catalog, search = "" }: { catalog: Catalog; search?: string }) {
  const pageLink = (page: number) => "/?" + new URLSearchParams({ ...(search ? { search } : {}), page: String(page) }).toString();
  return <section className="catalog shell" aria-labelledby="catalog-title">
    <div className="catalog-heading">
      <h1 id="catalog-title">{search ? "Search results" : "All movies"}</h1>
      <span aria-live="polite">{catalog.count.toLocaleString()} {catalog.count === 1 ? "movie" : "movies"}</span>
    </div>
    {search && <p className="catalog-query">Results for <strong>“{search}”</strong> <Link href="/">Clear search</Link></p>}
    {catalog.movies.length ? <div className="catalog-grid">
      {catalog.movies.map(movie => <MovieCard key={movie.id} movie={movie}/>)}
    </div> : <div className="catalog-empty">
      <h2>{search ? "No matching movies" : "No movies yet"}</h2>
      <p>{search ? "Try a different title or check your spelling." : "Movies will appear here as they are published."}</p>
      {search && <Link href="/">View all movies</Link>}
    </div>}
    {catalog.totalPages > 1 && <nav className="catalog-pagination" aria-label="Movie pages">
      {catalog.page > 1 ? <Link href={pageLink(catalog.page - 1)} rel="prev">← Previous</Link> : <span/>}
      <span>Page {catalog.page} of {catalog.totalPages}</span>
      {catalog.page < catalog.totalPages ? <Link href={pageLink(catalog.page + 1)} rel="next">Next →</Link> : <span/>}
    </nav>}
  </section>;
}
