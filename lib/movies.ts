import "server-only";
import { ObjectId, type Document, type Sort } from "mongodb";
import { getMovieCollection } from "./mongodb";
import { fileFormat, formatSize, type Movie, type MovieFile } from "./models";
import { qualityLabel, thumbnailFileId } from "./episode-meta.mjs";

export const hollywoodFilter = { content_type: "hollywood", published: true, "files.0": { $exists: true } };

function normalize(raw: Document): Movie {
  const files: MovieFile[] = (Array.isArray(raw.files) ? raw.files : []).map((file: Document, index: number) => {
    const quality = qualityLabel(file);
    const language = String(file.language || raw.language || "Unknown");
    const codec = String(file.codec || "Original");
    return {
      index, quality, language, codec, file_name: String(file.file_name || ""),
      display_name: [quality, language, codec].filter(Boolean).join(" · "),
      file_size: Number(file.file_size) || 0,
      file_size_readable: String(file.file_size_readable || formatSize(Number(file.file_size) || 0)),
      mime_type: String(file.mime_type || ""),
      playableHint: fileFormat(String(file.file_name || ""), String(file.mime_type || "")),
    };
  });
  const safeImage = (value: unknown) => typeof value === "string" && /^https:\/\/[^\s]+$/.test(value) ? value : "";
  return {
    id: String(raw._id), tmdb_id: Number(raw.tmdb_id) || 0, title: String(raw.title || "Untitled movie"),
    year: Number(raw.year) || 0, genres: Array.isArray(raw.genres) ? raw.genres.map(String) : [],
    rating: Number(raw.rating) || 0,
    poster_url: raw.poster_file_id ? "/api/poster/" + String(raw._id) + "?v=" + encodeURIComponent(String(raw.poster_file_unique_id || "")) : safeImage(raw.poster_url),
    backdrop_url: raw.poster_file_id ? "/api/poster/" + String(raw._id) + "?v=" + encodeURIComponent(String(raw.poster_file_unique_id || "")) : safeImage(raw.backdrop_url),
    season: 0, day: 0, kind: "movie", caption: String(raw.caption || ""),
    duration_seconds: Math.max(0, Number(raw.duration_seconds) || 0), language: String(raw.language || "Unknown"),
    description: String(raw.description || ""), uploaded_at: raw.uploaded_at instanceof Date ? raw.uploaded_at.toISOString() : raw.uploaded_at ? String(raw.uploaded_at) : null,
    views: Number(raw.views) || 0, file_count: files.length, hasPoster: Boolean(raw.poster_url || thumbnailFileId(raw)),
    files, cast: [],
  };
}

export type MovieQuery = { search?: string; kind?: "episode" | "promo" | "highlight"; language?: string; genre?: string; year?: number; sort?: "latest" | "popular" | "title"; page?: number; limit?: number };

export async function findMovies(input: MovieQuery = {}) {
  const collection = await getMovieCollection();
  const filter: Document = { ...hollywoodFilter };
  if (input.language && input.language !== "All") filter.language = input.language;
  if (input.genre?.trim()) filter.genres = input.genre.trim().slice(0, 80);
  if (Number.isInteger(input.year) && input.year! >= 1900 && input.year! <= 2100) filter.year = input.year;
  if (input.search?.trim()) {
    const escaped = input.search.trim().slice(0, 80).replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
    filter.title = { $regex: escaped, $options: "i" };
  }
  const page = Math.max(1, Math.min(10000, Math.floor(Number(input.page) || 1)));
  const limit = Math.max(1, Math.min(60, Math.floor(Number(input.limit) || 24)));
  const sort: Sort = input.sort === "popular" ? { views: -1, _id: -1 } : input.sort === "title" ? { title: 1, _id: -1 } : { uploaded_at: -1, _id: -1 };
  const [results, count] = await Promise.all([
    collection.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).toArray(),
    collection.countDocuments(filter),
  ]);
  const normalized = results.map(normalize);
  const movies = normalized;
  return { movies, count, page, limit, totalPages: Math.ceil(count / limit) };
}

export async function findMovie(id: string): Promise<Movie | null> {
  const raw = await getRawMovie(id);
  return raw ? normalize(raw) : null;
}

export async function getRawMovie(id: string): Promise<Document | null> {
  if (!ObjectId.isValid(id) || id.length !== 24) return null;
  return (await getMovieCollection()).findOne({ ...hollywoodFilter, _id: new ObjectId(id) });
}

export async function findRelatedMovies(movie: Movie, limit = 12): Promise<Movie[]> {
  const filter: Document = { ...hollywoodFilter, _id: { $ne: new ObjectId(movie.id) } };
  if (movie.genres.length) filter.genres = { $in: movie.genres.slice(0, 3) };
  const collection = await getMovieCollection();
  let rows = await collection.find(filter).sort({ views: -1, uploaded_at: -1 }).limit(limit).toArray();
  if (!rows.length && movie.genres.length) rows = await collection.find({ ...hollywoodFilter, _id: { $ne: new ObjectId(movie.id) } }).sort({ uploaded_at: -1 }).limit(limit).toArray();
  return rows.map(normalize);
}

export async function listLanguages(): Promise<string[]> {
  return (await (await getMovieCollection()).distinct("language", hollywoodFilter)).filter((x): x is string => typeof x === "string").sort();
}

export async function catalogFilters() {
  const col = await getMovieCollection();
  const [genres, years] = await Promise.all([col.distinct("genres", hollywoodFilter), col.distinct("year", hollywoodFilter)]);
  return { genres: genres.filter((g): g is string => typeof g === "string").sort(), years: years.filter((y): y is number => Number.isInteger(y)).sort((a, b) => b - a) };
}
