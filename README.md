# DUDE Hollywood — Movie website

Next.js Hollywood catalog for the DUDE Telegram bot's `hollywood-movies` branch.
Uses the separate `hollywood_movies.movies` collection and only displays
published Hollywood records with uploaded files.

- Latest movie backdrop automatically becomes the homepage banner.
- Movie posters, synopsis, genres, rating and runtime from matched TMDB metadata.
- Search, genre/year filters, sorting and pagination.
- Movie detail pages and the existing Movi player with quality selection,
  fresh signed file URLs, seeking and range relay.
- Mobile/desktop charcoal and amber design with movie-specific video previews.

[Environment, deployment and bot workflow](HOLLYWOOD.md).

```
npm ci
npm run build
npm start
```

Set MONGODB_URI and MONGODB_DB=hollywood_movies on the server. Match
TEMP_LINK_BASE_URL and TEMP_LINK_SECRET to the working FileToLink deployment.
No credentials belong in NEXT_PUBLIC_ variables. Run this as a new website,
leaving the existing Bigg Boss deployment on its original branch/database.

Checks: `npx tsc --noEmit`, `npm run build`, and Node tests in `tests/`.
