# DUDE Movies — Next.js MongoDB Streaming Website

A responsive Next.js 16 / React 19 / TypeScript movie catalog with a custom player and secure, on-demand temporary TgLink URL generation. This is a **separate website application**. It connects **directly to your existing MongoDB**, so you do not need to deploy or change the Android FastAPI API for the website.

## What works

- Home catalog with featured movie, latest/popular/title sort, title search, language filters and pagination
- Movie pages with title, language, description, poster, view count, and all `files[]` variants
- Dedicated theater watch page with quality/version picker, play/pause, ±10 sec seeking, timeline, volume, audio language selection where supported, left-side vertical swipe for video-only brightness, right-side vertical swipe for volume where allowed by the browser, playback speed, keyboard shortcuts, double-click left/right skipping, fullscreen, PiP, .srt/.vtt external subtitle picker, resume position, link refresh and download
- Uses direct native `<video>` for progressive MP4/WebM; Shaka Player for `.m3u8`/`.mpd` HLS/DASH inputs
- `POST /api/media/:movieId/:fileIndex` creates a new signed URL only when playback starts/refreshes, using the **supplied Python `temp_links.py` reference format**
- `GET /api/download/:movieId/:fileIndex` creates a fresh signed URL and redirects without transferring GBs through Next.js
- `GET /api/poster/:movieId` uses `TELEGRAM_POSTER_BOT_TOKEN` (preferred) or `TELEGRAM_BOT_TOKEN` to fetch the Telegram `poster_file_id` securely; shows attractive poster fallback otherwise
- `GET /api/movies`, `GET /api/health`, `POST /api/views/:movieId`
- Secrets never returned in HTML, lists, or client bundles
- Dockerfile with standalone output for deployment on EasyPanel / Docker / VPS
- No seed movies, mock records, schema migration, or changes to existing documents

## 1. Environment variables

Copy `.env.example` to `.env.local` for local development, or add the same variables in EasyPanel's Environment panel.

```dotenv
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=movie_wallet
MONGODB_COLLECTION=movies
TEMP_LINK_SECRET=YOUR_DEPLOYED_TGLINK_SIGNING_SECRET
TEMP_LINK_BASE_URL=https://telegram.tglink.space
TEMP_LINK_EXPIRY_SECONDS=5600
TELEGRAM_POSTER_BOT_TOKEN=poster_uploading_bot_token
TELEGRAM_BOT_TOKEN=optional_fallback_bot_token
```

`MONGODB_DB` and `MONGODB_COLLECTION` must match **your actual existing names**. The demo `movie_wallet` is only an example. If your URI password has `@`, `#`, or other reserved characters, percent-encode them. Keep MongoDB and bot tokens strictly server-side. Never use `NEXT_PUBLIC_` for secrets.

The signing key must exactly match the one configured on your deployed TgLink service. Keep it private in EasyPanel environment variables and never commit it into GitHub. The supplied reference uses an expiration of 5600 seconds. `TEMP_LINK_BASE_URL` must be the same origin as the MongoDB stored stream links. For safety, records pointing to another host will not be signed. Keep these URLs HTTPS.

## 2. Run on a laptop

Requires Node.js 22+ and access to npm registry.

```bash
npm install
npm run test:links
npm run dev
```

Visit `http://localhost:3000` and test `http://localhost:3000/api/health`. With the correct MongoDB credentials, the catalog loads real documents.

For production:

```bash
npm run build
npm run start
```

## 3. EasyPanel deployment

1. Create a new App service (not the existing Android API service), choose the Git repository containing this project, and use Dockerfile build.
2. Set container port `3000` and map a separate website domain such as `movies.example.com`.
3. Add the `.env.example` variables with your own MongoDB URI, database name, and collection.
4. Ensure MongoDB network rules permit connections from your VPS IP.
5. Deploy. Visit `/api/health`, then the homepage.

This website will **not conflict** with your existing FastAPI server or Android application. The only intentional DB write is incrementing `views` when a user starts playback. The app otherwise reads the existing `movies` collection.

## 4. Existing MongoDB schema (unchanged)

```json
{
  "_id": "ObjectId(...) (actual BSON ObjectId)",
  "title": "Example Movie",
  "language": "Tamil",
  "description": "Movie description",
  "poster_filename": "example_movie.jpg",
  "poster_file_id": "poster Telegram file ID",
  "poster_msg_id": 123456,
  "uploaded_at": "BSON Date",
  "views": 150,
  "file_count": 2,
  "files": [
    {
      "file_name": "Movie.1080p.mkv",
      "display_name": "Movie 1080p",
      "file_size": 2147483648,
      "file_size_readable": "2.00 GB",
      "mime_type": "video/x-matroska",
      "file_id": "Telegram media file ID",
      "file_unique_id": "Telegram unique ID",
      "dump_msg_id": 4330196,
      "stream_link": "https://telegram.tglink.space/watch/4330196/Movie.1080p.mkv?hash=ABC123",
      "download_link": "same stable source URL",
      "cache_link": "same stable source URL"
    }
  ]
}
```

The backend pulls the message ID from `/watch/4330196/...` and takes the **existing** `?hash=ABC123` from the stable source link. It creates a time-limited token signed with `HMAC-SHA256`, then returns:

```text
https://telegram.tglink.space/4330196?hash=ABC123&temp_token=<new URL-safe signed token>
```

The token fields, in Python JSON formatting, are `file_id`, `exp`, `salt`. Signing is performed on the Node.js server, so the signing key and MongoDB URI stay private. If source URLs lack their `hash` parameter, the server cannot reconstruct that hash and returns a useful error. It also supports older records with both `dump_msg_id` and `file_hash`.

**Note:** `file_id` is the *Telegram media file id*, not the stream path id. The stream token `file_id` here is the **dump message id extracted from the stable URL**, as in your uploaded reference file.

## 5. Browser player: Movi Player 0.4.1

The watch page uses [movi-player](https://github.com/MrUjjwalG/movi-player) to demux original MKV/MP4 streams in the viewer's browser using FFmpeg WASM and WebCodecs. Embedded audio and subtitle tracks appear in Movi's settings, with track switching and subtitles Off. Its subtitle menu also loads local subtitle files. The player includes seeking, speed, volume, fullscreen and supported PiP controls. The website retains video-version selection, downloads, resume position and view counting.

`npm run dev` and `npm run build` prepare pinned, same-origin player assets under `public/vendor/movi-player/0.4.1/`. The slim JavaScript module and `movi.wasm` are copied from the installed npm package; no player CDN is required. Docker copies these generated public assets into the runtime image. Keep HTTPS enabled in production for WebCodecs. The first playback loads the WASM engine, and codec performance varies by browser and device.

The player requests `POST /api/media/:id/:index?engine=movi`. This returns the freshly signed **original** stream URL and bypasses the server FFmpeg bridge even if an older deployment still has `ENABLE_MKV_HLS=true`. Leave that variable `false` for browser playback. The legacy HLS endpoints remain available to existing callers without `engine=movi`; the new watch page does not invoke them or extract subtitle files on the VPS. Stored movie files and database links are unchanged.

### Source requirements and limits

- TgLink must accept browser CORS requests, including HEAD and GET, and byte ranges. For reliable seeking, return `206 Partial Content`, correct `Content-Range` / `Content-Length`, and expose `Content-Range`, `Content-Length`, `Accept-Ranges` and `Content-Type` through CORS. Requests must continue to work on the final redirected URL. These headers must be configured on the FileToLink service; this website cannot fix remote CORS.
- The browser reads stream chunks and container metadata. It does not wait for a complete movie download before playback on a working range source. Metadata/index reads and seeking can request other portions of the file; bandwidth is still required for each viewer. Non-range sources have limited seeking and may require sequential reads.
- Demuxing, audio decoding and subtitle rendering run on the viewer's device. This avoids one server conversion process per viewer; it does not guarantee 100 simultaneous streams on a 4 GB VPS. FileToLink bandwidth, Telegram throughput and each viewer's hardware still determine capacity.
- Selectable tracks must exist in the original file or manifest. Codec and subtitle-format support depends on Movi and the browser; a local MKV smoke test does not establish compatibility with every Telegram movie or phone. Adaptive quality requires an actual multi-bitrate manifest; separate files remain manual versions.
- Download redirects to TgLink, whose `Content-Disposition` controls whether the file downloads or opens in-browser.

### Deploy

Redeploy the `main` branch using the existing Dockerfile. No MongoDB migration or extra FFmpeg setup is needed for Movi. Test a real multi-audio/subtitle movie through the deployed HTTPS site and inspect the FileToLink range/CORS responses if playback fails. Refresh link generates a new signed URL and reloads the player; switching versions and leaving the page dispose the previous player and its requests.

### Validation of this integration

Production build, TypeScript checks and existing temporary-link signing tests pass. A generated H.264/AAC MKV with two audio tracks (English/Tamil) and two embedded SRT subtitle tracks was played in headless Chromium. Both second tracks could be selected, the audio/subtitle menus listed both tracks, version switching left one player instance, and no page JavaScript errors were observed. Desktop and 390px mobile screenshots were inspected, with no horizontal overflow on mobile. Live Telegram URLs and physical Android/iOS devices were not available for this validation.

## Poster fetch fix: Telegram first, legacy static as fallback

The original movie upload bot in `Shivayt007/ads` branch `main14` saves poster images on its own service at `/static/images/posters/<poster_filename>` **in addition to** storing `poster_file_id` in MongoDB. The standalone Next.js website does not automatically have access to the other Docker container's local files. The poster API now attempts Telegram `getFile` first and accepts valid raster image bytes even if Telegram gives a generic content type. It accepts `TELEGRAM_POSTER_BOT_TOKEN`, `TELEGRAM_BOT_TOKEN`, or the original bot's `BOT_TOKEN` environment name.

**If Telegram retrieval still fails despite using the same bot token:** configure `POSTER_SOURCE_BASE_URL` to the absolute URL of your *existing running MovieBot* static poster folder (for example `https://old-movie-site.example/static/images/posters`). The poster proxy then falls back to `<POSTER_SOURCE_BASE_URL>/<poster_filename>` without exposing credentials. The static URL must actually serve images; `poster_msg_id` alone cannot be retrieved using Bot API getFile. Alternatively, re-upload the poster with your current bot and store its new file ID.

A valid `poster_filename` now also causes the UI to request the poster even for older movies with no `poster_file_id`. The API caps downloaded images to 15 MiB and allows only recognized raster image signatures.

`/api/poster/MOVIE_OBJECT_ID?diagnose=1` reports `attempts` such as `getfile-rejected`, `telegram-network-or-response-error`, or `legacy-image-http-error`, and indicates which source worked. It never returns bot tokens or the stored file ID.

## Diagnose posters (no secrets disclosed)

If movie images are blank, open:

```text
https://YOUR_WEBSITE_DOMAIN/api/poster/MOVIE_OBJECT_ID?diagnose=1
```

The response is JSON with `status` and a useful message. For `telegram-bot-token-missing`, set `TELEGRAM_POSTER_BOT_TOKEN` in EasyPanel. For `telegram-getfile-rejected`, the stored `poster_file_id` is not accessible using this bot; use the original uploading bot's token or re-upload the image and update `poster_file_id`. A `poster_msg_id` alone is not sufficient for Telegram Bot API `getFile`. The endpoint never exposes the token itself.

## 6. Production security checklist

The initial build is a functional **public catalog**. For a private catalog, add authentication/authorization to both page routes **and** streaming/download APIs before exposing it publicly. Also implement rate limiting on stream signing, download redirects, view increment and poster requests. Restrict MongoDB database credentials to the minimum required read + `views` update privilege; rotate any signing secret previously exposed in public code in coordination with the deployed TgLink verifier. Only distribute media you have permission to publish.

### Important URLs

| Route | Description |
| --- | --- |
| `/` | Movie catalog, featured movie, filters |
| `/movie/OBJECT_ID` | Movie details, quality and download variants |
| `/watch/OBJECT_ID?file=0` | Advanced player |
| `/api/health` | MongoDB ping |
| `/api/movies?search=...&language=Tamil` | Public-safe catalog JSON |
| `/api/media/OBJECT_ID/0` | `POST` to sign a new stream URL |
| `/api/download/OBJECT_ID/0` | `GET` for new signed download redirect |
| `/api/poster/OBJECT_ID` | Poster proxy |

## Build verification

The included `npm run test:links` checks the source URL parser, field extraction, token signature, expiration, fresh salts, and refusal of foreign hosts. It does not claim to have reached the real TgLink service. Run `npm run build` after dependencies install to confirm your environment's Next.js version and then test real playback with your MongoDB/TgLink data.

## Mobile fixes and deployment verification

- Long source names now wrap inside compact source rows. Watch, Download and movie details cards fit small Android viewport widths. Player controls are compact on mobile, with video versions also reachable under player Settings.
- **Vertical swipe left half** adjusts the rendered video brightness; **vertical swipe right half** adjusts the HTML video volume where allowed. Use the Audio and Subtitle menus to choose available native/manifest tracks; subtitle upload supports `.srt`/`.vtt`.
- If your deployed movie page shows **My watchlist**, **Available sources**, or **Rate this title**, it is not the page served by this GitHub `main` branch. Check the EasyPanel service Git repository, branch, deploy status, domain and browser cache before assessing this update.