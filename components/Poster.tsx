"use client";
import { useState } from "react";
import { Eye } from "lucide-react";
export default function Poster({ id, title, large = false, hasPoster = false }: { id: string; title: string; large?: boolean; hasPoster?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className={`poster-art ${large ? 'poster-large' : ''}`}>{hasPoster && !failed ? <img src={`/api/poster/${id}`} alt={`${title} thumbnail`} loading={large ? 'eager' : 'lazy'} onError={() => setFailed(true)}/> : <div className="poster-fallback"><Eye size={large ? 100 : 54} strokeWidth={1}/><span>Bigg Boss Tamil</span></div>}</div>;
}
