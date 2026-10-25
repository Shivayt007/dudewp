import Link from "next/link";
import { Clapperboard } from "lucide-react";
export default function SiteFooter() { return <footer className="site-footer"><div className="shell footer-inner"><Link className="footer-brand" href="/"><Clapperboard size={18}/>DUDE<span>.</span></Link><p>Your movies. Your screen. © {new Date().getFullYear()} Dude Movies.</p><p className="footer-caption">Stream content you own or are licensed to distribute.</p></div></footer>; }
