"use client";

import Link from "next/link";
import { Bookmark, Home, Search, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function MobileDock() {
  const path = usePathname();
  const [selected, setSelected] = useState(path === "/" ? "home" : "library");
  const items = [
    { id: "home", href: "/", label: "Home", icon: Home },
    { id: "search", href: "/#catalog-search", label: "Search", icon: Search },
    { id: "new", href: "/?sort=latest#movies", label: "New", icon: Sparkles },
    { id: "library", href: "/#library", label: "Library", icon: Bookmark },
  ];
  return <nav className="mobile-dock" aria-label="Mobile navigation">{items.map(item => {
    const Icon = item.icon;
    return <Link key={item.id} href={item.href} className={selected === item.id ? "active" : ""} onClick={() => setSelected(item.id)}><Icon size={21}/><span>{item.label}</span><i aria-hidden="true"/></Link>;
  })}</nav>;
}
