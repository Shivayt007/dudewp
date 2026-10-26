export const SEASON: 10;
export const EPISODE_KINDS: string[];
export function qualityLabel(file: Record<string, unknown>): string;
export function thumbnailFileId(raw: Record<string, any>): string;
export function validateEpisode(input: unknown): Record<string, any>;
