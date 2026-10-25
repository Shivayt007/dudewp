import Link from "next/link";
export default function NotFound() { return <section className="shell state-box"><span className="state-kicker">404 · LOST IN THE CATALOG</span><h1>This movie is not available.</h1><p>The link may have moved, or the movie was removed.</p><Link href="/" className="btn btn-primary">Back to Discover</Link></section>; }
