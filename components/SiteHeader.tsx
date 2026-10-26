"use client";
import Link from "next/link";
import { Clapperboard, Search, Menu, X } from "lucide-react";
import { useState } from "react";
export default function SiteHeader() {
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  return <header className="bb-header"><div className="shell bb-header-inner"><Link href="/" className="brand" aria-label="Dude Bigg Boss Tamil home"><span className="brand-symbol"><Clapperboard size={25}/></span><span>DUDE<span className="brand-accent">.</span></span></Link><nav className="bb-desktop-nav" aria-label="Main navigation"><Link href="/#episodes">Episodes</Link><Link href="/#promos">Promos & highlights</Link><span>Season 10</span></nav><div className="bb-header-actions"><button aria-label={search ? 'Close search' : 'Search episodes'} aria-expanded={search} aria-controls="episode-search" onClick={() => setSearch(!search)}>{search ? <X/> : <Search/>}</button><button aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} aria-controls="bb-menu" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button></div></div>{search && <form id="episode-search" className="shell bb-search" action="/" role="search"><label htmlFor="episode-query">Find an episode or clip</label><div><input id="episode-query" autoFocus name="search" placeholder="Search by title…" maxLength={80}/><button className="btn btn-primary" type="submit">Search</button></div></form>}{menu && <nav className="shell bb-menu" id="bb-menu" aria-label="Episode menu"><Link href="/#episodes" onClick={() => setMenu(false)}>All episodes</Link><Link href="/?kind=promo#episodes" onClick={() => setMenu(false)}>Promos</Link><Link href="/?kind=highlight#episodes" onClick={() => setMenu(false)}>Highlights</Link></nav>}</header>;
}
