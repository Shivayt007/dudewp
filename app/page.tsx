import HomeCinema from "@/components/HomeCinema";
import { findMovies } from "@/lib/movies";
export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const search = typeof query.search === "string" ? query.search.trim().slice(0, 80) : "";
  const requested = Number(query.page);
  const page = Number.isFinite(requested) ? Math.max(1, Math.min(10000, Math.floor(requested))) : 1;
  try {
    let catalog = await findMovies({ search, page });
    if (catalog.totalPages && page > catalog.totalPages) catalog = await findMovies({ search, page: catalog.totalPages });
    return <HomeCinema catalog={catalog} search={search}/>;
  } catch {
    return <section className="catalog shell catalog-empty" role="alert"><h1>Movies are temporarily unavailable</h1><p>We couldn’t load the catalog. Please try again.</p><a href="/">Try again</a></section>;
  }
}
