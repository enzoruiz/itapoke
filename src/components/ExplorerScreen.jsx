import { memo } from 'react';
import { buildExplorerQuery } from '../app-query.js';
import { ExplorerSkeleton } from './Skeletons.jsx';
import { SetMark } from './SetArtwork.jsx';

export const ELEMENT_OPTIONS = [
  { value: '', label: 'Cualquier elemento' },
  { value: 'Grass', label: 'Planta' },
  { value: 'Fire', label: 'Fuego' },
  { value: 'Water', label: 'Agua' },
  { value: 'Lightning', label: 'Rayo' },
  { value: 'Psychic', label: 'Psiquico' },
  { value: 'Fighting', label: 'Lucha' },
  { value: 'Darkness', label: 'Oscuridad' },
  { value: 'Metal', label: 'Metal' },
  { value: 'Dragon', label: 'Dragon' },
  { value: 'Colorless', label: 'Incoloro' },
  { value: 'Fairy', label: 'Hada' }
];

export const CARD_KIND_OPTIONS = [
  { value: '', label: 'Cualquiera' },
  { value: 'Pokemon', label: 'Pokemon' },
  { value: 'Trainer', label: 'Entrenador' },
  { value: 'Energy', label: 'Energia' }
];

function ExplorerCard({ card, onOpen, eager = false, onHover }) {
  return (
    <li className="card-item">
      <button className="card-trigger explorer-card-trigger" type="button" onClick={() => onOpen(card.setId, card.id)} onPointerEnter={() => onHover(card.setId, card.id)}>
        {card.imageSmall ? <img className="card-art lazy-image" src={card.imageSmall} alt={`Carta de ${card.name}`} loading={eager ? 'eager' : 'lazy'} decoding="async" fetchPriority={eager ? 'high' : 'low'} /> : <div className="card-art-placeholder" aria-hidden="true" />}
        <div className="card-body explorer-card-body">
          <div className="explorer-card-head">
            <span className="card-number">#{card.number}</span>
            <SetMark logo={card.setLogo} symbol={card.setSymbol} label={card.setLabel} code={card.setCode} />
          </div>
          <span className="card-name">{card.name}</span>
        </div>
      </button>
    </li>
  );
}

const MemoExplorerCard = memo(ExplorerCard);

export const ExplorerScreen = memo(function ExplorerScreen({
  navigateTo,
  explorerFilters,
  setExplorerFilters,
  expansionFilterOptions,
  handleRunExplorerSearch,
  user,
  explorerHasActiveFilters,
  explorerResult,
  handleCreateCollection,
  handleClearFilters,
  explorerStatus,
  isExplorerLoading,
  explorerCardsWithSet,
  schedulePrefetchLargeImage,
  openCardModal,
  explorerSort,
  setExplorerSort,
  explorerActiveFilterChips,
  handleRemoveExplorerFilter,
  handleApplyExplorerPreset,
  hasPendingExplorerChanges
}) {
  return (
    <section className="explorer" id="explorer-panel">
      <div className="explorer-head">
        <div>
          <span className="hud-tag hud-tag-warm"><span className="hud-tag-dot" aria-hidden="true" />Modo Scout</span>
          <h2>Activa tu radar de cazador y encuentra tu proxima carta favorita</h2>
          <p className="explorer-copy">Combina filtros para aterrizar rapido en una carta concreta o curiosear entre artistas, rarezas y expansiones con resultados al instante.</p>
        </div>
        <button className="action-btn" id="explorer-home" type="button" onClick={() => navigateTo('/')}>Volver al inicio</button>
      </div>

      <div className="explorer-toolbar">
        <div className="explorer-presets" aria-label="Presets de busqueda">
          <button className="action-btn" type="button" onClick={() => handleApplyExplorerPreset({ cardQuery: 'Pikachu' })}>Pikachu</button>
          <button className="action-btn" type="button" onClick={() => handleApplyExplorerPreset({ rarity: 'Illustration Rare' })}>Illustration Rare</button>
          <button className="action-btn" type="button" onClick={() => handleApplyExplorerPreset({ cardKind: 'Trainer' })}>Entrenadores</button>
          <button className="action-btn" type="button" onClick={() => handleApplyExplorerPreset({ element: 'Lightning', rarity: 'Rare' })}>Rayo competitivo</button>
        </div>
        <label className="explorer-sort-control">
          Ordenar resultados
          <select id="explorer-sort" value={explorerSort} onChange={(event) => setExplorerSort(event.target.value)}>
            <option value="set-desc">Sets mas nuevos</option>
            <option value="name-asc">Nombre A-Z</option>
            <option value="number-asc">Numero ascendente</option>
            <option value="rarity-asc">Rareza</option>
          </select>
        </label>
      </div>

      <div className="explorer-filters-card">
        <div className="explorer-grid">
        <label>Nombre o texto de carta<input id="card-query" type="search" placeholder="Charizard, Pikachu, Profesor..." value={explorerFilters.cardQuery} onChange={(event) => setExplorerFilters((current) => ({ ...current, cardQuery: event.target.value }))} /></label>
        <label>Expansion<select value={explorerFilters.expansion} onChange={(event) => setExplorerFilters((current) => ({ ...current, expansion: event.target.value }))}><option value="">Cualquier expansion</option>{expansionFilterOptions.map((set) => <option key={set.id} value={set.id}>{`${set.displayName} (${set.code})`}</option>)}</select></label>
        <label>Artista<input id="artist-filter" type="search" placeholder="Ken Sugimori, 5ban Graphics..." value={explorerFilters.artist} onChange={(event) => setExplorerFilters((current) => ({ ...current, artist: event.target.value }))} /></label>
        <label>Clase de carta<select id="kind-filter" value={explorerFilters.cardKind} onChange={(event) => setExplorerFilters((current) => ({ ...current, cardKind: event.target.value }))}>{CARD_KIND_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}</select></label>
        <label>Tipo elemental<select id="element-filter" value={explorerFilters.element} onChange={(event) => setExplorerFilters((current) => ({ ...current, element: event.target.value }))}>{ELEMENT_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}</select></label>
        <label>Rareza<input id="rarity-filter" type="search" placeholder="Rare Holo, Common, Illustration Rare..." value={explorerFilters.rarity} onChange={(event) => setExplorerFilters((current) => ({ ...current, rarity: event.target.value }))} /></label>
        </div>
      </div>

      <div className="explorer-actions explorer-actions-card">
        <button className="action-btn primary" type="button" onClick={handleRunExplorerSearch}>Buscar cartas</button>
        <button className="action-btn accent" id="create-collection" type="button" disabled={!user || !explorerHasActiveFilters || explorerResult.totalCount === 0 || hasPendingExplorerChanges} onClick={() => void handleCreateCollection()}>Crear Coleccion</button>
        <button className="action-btn" type="button" onClick={handleClearFilters}>Limpiar filtros</button>
        {hasPendingExplorerChanges ? <span className="explorer-pending-note">Tienes cambios pendientes. Pulsa "Buscar cartas" para aplicarlos.</span> : null}
      </div>

      {explorerActiveFilterChips.length ? (
        <div className="filter-chip-row" aria-label="Filtros activos">
          {explorerActiveFilterChips.map((chip) => (
            <button key={chip.key} className="filter-chip" type="button" onClick={() => handleRemoveExplorerFilter(chip.key)}>
              <span>{`${chip.label}: ${chip.value}`}</span>
              <span aria-hidden="true">x</span>
            </button>
          ))}
        </div>
      ) : null}

      {explorerStatus ? <div>{explorerStatus}</div> : null}
      <div id="explorer-results">
        {isExplorerLoading ? (
          <ExplorerSkeleton />
        ) : explorerHasActiveFilters && explorerResult.cards.length ? (
          <>
            <div className="filter-summary"><span>{explorerCardsWithSet.length.toLocaleString()} cartas en esta pagina</span><span>{explorerResult.totalCount.toLocaleString()} coincidencias totales</span><span>{explorerSort === 'set-desc' ? 'Orden: Sets mas nuevos' : explorerSort === 'name-asc' ? 'Orden: Nombre A-Z' : explorerSort === 'number-asc' ? 'Orden: Numero ascendente' : 'Orden: Rareza'}</span></div>
            <ol className="card-list">
              {explorerCardsWithSet.map((card, index) => <MemoExplorerCard key={card.id} card={card} eager={index < 12} onHover={schedulePrefetchLargeImage} onOpen={(setId, cardId) => openCardModal(setId, cardId, 'explorer')} />)}
            </ol>
          </>
        ) : <div className="empty">{explorerHasActiveFilters ? 'No hay cartas que coincidan con los filtros actuales en esta pagina.' : 'Todavia no hiciste una busqueda en vivo.'}</div>}
      </div>
      {explorerHasActiveFilters && (
        <div className="pager">
          <div id="explorer-page-label">{`Pagina ${explorerResult.page.toLocaleString()} de ${explorerResult.pageCount.toLocaleString()}`}</div>
          <div className="view-toggle">
            <button className="action-btn" id="explorer-prev" type="button" disabled={explorerResult.page <= 1} onClick={() => navigateTo('/explorer', { query: buildExplorerQuery(explorerFilters, explorerResult.page - 1, explorerSort) })}>Anterior</button>
            <button className="action-btn" id="explorer-next" type="button" disabled={explorerResult.page >= explorerResult.pageCount} onClick={() => navigateTo('/explorer', { query: buildExplorerQuery(explorerFilters, explorerResult.page + 1, explorerSort) })}>Siguiente</button>
          </div>
        </div>
      )}
    </section>
  );
});
