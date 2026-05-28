import { memo } from 'react';
import { ExpansionSkeleton } from './Skeletons.jsx';
import { SetArtwork } from './SetArtwork.jsx';
import { CARD_KIND_OPTIONS } from './ExplorerScreen.jsx';

function PosterCard({ card, setId, onOpen, eager = false, onHover }) {
  return (
    <li className="poster-item">
      <button className="card-poster" type="button" onClick={() => onOpen(setId, card.id)} onPointerEnter={() => onHover(setId, card.id)}>
        {card.imageSmall ? <img className="poster-art lazy-image" src={card.imageSmall} alt={`Carta de ${card.name}`} loading={eager ? 'eager' : 'lazy'} decoding="async" fetchPriority={eager ? 'high' : 'low'} /> : <div className="card-art-placeholder" aria-hidden="true" />}
        <span className="sr-only">{card.name}</span>
      </button>
    </li>
  );
}

const MemoPosterCard = memo(PosterCard);

export const ExpansionScreen = memo(function ExpansionScreen({
  navigateTo,
  user,
  filteredDetailCards,
  handleCreateCollectionFromDetail,
  currentSet,
  activeSetCards,
  detailQuery,
  setDetailQuery,
  startUiTransition,
  detailKind,
  setDetailKind,
  detailSort,
  setDetailSort,
  loadingSetId,
  isPending,
  schedulePrefetchLargeImage,
  openCardModal
}) {
  return (
    <section className="expansion-detail" id="expansion-detail">
      <div className="detail-nav">
        <button className="action-btn" type="button" onClick={() => navigateTo('/library')}>Volver a expansiones</button>
        <button className="action-btn accent" id="detail-create-collection" type="button" disabled={!user || !filteredDetailCards.length} onClick={() => void handleCreateCollectionFromDetail()}>Crear Coleccion</button>
      </div>

      <article className="detail-hero detail-region-ready" id="expansion-summary">
        <div className="detail-hero-main">
          <div className="detail-logo-wrap">
            <SetArtwork set={currentSet} className="detail-logo" />
          </div>
          <div>
            <span className="hud-tag hud-tag-cool"><span className="hud-tag-dot" aria-hidden="true" />{currentSet.series}</span>
            <h2>{currentSet.displayName}</h2>
            <p className="subtitle">{`Expansion ${currentSet.category} dentro de la serie ${currentSet.series}. Abre la galeria completa y cazala carta por carta.`}</p>
          </div>
        </div>
        <div className="detail-facts">
          <article className="detail-fact"><span>Serie</span><strong>{currentSet.series}</strong></article>
          <article className="detail-fact"><span>Lanzamiento</span><strong>{currentSet.releaseDate}</strong></article>
          <article className="detail-fact"><span>Impresas</span><strong>{String(currentSet.printedTotal)}</strong></article>
          <article className="detail-fact"><span>Total</span><strong>{String(currentSet.total)}</strong></article>
          <article className="detail-fact"><span>Codigo</span><strong>{currentSet.code}</strong></article>
          <article className="detail-fact"><span>Cartas cargadas</span><strong>{activeSetCards.length.toLocaleString()}</strong></article>
        </div>
      </article>

      <div className="detail-filters">
        <label>Buscar cartas<input id="detail-search" type="search" placeholder="Charizard, Pikachu, Rare, Entrenador..." value={detailQuery} onChange={(event) => startUiTransition(() => setDetailQuery(event.target.value))} /></label>
        <label>Clase de carta<select id="detail-kind-filter" value={detailKind} onChange={(event) => setDetailKind(event.target.value)}>{CARD_KIND_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}</select></label>
        <label>Ordenar cartas<select id="detail-sort-filter" value={detailSort} onChange={(event) => setDetailSort(event.target.value)}><option value="number-asc">Numero ascendente</option><option value="number-desc">Numero descendente</option><option value="name-asc">Nombre A-Z</option></select></label>
      </div>

      <div className="detail-status">
        {loadingSetId === currentSet.id && !activeSetCards.length
          ? 'Cargando cartas para esta expansion...'
          : filteredDetailCards.length
            ? `Mostrando ${filteredDetailCards.length.toLocaleString()} de ${activeSetCards.length.toLocaleString()} cartas. Haz clic en cualquier carta para abrir su detalle.`
            : activeSetCards.length
              ? 'Ninguna carta coincide con los filtros actuales.'
              : 'No se pudieron cargar las cartas de esta expansion.'}
        {isPending ? ' Actualizando vista...' : ''}
      </div>

      <div>
        {loadingSetId === currentSet.id && !activeSetCards.length ? (
          <ExpansionSkeleton currentSet={currentSet} />
        ) : filteredDetailCards.length ? (
          <ol className="poster-grid detail-region-ready" id="expansion-cards">
            {filteredDetailCards.map((card, index) => <MemoPosterCard key={card.id} card={card} setId={currentSet.id} eager={index < 12} onHover={schedulePrefetchLargeImage} onOpen={(setId, cardId) => openCardModal(setId, cardId, 'expansion')} />)}
          </ol>
        ) : <div className="empty">Prueba otro nombre, tipo o criterio de orden.</div>}
      </div>
    </section>
  );
});
