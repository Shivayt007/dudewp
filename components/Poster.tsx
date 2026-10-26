export default function Poster({ title, large = false }: { id: string; title: string; large?: boolean; hasPoster?: boolean }) {
  return <div className={`poster-art ${large ? "poster-large" : ""}`}><img
    src="/images/biggboss-season-10.webp" alt={`${title} — Bigg Boss Tamil Season 10`}
    width={1536} height={864} loading={large ? "eager" : "lazy"}/></div>;
}

