import Link from "next/link";
import { Search } from "lucide-react";
export default function SiteHeader() {
  return <header className="cinema-header"><div className="shell cinema-nav"><Link href="/" className="cinema-brand" aria-label="DUDE Hollywood home">DUDE<span>HOLLYWOOD</span></Link><nav aria-label="Main navigation"><Link href="/#movies">Discover</Link><Link href="/?sort=latest#movies">New arrivals</Link><Link href="/?sort=popular#movies">Most watched</Link></nav><form action="/" role="search" className="cinema-search"><Search size={17}/><input name="search" aria-label="Search movies" placeholder="Find your next movie" maxLength={80}/><button type="submit">Search</button></form></div></header>;
}
