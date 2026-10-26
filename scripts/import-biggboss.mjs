// Metadata only: does not upload, transcode, or download the video itself.
import { readFile } from 'node:fs/promises';
import { MongoClient } from 'mongodb';
import { validateEpisode } from '../lib/episode-meta.mjs';
import { parseFileUrl } from '../lib/temp-links.mjs';
const path = process.argv[2];
let client;
try {
  if (!path) throw new Error('Usage: node --env-file=.env.local scripts/import-biggboss.mjs episode.json');
  const input = validateEpisode(JSON.parse(await readFile(path, 'utf8')));
  const files = input.files.map(file => {
    const source = ['source_link', 'stream_link', 'download_link', 'cache_link'].map(k => file[k]).find(link => parseFileUrl(link));
    const legacy = /^\d+$/.test(String(file.dump_msg_id || '')) && typeof file.file_hash === 'string' && file.file_hash;
    if (!source && !legacy) throw new Error(`${file.quality}: supply a valid FileToLink link with ?hash= from TEMP_LINK_BASE_URL, or dump_msg_id + file_hash.`);
    return {
      quality: file.quality, display_name: file.quality, file_name: file.file_name,
      file_size: Math.max(0, Number(file.file_size) || 0), mime_type: String(file.mime_type || 'video/mp4'),
      ...(source ? { source_link: source } : { dump_msg_id: String(file.dump_msg_id), file_hash: file.file_hash }),
      ...(file.thumbnail_file_id ? { thumbnail_file_id: String(file.thumbnail_file_id) } : {}),
    };
  });
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) throw new Error('Set MONGODB_URI and MONGODB_DB.');
  const collectionName = process.env.BIGGBOSS_COLLECTION || 'biggboss_episodes';
  if (collectionName === (process.env.MONGODB_COLLECTION || 'movies')) throw new Error('BIGGBOSS_COLLECTION must be separate from the movies collection.');
  client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const collection = client.db(process.env.MONGODB_DB).collection(collectionName);
  await collection.createIndex({ season: 1, episode_key: 1 }, { unique: true });
  await collection.createIndex({ season: 1, kind: 1, day: -1, uploaded_at: -1 });
  const metadata = {
    season: 10, episode_key: input.episode_key, day: input.day, kind: input.kind,
    title: input.title.trim(), language: String(input.language || 'Tamil'), updated_at: new Date(),
  };
  for (const field of ['caption', 'duration_seconds', 'thumbnail_file_id', 'poster_file_id', 'poster_filename']) {
    if (input[field] !== undefined) metadata[field] = input[field];
  }
  // One atomic merge. Existing qualities keep their indexes; replacing 720p must
  // not turn a previously copied ?file=1 URL into a different quality.
  // $literal prevents captions beginning with "$" being treated as expressions.
  const record = await collection.findOneAndUpdate({ season: 10, episode_key: input.episode_key }, [{ $set: {
    ...Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, { $literal: value }])),
    uploaded_at: { $ifNull: ['$uploaded_at', '$$NOW'] }, views: { $ifNull: ['$views', 0] },
    files: { $let: { vars: { existing: { $ifNull: ['$files', []] }, incoming: { $literal: files } }, in: {
      $concatArrays: [
        { $map: { input: '$$existing', as: 'old', in: { $let: { vars: { replacement: { $filter: { input: '$$incoming', as: 'new', cond: { $eq: ['$$new.quality', '$$old.quality'] } } } }, in: { $ifNull: [{ $arrayElemAt: ['$$replacement', 0] }, '$$old'] } } } } },
        { $filter: { input: '$$incoming', as: 'new', cond: { $not: [{ $in: ['$$new.quality', { $map: { input: '$$existing', as: 'old', in: '$$old.quality' } }] }] } } },
      ],
    } } },
  } }], { upsert: true, returnDocument: 'after' });
  console.log(`Saved ${record._id}: ${record.title} (${record.files.map(f => f.quality).join(', ')}).`);
} catch (error) {
  // Database errors can contain connection details. Keep diagnostics bounded.
  console.error(error?.name === 'Error' || error instanceof SyntaxError ? error.message : `Import failed (${error?.name || 'unknown'}). Check database access and schema.`);
  process.exitCode = 1;
} finally { await client?.close(); }
