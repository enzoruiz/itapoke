export function bindAppEvents({ el, state, handlers }) {
  const {
    closeModal,
    closeCollectionNameModal,
    closeCollectionDeleteModal,
    closeCollectionCardRemoveModal,
    setZoom,
    updateZoomOriginFromPointer,
    updateModalCollectionUi,
    handleAddModalCardToCollection,
    handleCardTrigger,
    handleCardHover,
    syncExplorerRoute,
    navigateTo,
    setExpansionRoute,
    renderSets,
    renderActiveSet,
    syncExpansionRoute,
    persistUiState,
    handleCreateCollectionFromDetail,
    handleCreateCollection,
    resetExplorerState,
    handleDeleteCollectionById,
    getCollection,
    requestCollectionCardRemoval,
    removeCardFromCollection,
    listCollections,
    renderCollectionDetail,
    updateCollectionCardOwnership,
    refreshCollectionSummary,
    signOut,
    handleRenameCollection,
    handleDeleteCollection,
    syncRoute,
    collectionPath
  } = handlers;

  el.modalClose.addEventListener('click', closeModal);
  el.modal.addEventListener('click', (event) => {
    if (event.target === el.modal) closeModal();
  });
  el.collectionNameClose.addEventListener('click', () => closeCollectionNameModal(null));
  el.collectionNameCancel.addEventListener('click', () => closeCollectionNameModal(null));
  el.collectionNameModal.addEventListener('click', (event) => {
    if (event.target === el.collectionNameModal) closeCollectionNameModal(null);
  });
  el.collectionDeleteClose.addEventListener('click', () => closeCollectionDeleteModal(false));
  el.collectionDeleteCancel.addEventListener('click', () => closeCollectionDeleteModal(false));
  el.collectionDeleteConfirm.addEventListener('click', () => closeCollectionDeleteModal(true));
  el.collectionDeleteModal.addEventListener('click', (event) => {
    if (event.target === el.collectionDeleteModal) closeCollectionDeleteModal(false);
  });
  el.collectionCardRemoveClose.addEventListener('click', () => closeCollectionCardRemoveModal(false));
  el.collectionCardRemoveCancel.addEventListener('click', () => closeCollectionCardRemoveModal(false));
  el.collectionCardRemoveConfirm.addEventListener('click', () => closeCollectionCardRemoveModal(true));
  el.collectionCardRemoveModal.addEventListener('click', (event) => {
    if (event.target === el.collectionCardRemoveModal) closeCollectionCardRemoveModal(false);
  });
  el.collectionNameForm.addEventListener('submit', (event) => {
    event.preventDefault();
    closeCollectionNameModal(el.collectionNameInput.value.trim());
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !el.collectionCardRemoveModal.hidden) {
      closeCollectionCardRemoveModal(false);
      return;
    }
    if (event.key === 'Escape' && !el.collectionDeleteModal.hidden) {
      closeCollectionDeleteModal(false);
      return;
    }
    if (event.key === 'Escape' && !el.collectionNameModal.hidden) {
      closeCollectionNameModal(null);
      return;
    }
    if (event.key === 'Escape' && !el.modal.hidden) closeModal();
  });
  el.modalImageButton.addEventListener('click', (event) => setZoom(!state.zoomActive, event));
  el.modalImageButton.addEventListener('pointermove', updateZoomOriginFromPointer);
  el.modalCollectionSelect.addEventListener('change', () => updateModalCollectionUi());
  el.modalCollectionSubmit.addEventListener('click', () => { void handleAddModalCardToCollection(); });
  el.modalImageButton.addEventListener('wheel', (event) => {
    if (!state.zoomActive) return;
    event.preventDefault();
    state.zoomScale = Math.min(5, Math.max(1.4, state.zoomScale + (event.deltaY < 0 ? 0.22 : -0.22)));
    handlers.requestZoomRender();
  }, { passive: false });

  el.seriesList.addEventListener('click', (event) => {
    const expansionCard = event.target.closest('.expansion-card');
    if (!expansionCard) return;
    state.homeMode = 'library';
    setExpansionRoute(expansionCard.dataset.openSetId);
  });
  el.modeExplorerButton.addEventListener('click', () => { syncExplorerRoute(1); });
  el.modeLibraryButton.addEventListener('click', () => { navigateTo('/library'); });
  el.modeCollectionsButton.addEventListener('click', () => { navigateTo('/mis-colecciones'); });
  el.notFoundHome.addEventListener('click', () => { navigateTo('/'); });
  el.notFoundLibrary.addEventListener('click', () => { navigateTo('/library'); });
  el.explorerHome.addEventListener('click', () => { navigateTo('/'); });
  el.libraryHome.addEventListener('click', () => { navigateTo('/'); });
  el.collectionsHome.addEventListener('click', () => { navigateTo('/'); });
  el.detailBack.addEventListener('click', () => { navigateTo('/library'); });
  el.collectionBack.addEventListener('click', () => { navigateTo('/mis-colecciones'); });
  el.seriesPrev.addEventListener('click', () => {
    if (state.seriesPage <= 1) return;
    state.seriesPage -= 1;
    renderSets();
  });
  el.seriesNext.addEventListener('click', () => {
    if (state.seriesPage >= state.seriesEntries.length) return;
    state.seriesPage += 1;
    renderSets();
  });
  const debouncedDetailRender = handlers.debounce(() => {
    if (!state.activeSetId) return;
    renderActiveSet();
    syncExpansionRoute(state.activeSetId, { replace: true });
    persistUiState();
  }, 120);
  el.detailSearch.addEventListener('input', () => {
    state.detailQuery = el.detailSearch.value;
    debouncedDetailRender();
  });
  el.detailKindFilter.addEventListener('change', () => {
    state.detailKind = el.detailKindFilter.value;
    renderActiveSet();
    syncExpansionRoute(state.activeSetId, { replace: true });
    persistUiState();
  });
  el.detailSortFilter.addEventListener('change', () => {
    state.detailSort = el.detailSortFilter.value;
    renderActiveSet();
    syncExpansionRoute(state.activeSetId, { replace: true });
    persistUiState();
  });
  el.detailCreateCollectionButton.addEventListener('click', handleCreateCollectionFromDetail);
  el.expansionCards.addEventListener('click', handleCardTrigger);
  el.explorerResults.addEventListener('click', handleCardTrigger);
  el.expansionCards.addEventListener('pointerenter', handleCardHover, true);
  el.explorerResults.addEventListener('pointerenter', handleCardHover, true);
  el.runFiltersButton.addEventListener('click', () => {
    state.explorerPage = 1;
    syncExplorerRoute(1);
  });
  el.createCollectionButton.addEventListener('click', handleCreateCollection);
  el.clearFiltersButton.addEventListener('click', () => {
    resetExplorerState();
    persistUiState();
    syncExplorerRoute(1, { replace: true });
  });
  el.collectionsList.addEventListener('click', (event) => {
    const deleteTrigger = event.target.closest('[data-delete-collection-id]');
    if (deleteTrigger) {
      void handleDeleteCollectionById(deleteTrigger.dataset.deleteCollectionId);
      return;
    }
    const trigger = event.target.closest('[data-open-collection-id]');
    if (!trigger) return;
    navigateTo(collectionPath(trigger.dataset.openCollectionId));
  });
  el.collectionCards.addEventListener('click', async (event) => {
    const removeTrigger = event.target.closest('[data-remove-collection-card]');
    if (removeTrigger) {
      const collectionId = removeTrigger.dataset.removeCollectionCard;
      const cardId = removeTrigger.dataset.cardId;
      const collection = await getCollection(collectionId, { force: true });
      const card = collection?.cards?.find((entry) => entry.id === cardId);
      if (!collection || !card) return;
      const confirmed = await requestCollectionCardRemoval(collection, card);
      if (!confirmed) return;
      const updatedCollection = await removeCardFromCollection(collectionId, cardId);
      if (!updatedCollection) return;
      state.collections = await listCollections();
      await renderCollectionDetail();
      if (!el.collectionsShell.hidden) void handlers.renderCollectionsList();
      return;
    }
    const trigger = event.target.closest('[data-toggle-collection-card]')
      || event.target.closest('.collection-entry')?.querySelector('[data-toggle-collection-card]');
    if (!trigger) return;
    if (event.target.closest('a')) return;
    const collectionId = trigger.dataset.toggleCollectionCard;
    const cardId = trigger.dataset.cardId;
    const collection = await getCollection(collectionId, { force: true });
    const card = collection?.cards?.find((entry) => entry.id === cardId);
    if (!collection || !card) return;
    const nextOwned = !card.owned;
    const updatedCollection = await updateCollectionCardOwnership(collectionId, cardId, nextOwned);
    if (!updatedCollection) return;
    trigger.closest('.collection-entry')?.classList.toggle('is-owned', nextOwned);
    trigger.setAttribute('aria-pressed', String(nextOwned));
    refreshCollectionSummary(updatedCollection);
    state.collections = await listCollections();
    if (!el.collectionsShell.hidden) void handlers.renderCollectionsList();
    if ((state.collectionOwnershipFilter === 'owned' && !nextOwned) || (state.collectionOwnershipFilter === 'missing' && nextOwned)) {
      void renderCollectionDetail();
    }
  });
  el.collectionOwnershipFilters.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-collection-filter]');
    if (!trigger) return;
    state.collectionOwnershipFilter = trigger.dataset.collectionFilter;
    void renderCollectionDetail();
  });
  el.authControls.addEventListener('click', (event) => {
    const trigger = event.target.closest('#auth-logout');
    if (!trigger) return;
    void signOut();
  });
  el.collectionRename.addEventListener('click', handleRenameCollection);
  el.collectionDelete.addEventListener('click', handleDeleteCollection);
  window.addEventListener('scroll', () => {
    state.isScrollActive = true;
    window.clearTimeout(state.scrollIdleTimer);
    state.scrollIdleTimer = window.setTimeout(() => {
      state.isScrollActive = false;
    }, 140);
  }, { passive: true });
  el.explorerPrev.addEventListener('click', () => {
    if (state.explorerPage > 1) syncExplorerRoute(state.explorerPage - 1);
  });
  el.explorerNext.addEventListener('click', () => {
    if (state.explorerPage < state.explorerTotalPages) syncExplorerRoute(state.explorerPage + 1);
  });
  window.addEventListener('popstate', syncRoute);
}
