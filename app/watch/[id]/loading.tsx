export default function WatchLoading() {
  return <div className="watch-loading" aria-label="Preparing movie player" role="status">
    <div className="loading-player skeleton"><div className="stream-ring"/></div>
    <div className="shell loading-watch-copy"><span className="skeleton"/><span className="skeleton"/><div><i className="skeleton"/><i className="skeleton"/><i className="skeleton"/></div></div>
    <span className="sr-only">Preparing movie player</span>
  </div>;
}
