import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { notFound } from "next/navigation";
import AdvancedPlayer from "@/components/AdvancedPlayer";
import MovieActions from "@/components/MovieActions";
import MovieCard from "@/components/MovieCard";
import { findMovie, findRelatedMovies } from "@/lib/movies";

export const dynamic = "force-dynamic";

export default async function Watch({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ file?: string }> }) {
  const { id } = await params;
  const movie = await findMovie(id);
  if (!movie) notFound();
  const query = await searchParams;
  const file = query.file && /^\d+$/.test(query.file) ? Number(query.file) : 0;
  const related = await findRelatedMovies(movie, 10);
  const runtime = movie.duration_seconds > 0 ? `${Math.floor(movie.duration_seconds / 3600)}h ${Math.round((movie.duration_seconds % 3600) / 60)}m` : "";
  const languages = [...new Set(movie.files.flatMap(item => item.language.split("+")).map(item => item.trim()).filter(item => item && item !== "Unknown"))];

  return <div className="watch-experience">
    <div className="shell watch-topline"><Link href={`/movie/${id}`}><ArrowLeft size={17}/> Movie details</Link><span>Secure playback</span></div>
    <div className="watch-player-pin"><div className="player-frame"><AdvancedPlayer movie={movie} initialIndex={movie.files[file] ? file : 0}/></div></div>
    <div className="shell watch-content">
      <section className="watch-title-block">
        <h1>{movie.title}</h1>
        <div className="title-meta"><span>{movie.year}</span>{runtime && <span>{runtime}</span>}{movie.rating > 0 && <span className="meta-rating"><Star size={14} fill="currentColor"/> {movie.rating.toFixed(1)}</span>}</div>
        <div className="chip-row">{(languages.length ? languages : [movie.language]).map(language => <span key={language}>{language}</span>)}</div>
        <div className="chip-row quality-chips">{movie.files.map(item => <span key={item.index}>{item.quality} · {item.codec} · {item.file_size_readable}</span>)}</div>
      </section>
      <MovieActions movie={movie}/>

      <details className="synopsis-panel" open>
        <summary>Storyline <span>Read synopsis</span></summary>
        <p>{movie.description || "Choose your preferred quality and enjoy the movie."}</p>
        {movie.genres.length > 0 && <div className="genre-row">{movie.genres.map(genre => <span key={genre}>{genre}</span>)}</div>}
      </details>

      {movie.cast.length > 0 && <section className="cast-section" aria-labelledby="watch-cast-title">
        <div className="content-heading"><h2 id="watch-cast-title">Cast</h2></div>
        <div className="cast-rail">{movie.cast.map(person => <article key={person.id}>
          {person.profile_url ? <img src={person.profile_url} alt="" width={96} height={96} loading="lazy"/> : <span className="cast-fallback">{person.name.charAt(0)}</span>}
          <h3>{person.name}</h3><p>{person.character}</p>
        </article>)}</div>
      </section>}

      {related.length > 0 && <section className="related-section" aria-labelledby="watch-related-title">
        <div className="content-heading"><h2 id="watch-related-title">More like this</h2><Link href="/#movies">Browse all</Link></div>
        <div className="movie-carousel">{related.map(item => <MovieCard key={item.id} movie={item}/>)}</div>
      </section>}
    </div>
  </div>;
}
