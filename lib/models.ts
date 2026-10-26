export type MovieFile = {
  index: number;
  quality: string;
  file_name: string;
  display_name: string;
  file_size: number;
  file_size_readable: string;
  mime_type: string;
  playableHint: "native" | "manifest" | "unknown";
};

export type Movie = {
  id: string;
  title: string;
  season: number;
  day: number;
  kind: "episode" | "promo" | "highlight";
  caption: string;
  duration_seconds: number;
  language: string;
  description: string;
  uploaded_at: string | null;
  views: number;
  file_count: number;
  hasPoster: boolean;
  files: MovieFile[];
};

export type CatalogMovie = Omit<Movie, "files"> & { files: MovieFile[] };

export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Unknown size";
  const unit = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, unit)).toFixed(2)} ${["B", "KB", "MB", "GB", "TB"][Math.min(unit, 4)]}`;
}

export function formatViews(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function fileFormat(name: string, mime: string): MovieFile["playableHint"] {
  const lowered = name.toLowerCase().split("?")[0];
  if (/\.(m3u8|mpd)$/.test(lowered) || /mpegurl|dash\+xml/i.test(mime)) return "manifest";
  if (/\.(mp4|m4v|webm|mov)$/.test(lowered) || /^video\/(mp4|webm|quicktime)/i.test(mime)) return "native";
  return "unknown";
}
