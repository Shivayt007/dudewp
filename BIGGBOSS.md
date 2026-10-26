# Dude — Bigg Boss Tamil Season 10

This branch is a dedicated Season 10 website. Deploy the `biggboss-season-10` branch as a separate EasyPanel service if the existing movie site should stay online. The Dockerfile, Next.js stack, browser Movi player, signed stream links and download relay are retained. No dependency changes.

## Setup

Use the same MongoDB database and FileToLink signing settings as your current site. Add:

```env
BIGGBOSS_COLLECTION=biggboss_episodes
```

The application always uses this collection (default `biggboss_episodes`) and filters reads and view updates to `season: 10`. `MONGODB_COLLECTION` no longer selects the website's data. Keep the collections separate. Do not change your movie bot's existing movies collection.

Set `TELEGRAM_POSTER_BOT_TOKEN` to the bot that received the video thumbnail or poster. File IDs from an unrelated bot may not work. `TELEGRAM_BOT_TOKEN` / `BOT_TOKEN` are existing fallbacks. `POSTER_SOURCE_BASE_URL` can still serve legacy `poster_filename` images. Credentials stay on the server.

## One episode, three qualities

Store one record per stable `episode_key`, such as `day-21-full`, with `season: 10`, `kind: "episode"`, `day: 21`, `title`, `caption`, `duration_seconds`, and a `files` array. Each array item holds one uploaded video, its explicit `quality` (`480p`, `720p`, `1080p`, etc.), `file_name`, `file_size`, `mime_type`, and the existing FileToLink metadata. The website does not create missing qualities or transcode videos.

An example is in `examples/biggboss-episode.json`. Replace all sample links, hashes, thumbnail IDs, captions and durations before import. An existing bot can write this schema directly. Otherwise import metadata from the server:

```bash
node --env-file=.env.local scripts/import-biggboss.mjs examples/biggboss-episode.json
```

Requires Node 22+ and the existing npm dependencies (`npm ci`). The importer creates the collection/indexes on first write. It merges files atomically by explicit quality, keeps existing file indexes stable, replaces an existing quality instead of duplicating it, and appends new qualities. Run again with the same `episode_key` and just a new 1080p file to attach it to the same episode. Use a different key for a different episode or clip. `kind` must be `episode`, `promo`, or `highlight`. For promos use unique keys such as `day-21-promo-1`; the same day may have many clips.

Use permanent source links with `?hash=` or `dump_msg_id` + `file_hash`; temporary signed URLs are generated when watched. The origin must match `TEMP_LINK_BASE_URL`. Never store a bot token in an episode document. The public website has no unauthenticated upload endpoint. This branch does not modify `ads/main14` or install Telegram bot commands; that bot must write the schema above to feed this collection.

## Video thumbnails

Yes, the video clip's thumbnail can be displayed without loading the entire video. When saving a Telegram video, save `message.video.thumbnail.file_id` (Pyrogram: `message.video.thumbs[-1].file_id` when available) as `thumbnail_file_id`. For a document upload, save the available document thumbnail ID. The thumbnail must be accessible by the configured poster bot. An explicitly uploaded poster can be saved as `poster_file_id` instead.

Lookup order: episode `thumbnail_file_id`, episode `poster_file_id`, episode `thumbnail.file_id`, then each quality's `thumbnail_file_id`, `thumbnail.file_id` or legacy `thumb.file_id`. The existing image proxy retrieves only that small image, validates the image bytes and caches successful responses for five minutes. If no accessible thumbnail exists, the UI shows a Bigg Boss fallback. It does not seek the full video or run FFmpeg to create a frame.

## Viewing

- Home: latest full episode, Season 10 catalog, title search, All / Full episodes / Promos / Highlights filters, pagination and a separate promos/highlights section.
- Each card links to one episode detail page; captions are displayed as plain text.
- Detail: landscape thumbnail, caption, duration, and Watch / Download actions for every available quality.
- Player: quality selector with file sizes, browser multitrack audio/subtitle controls and remembered episode position shared across quality changes.
- Existing `/movie/:id`, `/watch/:id`, `/api/poster/:id`, `/api/media/:id/:index`, `/api/stream/:id/:index` and `/api/download/:id/:index` paths are retained, scoped to the new collection. `/api/movies?kind=promo` remains as a compatibility catalog API.

The supplied reference defines the dark/lime Dude visual style; the page uses your real thumbnails rather than invented episode artwork. No sample episodes are automatically inserted. Season 10 is fixed, so the reference's Season 1 dropdown is replaced with a Season 10 label.

## Checks

```bash
npm run lint
npm run build
node tests/episodes.test.mjs
npm run test:links
node tests/streaming.test.mjs
```

Production playback and Telegram thumbnail retrieval require your deployed database, bot token and real FileToLink sources. They cannot be verified with the placeholder example.

### Validation performed for this branch

- Production Next.js build and TypeScript checks passed.
- Episode metadata, existing signed-link generator and streaming relay tests passed.
- A temporary MongoDB verified one-document imports, adding/replacing qualities, stable file indexes and concurrent updates. API checks verified collection/season isolation, kind filters, hidden source metadata and signed links for the selected quality.
- Chromium checks at 390, 768 and 1440 pixels verified no horizontal overflow, episode/detail layouts, search, filters, menu, quality/download targets, pagination and the empty state. Screenshots used temporary test records with fallback thumbnails; these records are not included in the branch or written to your database.
- Production Telegram thumbnails and actual audio/video decoding remain unverified without your real configured sources. The screenshot reference was followed directly; the design skill's separate inspector scripts were unavailable, so the layout was checked in Chromium instead.
