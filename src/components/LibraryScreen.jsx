import { memo } from 'react';
import { expansionPath } from '../app-routing.js';
import { seriesAnchorId } from '../app-data.js';
import { LibrarySkeleton } from './Skeletons.jsx';
import { SetArtwork } from './SetArtwork.jsx';

export const LibraryScreen = memo(function LibraryScreen({ setsStatus, navigateTo, seriesEntries, filteredSeriesEntries, seriesPage, setSeriesPage, currentSeriesEntry, seriesQuery, setSeriesQuery }) {
  return (
    <section className="library-shell" id="library-shell">
      <div className="library-head">
        <div>
          <span className="hud-tag hud-tag-cool"><span className="hud-tag-dot" aria-hidden="true" />Modo Pokedex</span>
          <h2>Recorre las eras, detecta tus sets favoritos y abre cada expansion con un toque</h2>
          <p className="explorer-copy">La biblioteca es tu mapa visual: cada pagina te muestra una serie completa y cada logo te lleva al detalle del set para seguir explorando cartas.</p>
        </div>
        <div className="library-head-actions">
          <div id="status">{setsStatus}</div>
          <button className="action-btn" id="library-home" type="button" onClick={() => navigateTo('/')}>Volver al inicio</button>
        </div>
      </div>
        <div className="library-tools">
          <label className="library-search-control">
            Buscar serie o set
            <input id="library-search" type="search" placeholder="Scarlet and Violet, Celebrations, Sword and Shield..." value={seriesQuery} onChange={(event) => setSeriesQuery(event.target.value)} />
          </label>
          <div className="library-jump-list" aria-label="Saltos rapidos por serie">
            {filteredSeriesEntries.slice(0, 10).map(([seriesName], index) => (
              <button key={seriesName} className={`action-btn ${currentSeriesEntry?.[0] === seriesName ? 'active' : ''}`} type="button" onClick={() => setSeriesPage(index + 1)}>{seriesName}</button>
            ))}
          </div>
        </div>
        <div className="series-pager" hidden={filteredSeriesEntries.length <= 1}>
          <button className="action-btn" type="button" disabled={seriesPage <= 1} onClick={() => setSeriesPage((page) => Math.max(1, page - 1))}>Serie anterior</button>
          <div className="series-page-label">{`Serie ${Math.min(seriesPage, Math.max(filteredSeriesEntries.length, 1)).toLocaleString()} de ${Math.max(filteredSeriesEntries.length, 1).toLocaleString()}`}</div>
          <button className="action-btn" type="button" disabled={seriesPage >= filteredSeriesEntries.length} onClick={() => setSeriesPage((page) => Math.min(filteredSeriesEntries.length, page + 1))}>Serie siguiente</button>
        </div>
      <section aria-live="polite">
        {currentSeriesEntry ? (() => {
          const [seriesName, groupSets] = currentSeriesEntry;
          return (
            <section className="series-block" id={seriesAnchorId(seriesName)}>
              <div className="series-head">
                <div>
                  <p className="series-kicker">Serie</p>
                  <h2>{seriesName}</h2>
                </div>
                <div className="series-count">{`${groupSets.length.toLocaleString()} set${groupSets.length === 1 ? '' : 's'}`}</div>
              </div>
              <div className="set-grid compact-grid">
                {groupSets.map((set) => (
                  <button key={set.id} className="expansion-card" type="button" aria-label={`Abrir ${set.displayName}`} onClick={() => navigateTo(expansionPath(set))}>
                    <SetArtwork set={set} />
                    <span className="sr-only">{set.displayName}</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })() : filteredSeriesEntries.length ? <div className="empty">No hay una serie disponible para esta pagina.</div> : seriesEntries.length ? <div className="empty">No encontramos series o sets con esa busqueda.</div> : setsStatus.includes('No se pudieron cargar') ? <div className="error">{setsStatus}</div> : <LibrarySkeleton />}
      </section>
    </section>
  );
});
