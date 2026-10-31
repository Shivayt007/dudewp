import Link from "next/link";
import { Suspense } from "react";
import CatalogSearch from "./CatalogSearch";

export default function SiteHeader() {
  return <header className="catalog-header"><div className="shell catalog-nav">
    <Link href="/" className="catalog-brand" aria-label="DUDE Hollywood home"><strong>DUDE</strong><span>HOLLYWOOD</span></Link>
    <Suspense fallback={<form action="/" role="search" className="catalog-search"><input name="search" aria-label="Search movies" placeholder="Search movies…"/><button type="submit" aria-label="Search movies">Search</button></form>}><CatalogSearch/></Suspense>
  </div></header>;
}
