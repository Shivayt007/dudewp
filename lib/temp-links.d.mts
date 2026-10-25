export declare function generateTempToken(fileId: string, options?: { secret?: string; expiration?: number }): string;
export declare function parseFileUrl(source: unknown): { fileId: string; secureHash: string; origin: string } | null;
export declare function buildTempUrl(fileId: string, secureHash: string, origin?: string): string;
export declare function tempUrlForFile(fileDoc: Record<string, unknown>): string;
