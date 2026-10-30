// Exercise the actual TypeScript catalog and views route with a fake database.
// No credentials, Telegram requests, or live MongoDB writes are used.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Module, createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as metadata from '../lib/episode-meta.mjs';

const require = createRequire(import.meta.url);
const id = index => String(index).padStart(24, '0');
const files = ['480p', '720p', '1080p'].map(quality => ({ quality, file_name: `episode-${quality}.mp4`, file_size: 1000 }));
const legacy = { _id: id(1), content_type: 'hollywood', published: true, title: 'The Matrix', year: 1999, genres: ['Action', 'Science Fiction'], poster_url: 'https://image.tmdb.org/t/p/w500/poster.jpg', backdrop_url: 'https://image.tmdb.org/t/p/original/backdrop.jpg', files, language: 'English' };
const modern = { ...legacy, _id: id(2), title: 'Interstellar', year: 2014 };
const promo = { ...legacy, _id: id(3), title: 'Arrival', year: 2016, genres: ['Drama'] };
const wrongSeason = { ...legacy, _id: id(4), content_type: 'biggboss' };
const unrelated = { ...legacy, _id: id(5), published: false };
const fixtures = [legacy, modern, promo, wrongSeason, unrelated];

function matches(doc, query) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '$or') return value.some(condition => matches(doc, condition));
    if (key === '$and') return value.every(condition => matches(doc, condition));
    const actual = key.split('.').reduce((obj, part) => obj?.[part], doc);
    if (value && typeof value === 'object' && '$exists' in value) return (actual !== undefined) === value.$exists;
    if (value && typeof value === 'object' && '$regex' in value) return new RegExp(value.$regex, value.$options).test(doc[key] || '');
    return Array.isArray(actual) ? actual.includes(value) : String(actual) === String(value);
  });
}

const collection = {
  find(query) {
    let rows = fixtures.filter(doc => matches(doc, query));
    const cursor = { sort() { return cursor; }, skip(n) { rows = rows.slice(n); return cursor; },
      limit(n) { rows = rows.slice(0, n); return cursor; }, async toArray() { return rows; } };
    return cursor;
  },
  async countDocuments(query) { return fixtures.filter(doc => matches(doc, query)).length; },
  async findOne(query) { return fixtures.find(doc => matches(doc, query)) || null; },
  async distinct(key, query) { return [...new Set(fixtures.filter(doc => matches(doc, query)).map(doc => doc[key]))]; },
  async updateOne(query) { return { matchedCount: fixtures.some(doc => matches(doc, query)) ? 1 : 0 }; },
};

async function loadTs(relative) {
  const filename = fileURLToPath(new URL(relative, import.meta.url));
  const source = await readFile(filename, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = new Module(filename);
  module.filename = filename;
  module.require = specifier => {
    if (specifier === 'server-only') return {};
    if (specifier === './mongodb' || specifier === '@/lib/mongodb') return { getMovieCollection: async () => collection };
    if (specifier.endsWith('episode-meta.mjs')) return metadata;
    if (specifier === './models') return { qualityLabel: metadata.qualityLabel, formatSize: () => '1000 B', fileFormat: () => 'native' };
    return require(specifier);
  };
  module._compile(compiled.outputText, filename);
  return module.exports;
}

const catalog = await loadTs('../lib/movies.ts');
const all = await catalog.findMovies();
assert.equal(all.count, 3);
assert.deepEqual(all.movies.map(doc => doc.id), [id(1), id(2), id(3)]);
const episodes = await catalog.findMovies({ search: 'Matrix' });
assert.equal(episodes.count, 1);
assert.equal(episodes.movies[0].year, 1999);
assert.equal(episodes.movies[0].title, legacy.title);
assert.equal(episodes.movies[0].backdrop_url, legacy.backdrop_url);
assert.deepEqual(episodes.movies[0].files.map(file => file.quality), ['480p', '720p', '1080p']);
assert.equal((await catalog.findMovies({ genre: 'Drama' })).count, 1);
assert.equal((await catalog.findMovies({ year: 2014 })).count, 1);
assert.equal((await catalog.findMovies({ search: '.*' })).count, 0);
assert.equal((await catalog.findMovie(id(1))).files.length, 3);
assert.equal((await catalog.getRawMovie(id(1))).files[2].quality, '1080p');
assert.equal(await catalog.findMovie(id(4)), null);
assert.equal(await catalog.getRawMovie(id(5)), null);
assert.equal(await catalog.findMovie('bad-id'), null);
assert.deepEqual(await catalog.listLanguages(), ['English']);
const views = await loadTs('../app/api/views/[id]/route.ts');
for (const [index, status] of [[1, 204], [2, 204], [4, 404], [5, 404]]) {
  assert.equal((await views.POST(new Request('http://localhost'), { params: Promise.resolve({ id: id(index) }) })).status, status);
}
assert.equal(metadata.episodeDay({ title: 'தமிழ் நாள் 23' }), 23);
assert.equal(metadata.episodeDay({ title: 'Day 21', day: 25 }), 25);
assert.equal(metadata.episodeDay({ title: 'Day 999' }), 0);
console.log('Hollywood catalog: grouped qualities, title/year/genre filters, published-only access, Bigg Boss exclusion, posters and view scope passed.');
