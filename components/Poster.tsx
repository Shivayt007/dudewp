"use client";
import { useState } from "react";
import { Clapperboard } from "lucide-react";

export default function Poster({ id, title, large = false, hasPoster = false }: { id: string; title: string; large?: boolean; hasPoster?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`poster-art ${large ? "poster-large" : ""}`}>
      {hasPoster && !failed ? (
        // Poster comes from the local, credential-protected Telegram API proxy.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/poster/${id}`} alt={`${title} movie poster`} loading={large ? "eager" : "lazy"} onError={() => setFailed(true)} />
      ) : (
        <div className="poster-fallback"><Clapperboard size={large ? 48 : 30} strokeWidth={1.5} /><span>{title}</span></div>
      )}
    </div>
  );
}
