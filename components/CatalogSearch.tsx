"use client";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function CatalogSearch() {
  const search = useSearchParams().get("search") || "";
  return <form action="/" role="search" className="catalog-search" id="catalog-search">
    <button type="submit" aria-label="Search movies"><Search size={21} aria-hidden="true"/></button>
    <input key={search} type="search" name="search" defaultValue={search} aria-label="Search movies by title" placeholder="Search movies…" maxLength={80} enterKeyHint="search" autoComplete="off"/>
    {search && <Link href="/" aria-label="Clear search"><X size={19} aria-hidden="true"/></Link>}
  </form>;
}
