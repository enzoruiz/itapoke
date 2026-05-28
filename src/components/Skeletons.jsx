function SkeletonTile({ className = '', delay = 0 }) {
  return <div className={`app-skeleton ${className}`.trim()} style={{ '--skeleton-delay': `${delay}ms` }} aria-hidden="true" />;
}

function SkeletonLine({ className = '', delay = 0 }) {
  return <SkeletonTile className={`skeleton-line ${className}`.trim()} delay={delay} />;
}

export function LibrarySkeleton() {
  return (
    <section className="series-block" aria-busy="true" aria-live="polite">
      <div className="series-head">
        <div className="skeleton-stack">
          <SkeletonLine className="skeleton-line-short" />
          <SkeletonLine className="skeleton-line-title" delay={90} />
        </div>
        <SkeletonTile className="skeleton-pill" delay={160} />
      </div>
      <div className="set-grid compact-grid">
        {Array.from({ length: 8 }, (_, index) => <SkeletonTile key={index} className="expansion-card expansion-card-skeleton" delay={index * 70} />)}
      </div>
    </section>
  );
}

export function ExplorerSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="filter-summary skeleton-summary">
        <SkeletonLine className="skeleton-line-medium" />
        <SkeletonLine className="skeleton-line-short" delay={90} />
      </div>
      <ol className="card-list skeleton-card-list">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index} className="card-item">
            <div className="card-trigger explorer-card-trigger skeleton-card-shell" aria-hidden="true">
              <SkeletonTile className="card-art" delay={index * 70} />
              <div className="explorer-card-body skeleton-stack">
                <div className="explorer-card-head">
                  <SkeletonLine className="skeleton-line-short" delay={index * 70 + 60} />
                  <SkeletonTile className="explorer-set-mark skeleton-mark" delay={index * 70 + 120} />
                </div>
                <SkeletonLine className="skeleton-line-medium" delay={index * 70 + 180} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ExpansionSkeleton({ currentSet }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <article className="detail-loader">
        <div className="detail-loader-orbit">
          <span className="detail-loader-ring detail-loader-ring-outer" aria-hidden="true" />
          <span className="detail-loader-ring detail-loader-ring-inner" aria-hidden="true" />
          <div className="detail-loader-core">
            {currentSet.logo
              ? <img className="detail-loader-logo" src={currentSet.logo} alt="" />
              : currentSet.symbol
                ? <img className="detail-loader-logo detail-loader-symbol" src={currentSet.symbol} alt="" />
                : <div className="detail-loader-placeholder">{currentSet.code.slice(0, 3)}</div>}
          </div>
        </div>
        <div className="detail-loader-copy">
          <p className="detail-loader-kicker">Cargando expansion</p>
          <strong>{currentSet.displayName}</strong>
          <span>Estamos trayendo las cartas de este set para mostrar su galeria completa.</span>
        </div>
      </article>
      <ol className="detail-skeleton-grid">
        {Array.from({ length: 10 }, (_, index) => <li key={index} className="detail-skeleton-card" style={{ '--skeleton-delay': `${index * 80}ms` }} aria-hidden="true" />)}
      </ol>
    </div>
  );
}

export function CollectionsSkeleton() {
  return (
    <div className="collections-grid" aria-busy="true" aria-live="polite">
      {Array.from({ length: 3 }, (_, index) => (
        <article key={index} className="collection-card collection-card-skeleton" aria-hidden="true">
          <div className="collection-card-main skeleton-stack">
            <SkeletonLine className="skeleton-line-short" delay={index * 80} />
            <SkeletonLine className="skeleton-line-title" delay={index * 80 + 70} />
            <SkeletonLine className="skeleton-line-medium" delay={index * 80 + 140} />
          </div>
          <div className="collection-metrics">
            <SkeletonTile className="skeleton-pill" delay={index * 80 + 210} />
            <SkeletonTile className="skeleton-pill" delay={index * 80 + 260} />
            <SkeletonTile className="skeleton-pill" delay={index * 80 + 310} />
          </div>
          <div className="collection-card-actions">
            <SkeletonTile className="action-btn skeleton-button" delay={index * 80 + 360} />
            <SkeletonTile className="action-btn skeleton-button" delay={index * 80 + 420} />
          </div>
        </article>
      ))}
    </div>
  );
}

export function CollectionDetailSkeleton() {
  return (
    <div className="collection-card-list" aria-busy="true" aria-live="polite">
      {Array.from({ length: 4 }, (_, index) => (
        <article key={index} className="collection-entry collection-entry-skeleton" aria-hidden="true">
          <div className="collection-entry-toggle">
            <div className="collection-entry-art">
              <SkeletonTile className="card-art" delay={index * 80} />
            </div>
            <div className="collection-entry-body skeleton-stack">
              <SkeletonLine className="skeleton-line-short" delay={index * 80 + 70} />
              <SkeletonLine className="skeleton-line-title" delay={index * 80 + 140} />
              <SkeletonLine className="skeleton-line-medium" delay={index * 80 + 210} />
            </div>
          </div>
          <div className="collection-entry-footer">
            <SkeletonTile className="action-btn skeleton-button" delay={index * 80 + 280} />
          </div>
        </article>
      ))}
    </div>
  );
}
