import HomeCinema from "@/components/HomeCinema";
import { findMovies, catalogFilters } from "@/lib/movies";
export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const value = (key: string) => typeof query[key] === "string" ? query[key] as string : "";
  const search = value("search").slice(0, 80), genre = value("genre").slice(0, 80);
  const year = Number(value("year")) || undefined;
  const sort = value("sort") === "popular" ? "popular" : value("sort") === "title" ? "title" : "latest";
  const page = Math.max(1, Math.floor(Number(value("page")) || 1));
  try {
    const [catalog, recent, popular, filters] = await Promise.all([
      findMovies({ search, genre, year, sort, page }),
      findMovies({ limit: 60 }), findMovies({ sort: "popular", limit: 12 }), catalogFilters(),
    ]);
    return <HomeCinema catalog={catalog} recent={recent.movies} popular={popular.movies} filters={filters}
      query={{ search, genre, year: year || 0, sort, page }} />;
  } catch {
    return <section className="shell home-error"><h1>The collection is taking a break.</h1><p>We couldn’t connect right now. Please try again shortly.</p><a className="action action-primary" href="/">Try again</a></section>;
  }
}
