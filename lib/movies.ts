import "server-only";
import { ObjectId, type Document, type Sort } from "mongodb";
import { getMovieCollection } from "./mongodb";
import { fileFormat, formatSize, type Movie, type MovieFile } from "./models";

function normalize(raw: Document): Movie {
  const items = Array.isArray(raw.files) ? raw.files : [];
  const files: MovieFile[] = items.map((file: Document, index: number) => {
    const file_name = String(file.file_name || "");
    const mime_type = String(file.mime_type || "");
    const file_size = Number(file.file_size) || 0;
    return {
      index,
      file_name,
      display_name: String(file.display_name || file_name || `File ${index + 1}`),
      file_size,
      file_size_readable: String(file.file_size_readable || formatSize(file_size)),
      mime_type,
      playableHint: fileFormat(file_name, mime_type),
    };
  });

  return {
    id: String(raw._id),
    title: String(raw.title || "Untitled movie"),
    language: String(raw.language || "Unknown"),
    description: String(raw.description || ""),
    uploaded_at: raw.uploaded_at instanceof Date ? raw.uploaded_at.toISOString() : raw.uploaded_at ? String(raw.uploaded_at) : null,
    views: Number(raw.views) || 0,
    file_count: files.length,
    hasPoster: Boolean(raw.poster_file_id || raw.poster_filename),
    files,
  };
}

export type MovieQuery = {
  search?: string;
  language?: string;
  sort?: "latest" | "popular" | "title";
  page?: number;
  limit?: number;
};

export async function findMovies(input: MovieQuery = {}) {
  const collection = await getMovieCollection();
  const filter: Document = {};
  if (input.language && input.language !== "All") filter.language = input.language;
  // Escape search metacharacters and bound the search length.
  if (input.search?.trim()) filter.title = { $regex: input.search.trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  const page = Math.max(1, Math.min(10000, Number(input.page) || 1));
  const limit = Math.max(1, Math.min(60, Number(input.limit) || 24));
  const sort: Sort = input.sort === "popular" ? { views: -1, _id: -1 } : input.sort === "title" ? { title: 1, _id: -1 } : { uploaded_at: -1, _id: -1 };
  const [results, count] = await Promise.all([
    collection.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).toArray(),
    collection.countDocuments(filter),
  ]);
  return { movies: results.map(normalize), count, page, limit, totalPages: Math.ceil(count / limit) };
}

export async function findMovie(id: string): Promise<Movie | null> {
  if (!ObjectId.isValid(id) || id.length !== 24) return null;
  const doc = await (await getMovieCollection()).findOne({ _id: new ObjectId(id) });
  return doc ? normalize(doc) : null;
}

export async function getRawMovie(id: string): Promise<Document | null> {
  if (!ObjectId.isValid(id) || id.length !== 24) return null;
  return (await getMovieCollection()).findOne({ _id: new ObjectId(id) });
}

export async function listLanguages(): Promise<string[]> {
  const langs = await (await getMovieCollection()).distinct("language");
  return langs.filter((x): x is string => typeof x === "string" && Boolean(x.trim())).sort((a, b) => a.localeCompare(b));
}
