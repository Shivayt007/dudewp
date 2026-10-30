import Link from "next/link";
import { ArrowLeft, Download, Play, Star } from "lucide-react";
import { notFound } from "next/navigation";
import MovieActions from "@/components/MovieActions";
import MovieCard from "@/components/MovieCard";
import Poster from "@/components/Poster";
import { findMovie, findRelatedMovies } from "@/lib/movies";

export const dynamic = "force-dynamic";

export default async function MovieDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movie = await findMovie(id);
  if (!movie) notFound();
  const related = await findRelatedMovies(movie);
  const runtime = movie.duration_seconds > 0 ? `${Math.floor(movie.duration_seconds / 3600)}h ${Math.round((movie.duration_seconds % 3600) / 60)}m` : "";
  const languages = [...new Set(movie.files.flatMap(file => file.language.split("+")).map(item => item.trim()).filter(item => item && item !== "Unknown"))];

  return <div className="movie-experience">
    <section className="detail-cinema">
      <img className="detail-backdrop" src={movie.backdrop_url || movie.poster_url || "/images/hollywood-fallback.svg"} alt="" fetchPriority="high"/>
      <div className="detail-backdrop-shade"/>
      <div className="shell detail-cinema-inner">
        <Link href="/#movies" className="detail-back"><ArrowLeft size={17}/> Back to movies</Link>
        <div className="detail-layout">
          <div className="detail-poster"><Poster id={movie.id} title={movie.title} image={movie.poster_url} large/></div>
          <div className="detail-copy">
            <p className="detail-kicker">Now available on DUDE</p>
            <h1>{movie.title}</h1>
            <div className="title-meta">
              <span>{movie.year}</span>{runtime && <span>{runtime}</span>}
              {movie.rating > 0 && <span className="meta-rating"><Star size={14} fill="currentColor"/> {movie.rating.toFixed(1)}</span>}
            </div>
            <div className="chip-row" aria-label="Available languages">{(languages.length ? languages : [movie.language]).map(language => <span key={language}>{language}</span>)}</div>
            <div className="chip-row quality-chips" aria-label="Available qualities">{movie.files.slice(0, 4).map(file => <span key={file.index}>{file.quality} · {file.codec} · {file.file_size_readable}</span>)}</div>
            <MovieActions movie={movie}/>
          </div>
        </div>
      </div>
    </section>

    <div className="shell movie-body">
      <details className="synopsis-panel" open>
        <summary>Storyline <span>Read synopsis</span></summary>
        <p>{movie.description || "Choose a quality and enjoy the movie."}</p>
        {movie.genres.length > 0 && <div className="genre-row">{movie.genres.map(genre => <span key={genre}>{genre}</span>)}</div>}
      </details>

      {movie.cast.length > 0 && <section className="cast-section" aria-labelledby="cast-title">
        <div className="content-heading"><h2 id="cast-title">Cast</h2><span>{movie.cast.length} featured</span></div>
        <div className="cast-rail">{movie.cast.map(person => <article key={person.id}>
          {person.profile_url ? <img src={person.profile_url} alt="" width={96} height={96} loading="lazy"/> : <span className="cast-fallback">{person.name.charAt(0)}</span>}
          <h3>{person.name}</h3><p>{person.character}</p>
        </article>)}</div>
      </section>}

      <section className="quality-section" aria-labelledby="quality-title">
        <div className="content-heading"><div><p>Choose your stream</p><h2 id="quality-title">Quality & audio</h2></div><span>{movie.files.length} option{movie.files.length === 1 ? "" : "s"}</span></div>
        <div className="quality-card-list">{movie.files.map((file, index) => <article className="quality-card" key={file.index}>
          <div className="quality-resolution"><strong>{file.quality}</strong>{index === 0 && <span>Recommended</span>}</div>
          <div className="quality-data"><strong>{file.language}</strong><span>{file.codec} · {file.file_size_readable}</span></div>
          <div className="quality-actions"><Link href={`/watch/${movie.id}?file=${file.index}`} aria-label={`Play ${movie.title} in ${file.quality}`}><Play size={17} fill="currentColor"/> Play</Link><a href={`/api/download/${movie.id}/${file.index}`} target="_blank" rel="noopener noreferrer"><Download size={17}/><span className="sr-only">Download</span></a></div>
        </article>)}</div>
      </section>

      {related.length > 0 && <section className="related-section" aria-labelledby="related-title">
        <div className="content-heading"><h2 id="related-title">More like this</h2><Link href="/#movies">Browse all</Link></div>
        <div className="movie-carousel">{related.map(movieItem => <MovieCard key={movieItem.id} movie={movieItem}/>)}</div>
      </section>}
    </div>
  </div>;
}
