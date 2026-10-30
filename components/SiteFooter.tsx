import Link from "next/link";

export default function SiteFooter() {
  return <footer className="cinema-footer"><div className="shell footer-grid">
    <Link href="/" className="cinema-brand"><strong>DUDE</strong><span>HOLLYWOOD</span></Link>
    <p>Movie metadata and artwork provided by <a href="https://www.themoviedb.org/" rel="noreferrer">TMDB</a>. DUDE Hollywood is not endorsed or certified by TMDB.</p>
  </div></footer>;
}
