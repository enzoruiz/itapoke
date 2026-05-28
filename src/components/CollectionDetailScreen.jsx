import { memo } from 'react';
import { CollectionDetailSkeleton } from './Skeletons.jsx';
import { ProgressMeter } from './ProgressMeter.jsx';
import { SetMark } from './SetArtwork.jsx';

function CollectionEntry({ collectionId, card, onToggleOwned, onRemove }) {
  return (
    <article className={`collection-entry ${card.owned ? 'is-owned' : ''}`}>
      <button className="collection-entry-toggle" type="button" aria-pressed={card.owned} onClick={() => onToggleOwned(collectionId, card.id)}>
        <div className="collection-entry-art">
          {card.imageSmall ? <img className="card-art lazy-image" src={card.imageSmall} alt={`Carta de ${card.name}`} loading="lazy" decoding="async" /> : <div className="card-art-placeholder" aria-hidden="true" />}
        </div>
        <div className="collection-entry-body">
          <div className="explorer-card-head">
            <span className="card-number">#{card.number}</span>
            <SetMark logo={card.setLogo} symbol={card.setSymbol} label={card.setLabel} code={card.setCode} />
          </div>
          <strong className="card-name">{card.name}</strong>
          <p className="subtitle collection-entry-set">{card.setLabel || card.setName || 'Set desconocido'}</p>
        </div>
      </button>
      <div className="collection-entry-footer">
        <button className="action-btn danger collection-entry-remove" type="button" onClick={() => onRemove(collectionId, card.id)}>Quitar carta</button>
      </div>
    </article>
  );
}

const MemoCollectionEntry = memo(CollectionEntry);

export const CollectionDetailScreen = memo(function CollectionDetailScreen({
  activeCollection,
  navigateTo,
  isCollectionsLoading,
  handleRenameCollection,
  handleDeleteCollection,
  topCollectionTotals,
  activeCollectionFilterBits,
  collectionOwnershipFilter,
  setCollectionOwnershipFilter,
  visibleCollectionCards,
  handleRemoveCollectionCard,
  handleToggleCollectionCard,
  showMissingOnly
}) {
  return (
    <section className="collection-detail">
      <div className="detail-nav collection-detail-nav">
        <button className="action-btn" id="collection-back" type="button" onClick={() => navigateTo('/mis-colecciones')}>Volver a Mis Colecciones</button>
        <div className="collection-detail-actions">
          <button className="action-btn" id="collection-rename" type="button" onClick={() => void handleRenameCollection()}>Renombrar</button>
          <button className="action-btn danger" id="collection-delete" type="button" onClick={() => void handleDeleteCollection(activeCollection.id, true)}>Eliminar coleccion</button>
        </div>
      </div>

      <article className="detail-hero collection-hero" id="collection-summary">
        <div className="detail-hero-main">
          <div>
            <span className="hud-tag hud-tag-rose"><span className="hud-tag-dot" aria-hidden="true" />Coleccion personal</span>
            <h2>{activeCollection.name}</h2>
            <p className="subtitle">Listado guardado desde el explorador para seguir tus cartas obtenidas y las que aun buscas.</p>
          </div>
        </div>
        <div className="detail-facts">
          <article className="detail-fact"><span>Cartas</span><strong>{topCollectionTotals.total.toLocaleString()}</strong></article>
          <article className="detail-fact"><span>Tengo</span><strong>{topCollectionTotals.ownedCount.toLocaleString()}</strong></article>
          <article className="detail-fact"><span>Me faltan</span><strong>{topCollectionTotals.missingCount.toLocaleString()}</strong></article>
          <article className="detail-fact"><span>Coincidencias</span><strong>{Number(activeCollection.totalCount || topCollectionTotals.total).toLocaleString()}</strong></article>
        </div>
        <ProgressMeter value={topCollectionTotals.ownedCount} total={topCollectionTotals.total} label="Progreso de la coleccion" />
        {activeCollectionFilterBits.length > 0 && (
          <div className="collection-filter-chips">
            {activeCollectionFilterBits.map(([key, value]) => <span key={key}>{`${key}: ${value}`}</span>)}
          </div>
        )}
        {topCollectionTotals.missingCount > 0 ? <div className="collection-focus-banner">{showMissingOnly ? 'Estas viendo solo tus faltantes.' : `Te faltan ${topCollectionTotals.missingCount.toLocaleString()} cartas para completar esta coleccion.`}</div> : null}
      </article>

      <div className="collection-ownership-filters">
        <button className={`action-btn ${collectionOwnershipFilter === 'all' ? 'active' : ''}`} id="collection-filter-all" type="button" aria-pressed={collectionOwnershipFilter === 'all'} onClick={() => setCollectionOwnershipFilter('all')}>Todas</button>
        <button className={`action-btn ${collectionOwnershipFilter === 'owned' ? 'active' : ''}`} id="collection-filter-owned" type="button" aria-pressed={collectionOwnershipFilter === 'owned'} onClick={() => setCollectionOwnershipFilter('owned')}>Las tengo</button>
        <button className={`action-btn ${collectionOwnershipFilter === 'missing' ? 'active' : ''}`} id="collection-filter-missing" type="button" aria-pressed={collectionOwnershipFilter === 'missing'} onClick={() => setCollectionOwnershipFilter('missing')}>No las tengo</button>
      </div>

      <div className="detail-status">
        {topCollectionTotals.total
          ? `Mostrando ${visibleCollectionCards.length.toLocaleString()} de ${topCollectionTotals.total.toLocaleString()} cartas. Ya marcaste ${topCollectionTotals.ownedCount.toLocaleString()} como obtenidas.`
          : 'Esta coleccion no tiene cartas guardadas.'}
      </div>

      <div>
        {isCollectionsLoading ? (
          <CollectionDetailSkeleton />
        ) : visibleCollectionCards.length ? (
          <div className="collection-card-list" id="collection-cards">
            {visibleCollectionCards.map((card) => <MemoCollectionEntry key={card.id} collectionId={activeCollection.id} card={card} onRemove={handleRemoveCollectionCard} onToggleOwned={handleToggleCollectionCard} />)}
          </div>
        ) : <div className="empty">No hay cartas que coincidan con este filtro dentro de la coleccion.</div>}
      </div>
    </section>
  );
});
