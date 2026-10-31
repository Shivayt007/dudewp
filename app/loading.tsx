export default function Loading() {
  return <section className="catalog shell catalog-skeleton" role="status" aria-label="Loading movies">
    <div className="catalog-heading"><h1>All movies</h1><span>Loading…</span></div>
    <div className="catalog-grid" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <div key={i}><div className="catalog-poster-placeholder"/><div className="catalog-title-placeholder"/><div className="catalog-meta-placeholder"/></div>)}</div>
  </section>;
}
