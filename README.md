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

## 5. Streaming and format limitations (important)

- **MKV is not generally browser-playable.** A link ending with `.mkv` does not become MP4 simply by attaching a player. If it contains unsupported codecs/audio/video, an Android native player may play it but Chrome/Safari browser playback may fail. Use MP4 (H.264 video + AAC audio) or properly packaged HLS/DASH from your source provider for reliable browser playback. You can still offer MKV download.
- URL signing alone does **not** guarantee successful playback: TgLink needs proper `Content-Type`, HTTP `206 Partial Content` / `Range` seeking, CORS for Shaka HLS/DASH, and the file must have supported codecs. Direct `<video>` downloads may play cross-origin even without CORS if the browser allows the source.
- Shaka provides adaptive quality **only** when the underlying stream provides different bitrates in an HLS/DASH manifest. Separate 720p and 1080p MongoDB `files[]` appear as manual versions, not auto-switch quality.
- A browser cannot natively read every embedded MKV subtitle/audio track. External subtitles (`.srt` and `.vtt`) work with supported video sources; selectable embedded tracks require properly supported formats and/or transcoding. The audio menu lists Shaka HLS/DASH audio languages or native browser `audioTracks` if available. A browser cannot be forced to switch embedded MKV audio tracks that it does not expose. Brightness gestures change only the rendered video brightness, not the phone display backlight; mobile browsers may restrict software volume. Optional MKV transcoding is available only when the server-side FFmpeg bridge is enabled.
- `download` redirects to TgLink. The TgLink server controls `Content-Disposition`, so the remote file might open in-browser instead of forcibly downloading.
- Telegram poster proxy requires a valid bot token that can retrieve the stored `poster_file_id`. Set `TELEGRAM_POSTER_BOT_TOKEN` to the poster-uploading bot token in EasyPanel, or `TELEGRAM_BOT_TOKEN` as a fallback. Open `/api/poster/YOUR_MOVIE_OBJECT_ID` in browser DevTools and read the `X-Poster-Status` response header (`telegram-bot-token-missing`, `telegram-getfile-rejected`, `ok`, etc.). Failure responses use `Cache-Control: no-store` so configuration fixes can be retested immediately. If getFile rejects the ID, verify the bot used to upload the original poster, or reupload and save a new `poster_file_id`. It does **not** fetch by `poster_msg_id` (Telegram Bot API `getFile` accepts a file ID, not an arbitrary message ID).
- No transcoding, DRM licensing, user accounts, or transcoding queue is included in this release.


## FFmpeg is bundled inside the deployed website

**No separate VPS FFmpeg installation is required.** When EasyPanel builds the repository's Dockerfile, the runtime image installs FFmpeg and FFprobe. The Docker build verifies that both executables work. Video processing runs on the VPS, not in the Android browser.

Set `ENABLE_MKV_HLS=true` in EasyPanel → website → Environment, then redeploy the `main` branch. Visit `/api/player-status` and check that `ffmpegBundled`, `ffprobeBundled`, and `readyForMkvProcessing` are all `true`. This verifies binaries and configuration only; playback also depends on the remote source and media codecs.

## Optional VLC-style track switching for MKV via FFmpeg HLS (requires redeploy)

Your MongoDB records typically contain **raw MKV**. Chrome cannot discover or switch arbitrary embedded MKV tracks through the HTML `<video>` element. The website now includes an **opt-in server-side FFmpeg bridge** that remuxes compatible H.264 video (or transcodes unsupported video codecs) and exposes up to six embedded audio languages as separate HLS tracks for Shaka Player. Text-based embedded subtitles (SRT/ASS/WebVTT etc.) can be extracted on demand into WebVTT. Image-based PGS/VobSub tracks are not convertible by this implementation. No MongoDB data is changed.

**To activate:** in EasyPanel → `website` → Environment add `ENABLE_MKV_HLS=true`, then redeploy the updated `main` Dockerfile; it installs `ffmpeg`/`ffprobe` in the runtime image. Without this flag, raw MKV continues through the original direct-link path and embedded audio switching may be unavailable. Browser-based HLS audio switching requires the source to supply multiple audio tracks.

**Resource and streaming limitations:** this is a best-effort **single-process, single-replica** bridge, capped at one active transcoding session on the VPS. It may be CPU intensive and use significant disk space in `/tmp/dude-hls`, especially for lengthy movies or HEVC videos. Sessions are ephemeral, capped at three hours and removed after 20 minutes of inactivity; seeking beyond already-generated HLS segments may not work. Media with external delivery restrictions, expired signed source links, invalid Range support, or incompatible codecs can still fail. It is not a production-ready multi-user transcoding service. For a larger audience, run a separately scalable transcoding/HLS worker with persistent caching and user authorization/rate limiting.

The player selects the manifest returned by `POST /api/media/:id/:index` when the MKV HLS feature is on. It displays language choices and eligible text subtitle streams. Embedded subtitle extraction requires reading the original file and can take time; .srt/.vtt local uploads remain supported independently.

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