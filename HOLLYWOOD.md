# Hollywood manual posters and automatic publication

This branch uses your supplied poster. There are no TMDB API requests or token requirements.

## Fetch a movie

Send a Telegram photo (not an image document) with this caption:

```
/fetch https://example.com/movie-page seedr
```

Or send the photo first, then reply to it:

```
/hollywoodfetch https://example.com/movie-page qbittorrent
```

The poster is copied into the dump and saved with each new task from that request.
All magnets on that one page are checked. Use a movie-specific page: all tasks
from that request receive the supplied poster. Existing queued tasks keep their
original poster. Automatic checks of the saved source reuse its supplied poster.

Files are grouped by title/year, and different qualities merge atomically.
Each file must be strictly below 2,000,000,000 bytes.
Only after all selected files in a torrent finish uploading and delivery succeeds
does that task publish its movie entries. Failed/partial new movies stay unpublished.
Separate quality torrents can finish at different times: completed qualities appear
first and later successful qualities join the same movie.

The supplied image is used as poster, homepage banner and video-player preview.
No approval, matching command or TMDB ID is required for new successful tasks.

## Change an existing poster

Reply to your photo with:

```
/hollywoodposter MOVIE_ID
```

This replaces artwork without downloading or uploading the movie again.
For older unpublished records, use /hollywoodreview and /hollywoodapprove MOVIE_ID.
For manually forwarded quality files, start /hollywood TITLE (YEAR) as a reply
to a poster, then forward files; each verified copy publishes automatically.
/hollywoodpublish sends the final summary.

## Deployment

Deploy the hollywood-movies branch in both repos.
Bot: MONGO_URI, HOLLYWOOD_DB=hollywood_movies, new BOT_TOKEN, API_ID, API_HASH,
OWNER_ID, DUMP_CHANNEL_ID, working FILE_TO_LINK_BOT service, WEBSITE_URL.
Website: MONGODB_URI (same server), MONGODB_DB=hollywood_movies,
TEMP_LINK_BASE_URL and matching TEMP_LINK_SECRET.

Add TELEGRAM_POSTER_BOT_TOKEN to the WEBSITE environment. Its value must be the
Hollywood bot's BOT_TOKEN, because Telegram file IDs belong to the receiving bot.
The server proxies the image; the token never appears in image URLs or client JS.
Existing TELEGRAM_BOT_TOKEN with that same token is also supported.

TMDB_READ_TOKEN can be removed from both deployments. Previously saved metadata
and artwork remain stored until you replace them. Bigg Boss branches/databases are unchanged.
