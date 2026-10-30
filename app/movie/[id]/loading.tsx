export default function MovieLoading() {
  return <div className="experience-loading" aria-label="Loading movie details" role="status">
    <div className="loading-backdrop skeleton"/>
    <div className="shell loading-detail">
      <div className="loading-poster skeleton"/>
      <div className="loading-copy"><span className="skeleton"/><span className="skeleton"/><span className="skeleton"/><div><i className="skeleton"/><i className="skeleton"/><i className="skeleton"/></div></div>
    </div>
    <span className="sr-only">Loading movie details</span>
  </div>;
}
