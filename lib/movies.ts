import "server-only";
import { ObjectId, type Document, type Sort } from "mongodb";
import { getMovieCollection } from "./mongodb";
import { fileFormat, formatSize, type Movie, type MovieFile } from "./models";

import { qualityLabel, thumbnailFileId, SEASON } from "./episode-meta.mjs";

function normalize(raw: Document): Movie {
  const items = Array.isArray(raw.files) ? raw.files : [];
  const files: MovieFile[] = items.map((file: Document, index: number) => {
    const file_name = String(file.file_name || "");
    const mime_type = String(file.mime_type || "");
    const file_size = Number(file.file_size) || 0;
    return {
      index,
      quality: qualityLabel(file),
      file_name,
      display_name: qualityLabel(file),
      file_size,
      file_size_readable: String(file.file_size_readable || formatSize(file_size)),
      mime_type,
      playableHint: fileFormat(file_name, mime_type),
    };
  });

  return {
    id: String(raw._id),
    title: String(raw.title || "Untitled episode"),
    season: SEASON,
    day: Math.max(0, Number(raw.day) || 0),
    kind: raw.kind === "promo" || raw.kind === "highlight" ? raw.kind : "episode",
    caption: String(raw.caption || raw.description || ""),
    duration_seconds: Math.max(0, Number(raw.duration_seconds) || 0),
    language: String(raw.language || "Tamil"),
    description: String(raw.description || ""),
    uploaded_at: raw.uploaded_at instanceof Date ? raw.uploaded_at.toISOString() : raw.uploaded_at ? String(raw.uploaded_at) : null,
    views: Number(raw.views) || 0,
    file_count: files.length,
    hasPoster: Boolean(thumbnailFileId(raw) || raw.poster_filename),
    files,
  };
}

export type MovieQuery = {
  search?: string;
  kind?: "episode" | "promo" | "highlight";
  language?: string;
  sort?: "latest" | "popular" | "title";
  page?: number;
  limit?: number;
};

export async function findMovies(input: MovieQuery = {}) {
  const collection = await getMovieCollection();
  const filter: Document = { season: SEASON };
  if (input.kind) filter.kind = input.kind;
  if (input.language && input.language !== "All") filter.language = input.language;
  // Escape search metacharacters and bound the search length.
  if (input.search?.trim()) filter.title = { $regex: input.search.trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  const page = Math.max(1, Math.min(10000, Number(input.page) || 1));
  const limit = Math.max(1, Math.min(60, Number(input.limit) || 24));
  const sort: Sort = input.sort === "popular" ? { views: -1, _id: -1 } : input.sort === "title" ? { title: 1, _id: -1 } : { day: -1, uploaded_at: -1, _id: -1 };
  const [results, count] = await Promise.all([
    collection.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).toArray(),
    collection.countDocuments(filter),
  ]);
  return { movies: results.map(normalize), count, page, limit, totalPages: Math.ceil(count / limit) };
}

export async function findMovie(id: string): Promise<Movie | null> {
  if (!ObjectId.isValid(id) || id.length !== 24) return null;
  const doc = await (await getMovieCollection()).findOne({ _id: new ObjectId(id), season: SEASON });
  return doc ? normalize(doc) : null;
}

export async function getRawMovie(id: string): Promise<Document | null> {
  if (!ObjectId.isValid(id) || id.length !== 24) return null;
  return (await getMovieCollection()).findOne({ _id: new ObjectId(id), season: SEASON });
}

export async function listLanguages(): Promise<string[]> {
  const langs = await (await getMovieCollection()).distinct("language", { season: SEASON });
  return langs.filter((x): x is string => typeof x === "string" && Boolean(x.trim())).sort((a, b) => a.localeCompare(b));
}
