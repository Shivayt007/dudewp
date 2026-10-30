import "server-only";
import type { CastMember, Movie } from "./models";

const normalized = (value: unknown) => String(value || "").normalize("NFKD").replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
const image = (path: unknown, size: "w500" | "original") => typeof path === "string" && /^\/[A-Za-z0-9._-]+$/.test(path) ? `https://image.tmdb.org/t/p/${size}${path}` : "";

async function tmdb(path: string, params: Record<string, string> = {}) {
  const token = process.env.TMDB_READ_TOKEN?.trim();
  if (!token) return null;
  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function enrichMovie(movie: Movie): Promise<Movie> {
  try {
    let id = movie.tmdb_id;
    if (!id) {
      const search = await tmdb("search/movie", { query: movie.title, year: String(movie.year), include_adult: "false" });
      const matches = (search?.results || []).filter((item: Record<string, unknown>) =>
        String(item.release_date || "").startsWith(String(movie.year)) &&
        [item.title, item.original_title].some(title => normalized(title) === normalized(movie.title))
      );
      if (matches.length !== 1) return movie;
      id = Number(matches[0].id);
    }
    const detail = await tmdb(`movie/${id}`, { append_to_response: "credits" });
    if (!detail) return movie;
    const cast: CastMember[] = (detail.credits?.cast || []).slice(0, 12).map((member: Record<string, unknown>) => ({
      id: Number(member.id),
      name: String(member.name || ""),
      character: String(member.character || ""),
      profile_url: image(member.profile_path, "w500"),
    }));
    return {
      ...movie,
      tmdb_id: id,
      title: String(detail.title || movie.title),
      year: Number(String(detail.release_date || "").slice(0, 4)) || movie.year,
      poster_url: image(detail.poster_path, "w500") || movie.poster_url,
      backdrop_url: image(detail.backdrop_path, "original") || movie.backdrop_url,
      description: String(detail.overview || movie.description),
      genres: Array.isArray(detail.genres) ? detail.genres.map((item: { name?: string }) => String(item.name || "")).filter(Boolean) : movie.genres,
      rating: Number(detail.vote_average) || movie.rating,
      duration_seconds: Number(detail.runtime) > 0 ? Number(detail.runtime) * 60 : movie.duration_seconds,
      cast,
    };
  } catch {
    return movie;
  }
}
