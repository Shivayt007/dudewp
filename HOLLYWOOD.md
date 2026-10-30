# DUDE Hollywood bot — separate deployment

Branch: `hollywood-movies`. Existing `main14` Bigg Boss deployments are unchanged.
Deploy this branch as a NEW service with a different Telegram BOT_TOKEN. Reuse
API_ID/API_HASH only if appropriate for your Telegram application. Run one replica.

## Required environment

| Variable | Value |
| --- | --- |
| `MONGO_URI` | Your MongoDB connection URI, server-side only |
| `HOLLYWOOD_DB` | `hollywood_movies` |
| `BOT_TOKEN` | New Hollywood bot token; never the running Bigg Boss token |
| `API_ID`, `API_HASH`, `OWNER_ID` | Telegram app credentials and owner IDs |
| `DUMP_CHANNEL_ID` | Dump channel where the bot can copy/upload files |
| `FILE_TO_LINK_BOT` | Compatible FileToLink service base URL |
| `WEBSITE_URL` | New Hollywood website URL |
| `TMDB_READ_TOKEN` | TMDB API Read Access Token for artwork/movie matching |
| `LEECH_DOWNLOAD_DIR` | `/downloads/hollywood-leech` (persistent volume) |

MongoDB creates the new database/collections on first successful writes; no
production database migration or credential provisioning is performed by this
source change. Both the bot and inherited FastAPI services use HOLLYWOOD_DB.
They reject the existing `moviebot`/Bigg Boss database names. The website uses
the same URI/database and the `movies` collection. It cannot see other databases.
The dump channel must also be readable by the configured FileToLink service.
Use the SAME signing secret/base domain in the Hollywood website as that service.

## Fetching and uploads

- `/hollywoodfetch PAGE_URL [auto|qbittorrent|seedr]`: fetch ALL magnet hrefs on
  this single HTML page, validating BTIH and deduplicating exact hashes.
  Redirects are followed by the existing safe source fetcher. Pagination and
  JavaScript-only pages are not crawled. Existing 2 MB HTML response limit stays.
- Actual torrent metadata determines per-file eligibility, never filename size.
  Only videos with movie title/year are admitted, strictly below 2,000,000,000
  bytes each. Bigg Boss and episode/season files are excluded.
- `/hollywood TITLE (YEAR)`: begin manual quality-file collection. Forward files,
  wait for each added reply, then `/hollywoodpublish` for one final link summary.
  `/hollywoodcancel` stops collecting without deleting uploaded files.
- `/leechstart`, `/leechstop`, `/leechcheck`: optional five-minute checks of the
  saved Hollywood source. A one-off fetch does not turn on automatic checks.
- Three transfer tasks/upload slots. Whole-torrent Seedr space admission,
  qBittorrent metadata admission, fallback, retries, cancellation, cleanup and
  live status controls are retained. Explicit engine selection reroutes only
  inactive queued/waiting records without a cloud folder/cleanup in progress.

## Metadata and publication

Title + year produce the stable movie key. Quality/language/codec produce a
variant key. Atomic MongoDB aggregation merges files without lost updates when
separate quality magnets finish together. Existing same variants are replaced.

TMDB search requires one exact normalized title/year match. Details must identify
an English-original, non-adult movie with a US/GB/CA/AU/NZ production country;
English filename/audio alone never proves Hollywood origin. Certain matches get
poster, backdrop, genres, synopsis, rating and runtime automatically. Backdrops
become the website's featured banner and video preview.

Missing token, API outage, ambiguity or a nonqualifying match leaves uploaded
files in the dump and the movie unpublished for owner review:

- `/hollywoodreview`: up to 15 unpublished movies and their IDs.
- `/hollywoodmatch MOVIE_ID TMDB_ID`: choose a qualifying TMDB movie explicitly.
- `/hollywoodapprove MOVIE_ID`: explicitly attest the movie belongs in this
  Hollywood collection and publish without automatic artwork.
- `/hollywoodbanner MOVIE_ID HTTPS_IMAGE_URL`: manually override its backdrop.

Public Next.js queries and inherited FastAPI read endpoints only return
published Hollywood records. Manual approvals are not undone by later variants.

## Seedr isolation

Use a SEPARATE Seedr account for this bot when Bigg Boss is running. The old bot
and this deployment do not share cross-database storage reservations/worker
leases. Do not connect both to the same 4.5 GB account. Configure SEEDR_EMAIL and
SEEDR_PASSWORD privately, then `/seedrlogin`; qBittorrent works independently.
Existing `/seedrstatus`, `/seedraudit`, `/seedrcleanup`, `/leechworker`,
`/leechstatus`, `/leechqueue`, `/leechresult HASH`, `/leechdelete HASH`,
`/leechretry HASH`, `/usersettings` and `/setcommands` remain available.

## Validation

Offline tests cover >1,000 anchors, strict 2 GB boundaries, no filename-size
trust, movie/episode separation, country-based metadata admission, ambiguous
matches, API outages, atomic file merging, genuine upload receipts and manual
file collection. Live MongoDB/TMDB/Seedr/Telegram validation requires the above
private environment values in the new deployment.

## Website deployment

Select `Shivayt007/dudewp`, branch `hollywood-movies`, as a NEW website service.
Use the existing Dockerfile/build pipeline and set:

```
MONGODB_URI=<same connection URI as Hollywood bot MONGO_URI>
MONGODB_DB=hollywood_movies
TEMP_LINK_BASE_URL=<your working FileToLink domain>
TEMP_LINK_SECRET=<the signing secret used by that FileToLink deployment>
TEMP_LINK_EXPIRY_SECONDS=5600
NEXT_PUBLIC_SITE_NAME=DUDE Hollywood
```

Never expose connection strings/tokens with NEXT_PUBLIC_. Neither the website
nor this branch automatically provisions external hosting or credentials.

The homepage automatically features the latest published movie's backdrop.
Search/year/genre/sort filters preserve selections through pagination. Movie
details show synopsis/metadata and available variants. Watch uses the existing
Movi player, signed links, range relay and browser-side quality selector;
posters/previews are movie-specific, with a built-in cinema fallback.
Review records, Bigg Boss records and records without files are excluded from
catalog, detail/raw-file, poster, view-count and playback queries.

Visual direction: charcoal cinema ground, warm white typography and amber
controls; large backdrop-led feature, restrained poster grid, accessible forms
and responsive 6/4/3/2-column layouts. No sample movie records are inserted.

Verification: TypeScript, production build and offline catalog/streaming/signing
regressions. HTTP rendering and live browser checks require a reachable preview/deployment.
The remote browser cannot connect to the local preview server, so live visual
and real-credential playback checks remain deployment verification steps.
