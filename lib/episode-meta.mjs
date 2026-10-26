// Shared by the website and the metadata importer. No network or database access.
export const SEASON = 10;
export const EPISODE_KINDS = ['episode', 'promo', 'highlight'];

// Older /biggboss uploads predate the website's explicit season/kind fields.
// Only admit those identified by BOTH bot markers; never widen to all records.
export function episodeFilter(kind) {
  const filter = { $or: [
    { season: SEASON },
    { season: { $exists: false }, content_type: 'biggboss', show: 'Bigg Boss Tamil' },
  ] };
  if (kind === 'episode') filter.$and = [{ $or: [{ kind: 'episode' }, { kind: { $exists: false } }] }];
  else if (EPISODE_KINDS.includes(kind)) filter.kind = kind;
  return filter;
}

export function episodeDay(raw) {
  const day = Number(raw.day);
  if (raw.day !== undefined && raw.day !== null && raw.day !== '' && Number.isInteger(day) && day >= 0 && day <= 400) return day;
  const match = String(raw.title || '').match(/(?:\bday\s*[-:#]?\s*|நாள்\s*[-:#]?\s*)(\d{1,3})(?!\d)/i);
  const inferred = match ? Number(match[1]) : 0;
  return inferred <= 400 ? inferred : 0;
}
export function qualityLabel(file) {
  const text = String(file.quality || file.display_name || file.file_name || '');
  const match = text.match(/(?:^|[^\d])(2160|1440|1080|720|576|480|360|240)p?(?!\d)/i);
  if (match) return `${match[1]}p`;
  if (/\b4k\b/i.test(text)) return '2160p';
  return String(file.quality || file.display_name || file.file_name || 'Original');
}
export function thumbnailFileId(raw) {
  const candidates = [raw.thumbnail_file_id, raw.poster_file_id, raw.thumbnail?.file_id,
    ...(Array.isArray(raw.files) ? raw.files.flatMap(file => [file.thumbnail_file_id, file.thumbnail?.file_id, file.thumb?.file_id]) : [])];
  return candidates.find(id => typeof id === 'string' && id.trim())?.trim() || '';
}
export function validateEpisode(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected one episode object.');
  if (input.season !== SEASON) throw new Error('Only season 10 is accepted.');
  if (!EPISODE_KINDS.includes(input.kind)) throw new Error('kind must be episode, promo or highlight.');
  if (typeof input.episode_key !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,99}$/.test(input.episode_key)) throw new Error('episode_key must be a stable lowercase key, such as day-21-full.');
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 300) throw new Error('A title up to 300 characters is required.');
  if (!Number.isInteger(input.day) || input.day < 0 || input.day > 400) throw new Error('day must be an integer between 0 and 400.');
  if (!Array.isArray(input.files) || !input.files.length || input.files.length > 20) throw new Error('Supply between 1 and 20 quality files.');
  const keys = new Set();
  for (const file of input.files) {
    if (!file || typeof file !== 'object' || typeof file.file_name !== 'string' || !file.file_name.trim()) throw new Error('Each file needs file_name.');
    if (!/^(2160|1440|1080|720|576|480|360|240)p$/.test(file.quality || '')) throw new Error('Each file needs an explicit quality, such as 720p.');
    if (keys.has(file.quality)) throw new Error('Only one file per quality is allowed in an episode.');
    keys.add(file.quality);
  }
  if (input.duration_seconds !== undefined && (!Number.isFinite(input.duration_seconds) || input.duration_seconds < 0)) throw new Error('duration_seconds must be nonnegative.');
  return input;
}

