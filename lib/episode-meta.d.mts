export const SEASON: 10;
export const EPISODE_KINDS: string[];
export function episodeFilter(kind?: string): Record<string, any>;
export function episodeDay(raw: Record<string, any>): number;
export function qualityLabel(file: Record<string, unknown>): string;
export function thumbnailFileId(raw: Record<string, any>): string;
export function validateEpisode(input: unknown): Record<string, any>;

