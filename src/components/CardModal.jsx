import { memo } from 'react';
import { Modal } from './Modal.jsx';
import { SetArtwork } from './SetArtwork.jsx';

export const CardModal = memo(function CardModal({
  modalCard,
  closeModal,
  modalImageButtonRef,
  toggleZoom,
  updateZoomOrigin,
  handleZoomWheel,
  modalImageRef,
  currentSet,
  modalCollectionSelection,
  setModalCollectionSelection,
  user,
  modalCollectionsLoading,
  collections,
  modalSelectedCollection,
  modalCardAlreadyAdded,
  handleAddModalCardToCollection,
  modalCollectionSubmitLabel,
  modalCollectionStatus,
  modalCardCollections,
  modalPrevCard,
  modalNextCard,
  openSiblingCard
}) {
  const modalSet = modalCard
    ? (currentSet || {
        displayName: modalCard.setName || 'Set desconocido',
        code: modalCard.setCode || '',
        logo: modalCard.setLogo || '',
        symbol: modalCard.setSymbol || ''
      })
    : null;
  const modalCollectionsCount = modalCardCollections.length;

  return (
    <Modal open={Boolean(modalCard)} onBackdropClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
      {modalCard && (
        <article className="modal-card" id="card-modal">
          <div className="modal-top">
            <div>
              <span className="hud-tag hud-tag-warm"><span className="hud-tag-dot" aria-hidden="true" />Detalle de carta</span>
              <h2>{modalCard.name}</h2>
            </div>
            <button className="modal-close" id="modal-close" type="button" onClick={closeModal}>Cerrar</button>
          </div>
          <div className="modal-grid">
            <div className="modal-image-wrap">
              <button ref={modalImageButtonRef} className="modal-image-button" type="button" aria-label="Acercar carta" onClick={toggleZoom} onPointerMove={updateZoomOrigin} onWheel={handleZoomWheel}>
                <img ref={modalImageRef} className="modal-image" src={modalCard.imageLarge || modalCard.imageSmall} alt={`Imagen completa de ${modalCard.name}`} />
              </button>
              {(modalPrevCard || modalNextCard) ? (
                <div className="modal-nav-row">
                  <button className="action-btn" type="button" disabled={!modalPrevCard} onClick={() => modalPrevCard && openSiblingCard(modalPrevCard)}>Anterior</button>
                  <button className="action-btn" type="button" disabled={!modalNextCard} onClick={() => modalNextCard && openSiblingCard(modalNextCard)}>Siguiente</button>
                </div>
              ) : null}
            </div>
            <div>
              <div className="modal-meta" id="modal-meta">
                <div className="modal-set-panel modal-panel-feature"><strong>Expansion</strong><div className="modal-set-panel-body">{modalSet ? <SetArtwork set={modalSet} className="modal-set-image" /> : null}</div></div>
                <div className="modal-fact"><strong>Artista</strong><span>{modalCard.artist || 'Artista no disponible'}</span></div>
              </div>
              {modalCollectionsCount ? <div className="collection-filter-chips modal-ownership-chips">{modalCardCollections.map((collection) => <span key={collection.id}>{collection.name}</span>)}</div> : <div className="modal-ownership-panel"><span>Aun no esta guardada en ninguna coleccion.</span></div>}
              <div className="modal-links" id="modal-links">
                {(modalCard.imageLarge || modalCard.imageSmall) && <a href={modalCard.imageLarge || modalCard.imageSmall} target="_blank" rel="noreferrer">Abrir imagen completa</a>}
                {modalCard.tcgplayerUrl && <a className="secondary" href={modalCard.tcgplayerUrl} target="_blank" rel="noreferrer">Ver en TCGplayer</a>}
                {modalCard.cardmarketUrl && <a className="secondary" href={modalCard.cardmarketUrl} target="_blank" rel="noreferrer">Ver en Cardmarket</a>}
              </div>
              <div className="modal-collection-tools">
                <label htmlFor="modal-collection-select">
                  Agregar a una coleccion
                  <select id="modal-collection-select" value={modalCollectionSelection} disabled={!user || modalCollectionsLoading || !collections.length} onChange={(event) => setModalCollectionSelection(event.target.value)}>
                    {!collections.length ? <option value="">No tienes colecciones</option> : collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
                  </select>
                </label>
                <button className="action-btn accent" id="modal-collection-submit" type="button" disabled={!user || !modalSelectedCollection || modalCardAlreadyAdded || modalCollectionsLoading} onClick={() => void handleAddModalCardToCollection()}>{modalCollectionSubmitLabel}</button>
                <p className="subtitle modal-collection-status" id="modal-collection-status">{modalCollectionStatus || (!user ? 'Inicia sesion para guardar esta carta en una coleccion existente.' : modalCardAlreadyAdded ? `La carta ya esta en "${modalSelectedCollection?.name}".` : modalSelectedCollection ? `Coleccion seleccionada: "${modalSelectedCollection.name}".` : 'Selecciona una coleccion para guardar esta carta.')}</p>
              </div>
            </div>
          </div>
        </article>
      )}
    </Modal>
  );
});
