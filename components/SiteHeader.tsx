import Link from "next/link";
import { Menu, Search } from "lucide-react";
import MobileDock from "./MobileDock";

export default function SiteHeader() {
  return <>
    <header className="cinema-header">
      <div className="shell cinema-nav">
        <Link href="/" className="cinema-brand" aria-label="DUDE Hollywood home"><strong>DUDE</strong><span>HOLLYWOOD</span></Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/">Home</Link><Link href="/#movies">Discover</Link><Link href="/?sort=latest#movies">New</Link><Link href="/?sort=popular#movies">Popular</Link>
        </nav>
        <form action="/" role="search" className="cinema-search"><Search size={18}/><input name="search" aria-label="Search movies" placeholder="Search movies" maxLength={80}/><button type="submit">Search</button></form>
        <a className="header-icon mobile-only" href="/#catalog-search" aria-label="Search movies"><Search size={21}/></a>
        <details className="header-menu"><summary aria-label="Open menu"><Menu size={22}/></summary><nav aria-label="Quick menu"><Link href="/">Home</Link><Link href="/#movies">Browse movies</Link><Link href="/?sort=latest#movies">New arrivals</Link><Link href="/?sort=popular#movies">Most watched</Link></nav></details>
      </div>
    </header>
    <MobileDock/>
  </>;
}
