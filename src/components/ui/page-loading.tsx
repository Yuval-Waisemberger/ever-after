/** A real Suspense fallback, removed by Next when the route is ready. */
export function PageLoading() {
  return (
    <div className="ea-page-loading" role="status" aria-busy="true" aria-label="Loading page">
      <p className="ea-caption">Loading…</p>
      <div className="ea-loading-lines" aria-hidden="true">
        <span className="ea-skeleton" />
        <span className="ea-skeleton" />
        <span className="ea-skeleton" />
      </div>
    </div>
  );
}
