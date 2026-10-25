"use client";
import Link from "next/link";
import { Clapperboard, Search, Menu, X, Github } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function SiteHeader() {
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  return (
    <header className="site-header"><div className="shell header-inner">
      <Link href="/" className="brand" aria-label="Dude Movies Home"><span className="brand-symbol"><Clapperboard size={21} strokeWidth={2.3}/></span><span>DUDE<span className="brand-accent">.</span></span></Link>
      <nav className={`main-nav ${menu ? "main-nav-open" : ""}`} aria-label="Main navigation">
        <Link href="/" className={pathname === "/" ? "selected" : ""} onClick={() => setMenu(false)}>Discover</Link>
        <Link href="/?sort=latest" onClick={() => setMenu(false)}>New Releases</Link>
        <Link href="/?sort=popular" onClick={() => setMenu(false)}>Trending</Link>
      </nav>
      <div className="header-end"><form className="header-search" action="/" role="search"><Search size={17}/><input name="search" placeholder="Search movies..." aria-label="Search movies" /></form><button className="menu-toggle" onClick={() => setMenu(!menu)} aria-label="Toggle navigation">{menu ? <X/> : <Menu/>}</button></div>
    </div></header>
  );
}
