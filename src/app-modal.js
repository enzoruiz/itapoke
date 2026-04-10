export function createCardModalController({
  el,
  state,
  escapeHtml,
  buildModalFact,
  getSetById,
  findCard,
  enrichCard,
  updateModalCollectionUi,
  refreshModalCollections
}) {
  function requestZoomRender() {
    if (state.zoomRaf) return;
    state.zoomRaf = requestAnimationFrame(() => {
      state.zoomRaf = 0;
      el.modalImage.style.transformOrigin = `${state.zoomOriginX}% ${state.zoomOriginY}%`;
      el.modalImage.style.transform = `scale(${state.zoomActive ? state.zoomScale : 1})`;
      el.modalImageButton.style.cursor = state.zoomActive ? 'zoom-out' : 'zoom-in';
    });
  }

  function updateZoomOriginFromPointer(event) {
    if (!state.zoomActive) return;
    const rect = el.modalImageButton.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    state.zoomOriginX = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1) * 100;
    state.zoomOriginY = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1) * 100;
    requestZoomRender();
  }

  function setZoom(active, event) {
    state.zoomActive = active;
    if (!active) {
      state.zoomScale = 2.2;
      state.zoomOriginX = 50;
      state.zoomOriginY = 50;
    } else if (event) {
      updateZoomOriginFromPointer(event);
    }
    requestZoomRender();
  }

  function prefetchLargeImage(setId, cardId) {
    const src = findCard(setId, cardId)?.imageLarge;
    if (!src || state.prefetchedLargeImages.has(src)) return;
    state.prefetchedLargeImages.add(src);
    const img = new Image();
    img.src = src;
  }

  function schedulePrefetchLargeImage(setId, cardId) {
    const key = `${setId}|${cardId}`;
    state.pendingPrefetchKey = key;
    window.clearTimeout(state.hoverPrefetchTimer);
    state.hoverPrefetchTimer = window.setTimeout(() => {
      if (state.isScrollActive || state.pendingPrefetchKey !== key) return;
      const run = () => prefetchLargeImage(setId, cardId);
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(run, { timeout: 250 });
      } else {
        window.setTimeout(run, 0);
      }
    }, 120);
  }

  function openCardModal(setId, cardId, trigger) {
    const set = getSetById(setId);
    const card = findCard(setId, cardId);
    if (!set || !card) return;
    state.activeTrigger = trigger || null;
    state.activeModalCard = enrichCard(card);
    el.modalTitle.textContent = card.name;
    el.modalSubtitle.textContent = `${set.displayName} (${set.code}) - #${card.number}`;
    el.modalImage.src = card.imageLarge || card.imageSmall;
    el.modalImage.alt = `Imagen completa de ${card.name}`;

    const setArt = set.logo
      ? `<img class="modal-set-image" src="${escapeHtml(set.logo)}" alt="Logo de ${escapeHtml(set.displayName)}" />`
      : set.symbol
        ? `<img class="modal-set-image modal-set-symbol" src="${escapeHtml(set.symbol)}" alt="Simbolo de ${escapeHtml(set.displayName)}" />`
        : `<div class="modal-set-image modal-set-fallback" aria-hidden="true">${escapeHtml(set.code.slice(0, 3))}</div>`;

    const displayArtist = card.artist || 'Artista no disponible';
    const displayRarity = card.rarity || 'Sin especificar';
    el.modalMeta.innerHTML = [
      `<div class="modal-set-panel modal-panel-feature"><strong>Expansion</strong><div class="modal-set-panel-body">${setArt}</div></div>`,
      buildModalFact('Rareza', displayRarity),
      buildModalFact('Artista', displayArtist)
    ].join('');

    const links = [];
    if (card.imageLarge || card.imageSmall) links.push(`<a href="${escapeHtml(card.imageLarge || card.imageSmall)}" target="_blank" rel="noreferrer">Abrir imagen completa</a>`);
    if (card.tcgplayerUrl) links.push(`<a class="secondary" href="${escapeHtml(card.tcgplayerUrl)}" target="_blank" rel="noreferrer">Ver en TCGplayer</a>`);
    if (card.cardmarketUrl) links.push(`<a class="secondary" href="${escapeHtml(card.cardmarketUrl)}" target="_blank" rel="noreferrer">Ver en Cardmarket</a>`);
    el.modalLinks.innerHTML = links.join('');
    el.modalCollectionTools.hidden = false;
    el.modalCollectionSelect.innerHTML = '<option value="">Selecciona una coleccion</option>';
    updateModalCollectionUi();
    el.modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setZoom(false);
    el.modalClose.focus();
    void refreshModalCollections({ force: true });
  }

  function closeModal() {
    el.modal.hidden = true;
    document.body.style.overflow = '';
    setZoom(false);
    state.activeModalCard = null;
    state.modalCollectionsToken += 1;
    state.activeTrigger?.focus();
  }

  return {
    requestZoomRender,
    updateZoomOriginFromPointer,
    setZoom,
    schedulePrefetchLargeImage,
    openCardModal,
    closeModal
  };
}
