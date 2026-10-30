export default function Poster({ id, title, image, large = false }: { id: string; title: string; image?: string; large?: boolean; hasPoster?: boolean }) {
  return <div className={`poster-art ${large ? "poster-large" : ""}`}><img src={image || "/images/hollywood-fallback.svg"} alt={`${title} poster`} width={500} height={750} loading={large ? "eager" : "lazy"}/></div>;
}
