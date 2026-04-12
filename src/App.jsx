import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import { fetchAllExplorerCardsFromApi } from './api.js';
import { getAuthSession, initializeAuth, setAuthChangeHandler } from './auth.js';
import { restoreUiState, saveUiState } from './cache.js';
import { addCardToCollection, createCollection, deleteCollection, getCollection, removeCardFromCollection, renameCollection, updateCollectionCardOwnership } from './collections.js';
import { buildSeriesEntries, compareSetsByNewest, enrichCardWithSet } from './app-data.js';
import { collectionCardExists, collectionFiltersSummary, collectionNameFromFilters, detailCollectionFiltersSummary, detailCollectionName, filterCollectionCards, normalizeCollectionCards } from './app-collections.js';
import { buildCollectionQuery, buildDetailQuery, buildExplorerFilterChips, buildExplorerQuery, compareDetailCards, DEFAULT_DETAIL_SORT, DEFAULT_EXPLORER_SORT, DEFAULT_HOME_MODE, getHomeModeCaption, hasActiveFilters, parseCollectionQuery, parseDetailQuery, parseExplorerQuery, sortExplorerCards } from './app-query.js';
import { collectionPath, expansionPath, routeCollectionId, routeScreen, routeSetId } from './app-routing.js';
import { AuthBar, CardModal, CollectionsScreen, CollectionDetailScreen, ExpansionScreen, ExplorerScreen, LandingScreen, LibraryScreen, NamePromptModal, NotFoundScreen, PromptModal } from './app-ui.jsx';
import { useCardModalControls, useCollectionsData, useExplorerSearch, useLocationState, useSetCards, useSetCatalog } from './app-hooks.js';
import { debounce } from './utils.js';

export function App() {
  const restoredUiState = useMemo(() => restoreUiState() || {}, []);
  const { location, navigateTo } = useLocationState();
  const screen = routeScreen(location.pathname);
  const activeSetId = routeSetId(location.pathname);
  const activeCollectionId = routeCollectionId(location.pathname);

  const [homeMode, setHomeMode] = useState(restoredUiState.homeMode === 'explorer' ? 'explorer' : DEFAULT_HOME_MODE);
  const [seriesPage, setSeriesPage] = useState(Number(restoredUiState.seriesPage) > 0 ? Number(restoredUiState.seriesPage) : 1);
  const [seriesQuery, setSeriesQuery] = useState(restoredUiState.seriesQuery || '');
  const [detailQuery, setDetailQuery] = useState(restoredUiState.detailQuery || '');
  const [detailKind, setDetailKind] = useState(restoredUiState.detailKind || '');
  const [detailSort, setDetailSort] = useState(restoredUiState.detailSort || DEFAULT_DETAIL_SORT);
  const [user, setUser] = useState(getAuthSession());
  const [explorerFilters, setExplorerFilters] = useState(() => parseExplorerQuery(location.search).filters);
  const [explorerSort, setExplorerSort] = useState(() => parseExplorerQuery(location.search).sort || DEFAULT_EXPLORER_SORT);
  const [collectionOwnershipFilter, setCollectionOwnershipFilter] = useState('all');
  const [modalCollectionSelection, setModalCollectionSelection] = useState('');
  const [modalCollectionStatus, setModalCollectionStatus] = useState('');
  const [modalCollectionsLoading, setModalCollectionsLoading] = useState(false);
  const [namePrompt, setNamePrompt] = useState(null);
  const [deletePrompt, setDeletePrompt] = useState(null);
  const [removePrompt, setRemovePrompt] = useState(null);
  const [isPending, startUiTransition] = useTransition();

  const deferredDetailQuery = useDeferredValue(detailQuery);
  const { sets, setsStatus, isSetsLoading } = useSetCatalog();
  const setLookup = useMemo(() => new Map(sets.map((set) => [set.id, set])), [sets]);
  const expansionFilterOptions = useMemo(() => [...sets].sort(compareSetsByNewest), [sets]);
  const seriesEntries = useMemo(() => buildSeriesEntries([...sets].sort(compareSetsByNewest)), [sets]);
  const filteredSeriesEntries = useMemo(() => {
    const query = seriesQuery.trim().toLowerCase();
    if (!query) return seriesEntries;
    return seriesEntries
      .map(([seriesName, groupSets]) => [
        seriesName,
        groupSets.filter((set) => `${set.displayName} ${set.code} ${seriesName}`.toLowerCase().includes(query))
      ])
      .filter(([, groupSets]) => groupSets.length);
  }, [seriesEntries, seriesQuery]);
  const currentSeriesEntry = useMemo(
    () => filteredSeriesEntries[Math.max(0, Math.min(seriesPage - 1, Math.max(filteredSeriesEntries.length - 1, 0)))] || null,
    [filteredSeriesEntries, seriesPage]
  );

  const currentSet = activeSetId ? setLookup.get(activeSetId) || null : null;
  const { cardsBySet, loadingSetId } = useSetCards(currentSet);
  const activeSetCards = currentSet ? cardsBySet.get(currentSet.id) || [] : [];
  const explorerHasActiveFilters = hasActiveFilters(explorerFilters);
  const appliedExplorerState = useMemo(() => parseExplorerQuery(location.search), [location.search]);
  const hasPendingExplorerChanges = useMemo(() => {
    const appliedFilters = appliedExplorerState.filters;
    return explorerSort !== (appliedExplorerState.sort || DEFAULT_EXPLORER_SORT)
      || explorerFilters.cardQuery !== appliedFilters.cardQuery
      || explorerFilters.expansion !== appliedFilters.expansion
      || explorerFilters.artist !== appliedFilters.artist
      || explorerFilters.cardKind !== appliedFilters.cardKind
      || explorerFilters.element !== appliedFilters.element
      || explorerFilters.rarity !== appliedFilters.rarity;
  }, [appliedExplorerState, explorerFilters, explorerSort]);
  const { explorerResult, explorerStatus, isExplorerLoading } = useExplorerSearch({ screen, locationSearch: location.search, setLookup });
  const {
    collections,
    collectionsStatus,
    isCollectionsLoading,
    hasLoadedCollections,
    refreshCollections,
    mergeCollectionIntoState,
    removeCollectionFromState
  } = useCollectionsData({ user, screen, activeCollectionId });
  const {
    modalState,
    modalImageButtonRef,
    modalImageRef,
    openCardModal,
    closeModal,
    schedulePrefetchLargeImage,
    toggleZoom,
    updateZoomOrigin,
    handleZoomWheel
  } = useCardModalControls({ cardsBySet, explorerCards: explorerResult.cards });

  const activeCollection = useMemo(() => collections.find((entry) => entry.id === activeCollectionId) || null, [collections, activeCollectionId]);
  const enrichCard = useCallback((card) => enrichCardWithSet(card, setLookup.get(card.setId) || null), [setLookup]);

  const filteredDetailCards = useMemo(() => {
    const query = deferredDetailQuery.trim().toLowerCase();
    return activeSetCards
      .filter((card) => detailKind ? card.supertype === detailKind : true)
      .filter((card) => {
        if (!query) return true;
        return [card.name, card.number, card.supertype, card.rarity, card.artist, ...card.subtypes, ...card.types].join(' ').toLowerCase().includes(query);
      })
      .sort((left, right) => compareDetailCards(detailSort, left, right));
  }, [activeSetCards, deferredDetailQuery, detailKind, detailSort]);

  const explorerActiveFilterChips = useMemo(() => buildExplorerFilterChips(explorerFilters, expansionFilterOptions), [explorerFilters, expansionFilterOptions]);
  const explorerCardsWithSet = useMemo(() => sortExplorerCards(explorerResult.cards.map((card) => enrichCard(card)), explorerSort, setLookup), [enrichCard, explorerResult.cards, explorerSort, setLookup]);
  const visibleCollectionCards = useMemo(() => filterCollectionCards(activeCollection?.cards || [], collectionOwnershipFilter), [activeCollection, collectionOwnershipFilter]);
  const homeCaption = getHomeModeCaption(homeMode);

  const collectionsWithMetrics = useMemo(() => collections.map((collection) => {
    const cards = collection.cards || [];
    const ownedCount = cards.filter((card) => card.owned).length;
    const missingCount = Math.max(cards.length - ownedCount, 0);
    const filterBits = Object.entries(collection.filters || {})
      .filter(([, value]) => String(value || '').trim())
      .map(([key, value]) => `${key}: ${value}`);
    const cardsCount = cards.length;
    const completionPercent = cardsCount ? Math.round((ownedCount / cardsCount) * 100) : 0;
    return { collection, ownedCount, missingCount, filterBits, cardsCount, completionPercent };
  }), [collections]);
  const activeCollectionFilterBits = useMemo(
    () => Object.entries(activeCollection?.filters || {}).filter(([, value]) => String(value || '').trim()),
    [activeCollection]
  );
  const topCollectionTotals = useMemo(() => {
    const cards = activeCollection?.cards || [];
    const ownedCount = cards.filter((card) => card.owned).length;
    return { total: cards.length, ownedCount, missingCount: Math.max(cards.length - ownedCount, 0) };
  }, [activeCollection]);

  const modalCard = useMemo(() => {
    if (!modalState.setId || !modalState.cardId) return null;
    const fromSet = (cardsBySet.get(modalState.setId) || []).find((card) => card.id === modalState.cardId);
    if (fromSet) return enrichCard(fromSet);
    const fromExplorer = explorerResult.cards.find((card) => card.id === modalState.cardId && card.setId === modalState.setId);
    return fromExplorer ? enrichCard(fromExplorer) : null;
  }, [cardsBySet, enrichCard, explorerResult.cards, modalState.cardId, modalState.setId]);

  const modalCardCollections = useMemo(() => {
    if (!modalCard) return [];
    return collections.filter((collection) => collectionCardExists(collection, modalCard.id));
  }, [collections, modalCard]);

  const modalSequence = useMemo(() => {
    if (modalState.source === 'expansion' && currentSet) return filteredDetailCards.map((card) => ({ setId: currentSet.id, id: card.id }));
    if (modalState.source === 'explorer') return explorerCardsWithSet.map((card) => ({ setId: card.setId, id: card.id }));
    return [];
  }, [currentSet, explorerCardsWithSet, filteredDetailCards, modalState.source]);
  const modalIndex = useMemo(() => modalSequence.findIndex((entry) => entry.id === modalState.cardId && entry.setId === modalState.setId), [modalSequence, modalState.cardId, modalState.setId]);
  const modalPrevCard = modalIndex > 0 ? modalSequence[modalIndex - 1] : null;
  const modalNextCard = modalIndex >= 0 && modalIndex < modalSequence.length - 1 ? modalSequence[modalIndex + 1] : null;

  useEffect(() => {
    saveUiState({
      homeMode,
      activeSetId,
      detailQuery,
      detailKind,
      detailSort,
      seriesPage,
      seriesQuery
    });
  }, [activeSetId, detailKind, detailQuery, detailSort, homeMode, seriesPage, seriesQuery]);

  useEffect(() => {
    if (screen === 'explorer') setHomeMode('explorer');
    if (screen === 'collections') setHomeMode('collections');
    if (screen === 'library' || screen === 'expansion') setHomeMode('library');
  }, [screen]);

  useEffect(() => {
    const { filters, sort } = parseExplorerQuery(location.search);
    setExplorerFilters(filters);
    setExplorerSort(sort || DEFAULT_EXPLORER_SORT);
  }, [location.search]);

  useEffect(() => {
    if (screen !== 'expansion') return;
    const detailState = parseDetailQuery(location.search);
    setDetailQuery(detailState.detailQuery);
    setDetailKind(detailState.detailKind);
    setDetailSort(detailState.detailSort);
  }, [location.search, screen]);

  useEffect(() => {
    if (screen !== 'collections' || !activeCollectionId) return;
    setCollectionOwnershipFilter(parseCollectionQuery(location.search));
  }, [activeCollectionId, location.search, screen]);

  useEffect(() => {
    if (seriesPage > Math.max(filteredSeriesEntries.length, 1)) {
      setSeriesPage(1);
    }
  }, [filteredSeriesEntries.length, seriesPage]);

  useEffect(() => {
    setAuthChangeHandler((session) => {
      setUser(session);
    });
    void initializeAuth();
    return () => setAuthChangeHandler(() => {});
  }, []);

  useEffect(() => {
    if (screen !== 'expansion' || !activeSetId || !sets.length) return;
    if (setLookup.has(activeSetId)) return;
    navigateTo('/library', { replace: true });
  }, [activeSetId, navigateTo, screen, setLookup, sets.length]);

  useEffect(() => {
    if (!modalCard || !user) return;
    setModalCollectionsLoading(true);
    setModalCollectionStatus('Cargando tus colecciones...');
    void refreshCollections(false)
      .then((nextCollections) => {
        const preferred = nextCollections.find((collection) => !collectionCardExists(collection, modalCard.id));
        setModalCollectionSelection(preferred?.id || nextCollections[0]?.id || '');
        setModalCollectionStatus('');
      })
      .catch((error) => {
        console.error(error);
        setModalCollectionStatus('No se pudieron cargar tus colecciones ahora mismo.');
      })
      .finally(() => setModalCollectionsLoading(false));
  }, [modalCard, refreshCollections, user]);

  const updateExpansionRoute = useCallback((setId, detailState, replace = false) => {
    const set = setLookup.get(setId);
    if (!set) return;
    navigateTo(expansionPath(set), { replace, query: buildDetailQuery(detailState) });
  }, [navigateTo, setLookup]);

  const debouncedDetailRouteSync = useMemo(() => debounce((nextQuery, nextKind, nextSort, setId) => {
    if (!setId) return;
    updateExpansionRoute(setId, { detailQuery: nextQuery, detailKind: nextKind, detailSort: nextSort }, true);
  }, 120), [updateExpansionRoute]);

  useEffect(() => {
    if (screen !== 'expansion' || !activeSetId) return;
    debouncedDetailRouteSync(detailQuery, detailKind, detailSort, activeSetId);
  }, [activeSetId, debouncedDetailRouteSync, detailKind, detailQuery, detailSort, screen]);

  const requestCollectionName = useCallback((config) => new Promise((resolve) => setNamePrompt({ ...config, resolve })), []);
  const requestCollectionDeletion = useCallback((collection) => new Promise((resolve) => setDeletePrompt({ collection, resolve })), []);
  const requestCollectionCardRemoval = useCallback((collection, card) => new Promise((resolve) => setRemovePrompt({ collection, card, resolve })), []);

  const handleRunExplorerSearch = useCallback(() => {
    navigateTo('/explorer', { query: buildExplorerQuery(explorerFilters, 1, explorerSort) });
  }, [explorerFilters, explorerSort, navigateTo]);

  const handleClearFilters = useCallback(() => {
    setExplorerFilters({ cardQuery: '', expansion: '', artist: '', cardKind: '', element: '', rarity: '' });
    setExplorerSort(DEFAULT_EXPLORER_SORT);
    navigateTo('/explorer', { replace: true });
  }, [navigateTo]);

  const handleRemoveExplorerFilter = useCallback((key) => {
    const nextFilters = { ...explorerFilters, [key]: '' };
    setExplorerFilters(nextFilters);
  }, [explorerFilters]);

  const handleApplyExplorerPreset = useCallback((preset) => {
    const nextFilters = { cardQuery: '', expansion: '', artist: '', cardKind: '', element: '', rarity: '', ...preset };
    setExplorerFilters(nextFilters);
  }, []);

  const handleExplorerSortChange = useCallback((nextSort) => {
    setExplorerSort(nextSort);
  }, []);

  const handleCreateCollection = useCallback(async () => {
    const chosenName = await requestCollectionName({
      kicker: 'Crear coleccion',
      title: 'Convierte estos filtros en una coleccion',
      copy: 'Se guardaran todas las cartas que coinciden con tu busqueda para que puedas marcar facilmente cuales ya tienes.',
      defaultValue: collectionNameFromFilters(explorerFilters, expansionFilterOptions.find((set) => set.id === explorerFilters.expansion)?.displayName || ''),
      submitLabel: 'Crear coleccion',
      loadingLabel: 'Creando coleccion',
      onSubmit: async (collectionName) => {
        const cards = await fetchAllExplorerCardsFromApi(explorerFilters, setLookup);
        if (!cards.length) return;
        const optimisticCollection = {
          id: `temp-${Date.now()}`,
          name: collectionName,
          filters: collectionFiltersSummary(explorerFilters, expansionFilterOptions.find((set) => set.id === explorerFilters.expansion)?.displayName || ''),
          totalCount: cards.length,
          cards: normalizeCollectionCards(cards, enrichCard),
          updatedAt: new Date().toISOString()
        };
        mergeCollectionIntoState(optimisticCollection);

        try {
          const collection = await createCollection({
            name: collectionName,
            filters: optimisticCollection.filters,
            totalCount: cards.length,
            cards: optimisticCollection.cards
          });
          removeCollectionFromState(optimisticCollection.id);
          mergeCollectionIntoState(collection);
          navigateTo(collectionPath(collection.id));
        } catch (error) {
          removeCollectionFromState(optimisticCollection.id);
          throw error;
        }
      }
    });

    if (chosenName === null || !chosenName.trim()) return;
  }, [enrichCard, expansionFilterOptions, explorerFilters, mergeCollectionIntoState, navigateTo, removeCollectionFromState, requestCollectionName, setLookup]);

  const handleCreateCollectionFromDetail = useCallback(async () => {
    if (!currentSet || !filteredDetailCards.length) return;
    const cards = filteredDetailCards.map(enrichCard);
    const chosenName = await requestCollectionName({
      kicker: 'Crear desde expansion',
      title: 'Guarda esta seleccion como coleccion',
      copy: 'Usaremos las cartas visibles en esta expansion, respetando los filtros que tienes activos en este momento.',
      defaultValue: detailCollectionName(currentSet),
      submitLabel: 'Guardar coleccion',
      loadingLabel: 'Guardando coleccion',
      onSubmit: async (collectionName) => {
        const optimisticCollection = {
          id: `temp-${Date.now()}`,
          name: collectionName,
          filters: detailCollectionFiltersSummary(currentSet, { detailQuery, detailKind, detailSort }),
          totalCount: cards.length,
          cards: normalizeCollectionCards(cards, enrichCard),
          updatedAt: new Date().toISOString()
        };
        mergeCollectionIntoState(optimisticCollection);

        try {
          const collection = await createCollection({
            name: collectionName,
            filters: optimisticCollection.filters,
            totalCount: cards.length,
            cards: optimisticCollection.cards
          });
          removeCollectionFromState(optimisticCollection.id);
          mergeCollectionIntoState(collection);
          navigateTo(collectionPath(collection.id));
        } catch (error) {
          removeCollectionFromState(optimisticCollection.id);
          throw error;
        }
      }
    });
    if (chosenName === null || !chosenName.trim()) return;
  }, [currentSet, detailKind, detailQuery, detailSort, enrichCard, filteredDetailCards, mergeCollectionIntoState, navigateTo, removeCollectionFromState, requestCollectionName]);

  const handleRenameCollection = useCallback(async () => {
    if (!activeCollection) return;
    const chosenName = await requestCollectionName({
      kicker: 'Renombrar coleccion',
      title: 'Actualiza el nombre de esta coleccion',
      copy: 'El nuevo nombre se vera en el listado principal y en el detalle de la coleccion.',
      defaultValue: activeCollection.name,
      submitLabel: 'Guardar nombre',
      loadingLabel: 'Guardando nombre',
      onSubmit: async (collectionName) => {
        const previousCollection = activeCollection;
        mergeCollectionIntoState({ ...activeCollection, name: collectionName, updatedAt: new Date().toISOString() });

        try {
          const renamedCollection = await renameCollection(activeCollection.id, collectionName);
          mergeCollectionIntoState(renamedCollection);
        } catch (error) {
          mergeCollectionIntoState(previousCollection);
          throw error;
        }
      }
    });
    if (chosenName === null || !chosenName.trim()) return;
  }, [activeCollection, mergeCollectionIntoState, requestCollectionName]);

  const handleDeleteCollection = useCallback(async (collectionId, redirectToList = false) => {
    const collection = collectionId === activeCollection?.id ? activeCollection : collections.find((entry) => entry.id === collectionId) || await getCollection(collectionId, { force: true });
    if (!collection) return;
    const confirmed = await requestCollectionDeletion(collection);
    if (!confirmed) return;

    removeCollectionFromState(collection.id);
    if (redirectToList) navigateTo('/mis-colecciones');

    try {
      await deleteCollection(collection.id);
    } catch (error) {
      console.error(error);
      mergeCollectionIntoState(collection);
      if (redirectToList) navigateTo(collectionPath(collection.id));
    }
  }, [activeCollection, collections, mergeCollectionIntoState, navigateTo, removeCollectionFromState, requestCollectionDeletion]);

  const handleRemoveCollectionCard = useCallback(async (collectionId, cardId) => {
    const collection = collections.find((entry) => entry.id === collectionId) || await getCollection(collectionId, { force: true });
    const card = collection?.cards?.find((entry) => entry.id === cardId);
    if (!collection || !card) return;
    const confirmed = await requestCollectionCardRemoval(collection, card);
    if (!confirmed) return;

    mergeCollectionIntoState({
      ...collection,
      cards: collection.cards.filter((entry) => entry.id !== cardId),
      updatedAt: new Date().toISOString()
    });

    try {
      const updatedCollection = await removeCardFromCollection(collectionId, cardId);
      mergeCollectionIntoState(updatedCollection);
    } catch (error) {
      console.error(error);
      mergeCollectionIntoState(collection);
    }
  }, [collections, mergeCollectionIntoState, requestCollectionCardRemoval]);

  const handleToggleCollectionCard = useCallback(async (collectionId, cardId) => {
    const collection = collections.find((entry) => entry.id === collectionId) || await getCollection(collectionId, { force: true });
    const card = collection?.cards?.find((entry) => entry.id === cardId);
    if (!collection || !card) return;
    const nextOwned = !card.owned;

    mergeCollectionIntoState({
      ...collection,
      cards: collection.cards.map((entry) => (entry.id === cardId ? { ...entry, owned: nextOwned } : entry)),
      updatedAt: new Date().toISOString()
    });

    try {
      const updatedCollection = await updateCollectionCardOwnership(collectionId, cardId, nextOwned);
      mergeCollectionIntoState(updatedCollection);
    } catch (error) {
      console.error(error);
      mergeCollectionIntoState(collection);
    }
  }, [collections, mergeCollectionIntoState]);

  const handleAddModalCardToCollection = useCallback(async () => {
    if (!modalCard || !modalCollectionSelection) return;
    const collection = collections.find((entry) => entry.id === modalCollectionSelection);
    if (!collection || collectionCardExists(collection, modalCard.id)) return;
    setModalCollectionStatus(`Agregando la carta a "${collection.name}"...`);
    try {
      await addCardToCollection(collection.id, normalizeCollectionCards([modalCard], enrichCard)[0]);
      await refreshCollections(true);
      setModalCollectionStatus(`Carta agregada a "${collection.name}".`);
    } catch (error) {
      if (error?.status === 409) {
        await refreshCollections(true);
        setModalCollectionStatus(`La carta ya estaba guardada en "${collection.name}".`);
        return;
      }
      console.error(error);
      setModalCollectionStatus('No se pudo agregar la carta a esta coleccion.');
    }
  }, [collections, enrichCard, modalCard, modalCollectionSelection, refreshCollections]);

  const modalSelectedCollection = collections.find((entry) => entry.id === modalCollectionSelection) || null;
  const modalCardAlreadyAdded = modalSelectedCollection && modalCard ? collectionCardExists(modalSelectedCollection, modalCard.id) : false;
  const modalCollectionSubmitLabel = modalCollectionsLoading ? 'Agregando...' : modalCardAlreadyAdded ? 'Ya agregada' : 'Agregar a coleccion';

  const handleCollectionOwnershipFilterChange = useCallback((nextFilter) => {
    setCollectionOwnershipFilter(nextFilter);
    if (!activeCollection) return;
    navigateTo(collectionPath(activeCollection.id), { replace: true, query: buildCollectionQuery(nextFilter) });
  }, [activeCollection, navigateTo]);

  const handleOpenMissingView = useCallback((collectionId) => {
    navigateTo(collectionPath(collectionId), { query: buildCollectionQuery('missing') });
  }, [navigateTo]);

  const openSiblingCard = useCallback((entry) => {
    if (!entry) return;
    openCardModal(entry.setId, entry.id, modalState.source);
    setModalCollectionStatus('');
  }, [modalState.source, openCardModal]);

  return (
    <>
      <main className="shell">
        <AuthBar user={user} />

        {screen === 'landing' && <LandingScreen homeMode={homeMode} homeCaption={homeCaption} navigateTo={navigateTo} />}

        {screen === 'explorer' && <ExplorerScreen navigateTo={navigateTo} explorerFilters={explorerFilters} setExplorerFilters={setExplorerFilters} expansionFilterOptions={expansionFilterOptions} handleRunExplorerSearch={handleRunExplorerSearch} user={user} explorerHasActiveFilters={explorerHasActiveFilters} explorerResult={explorerResult} handleCreateCollection={handleCreateCollection} handleClearFilters={handleClearFilters} explorerStatus={explorerStatus} isExplorerLoading={isExplorerLoading} explorerCardsWithSet={explorerCardsWithSet} schedulePrefetchLargeImage={schedulePrefetchLargeImage} openCardModal={openCardModal} buildExplorerQuery={buildExplorerQuery} explorerSort={explorerSort} setExplorerSort={handleExplorerSortChange} explorerActiveFilterChips={explorerActiveFilterChips} handleRemoveExplorerFilter={handleRemoveExplorerFilter} handleApplyExplorerPreset={handleApplyExplorerPreset} hasPendingExplorerChanges={hasPendingExplorerChanges} />}

        {screen === 'library' && <LibraryScreen setsStatus={isSetsLoading && !sets.length ? 'Cargando expansiones...' : setsStatus} navigateTo={navigateTo} seriesEntries={seriesEntries} filteredSeriesEntries={filteredSeriesEntries} seriesPage={seriesPage} setSeriesPage={setSeriesPage} currentSeriesEntry={currentSeriesEntry} seriesQuery={seriesQuery} setSeriesQuery={setSeriesQuery} />}

        {screen === 'expansion' && currentSet && <ExpansionScreen navigateTo={navigateTo} user={user} filteredDetailCards={filteredDetailCards} handleCreateCollectionFromDetail={handleCreateCollectionFromDetail} currentSet={currentSet} activeSetCards={activeSetCards} detailQuery={detailQuery} setDetailQuery={setDetailQuery} startUiTransition={startUiTransition} detailKind={detailKind} setDetailKind={setDetailKind} detailSort={detailSort} setDetailSort={setDetailSort} loadingSetId={loadingSetId} isPending={isPending} schedulePrefetchLargeImage={schedulePrefetchLargeImage} openCardModal={openCardModal} />}

        {screen === 'collections' && !activeCollectionId && <CollectionsScreen user={user} collectionsStatus={collectionsStatus} isCollectionsLoading={isCollectionsLoading} navigateTo={navigateTo} collectionsWithMetrics={collectionsWithMetrics} handleDeleteCollection={handleDeleteCollection} openMissingView={handleOpenMissingView} />}

        {screen === 'collections' && activeCollectionId && activeCollection && <CollectionDetailScreen activeCollection={activeCollection} navigateTo={navigateTo} isCollectionsLoading={isCollectionsLoading} handleRenameCollection={handleRenameCollection} handleDeleteCollection={handleDeleteCollection} topCollectionTotals={topCollectionTotals} activeCollectionFilterBits={activeCollectionFilterBits} collectionOwnershipFilter={collectionOwnershipFilter} setCollectionOwnershipFilter={handleCollectionOwnershipFilterChange} visibleCollectionCards={visibleCollectionCards} handleRemoveCollectionCard={handleRemoveCollectionCard} handleToggleCollectionCard={handleToggleCollectionCard} showMissingOnly={collectionOwnershipFilter === 'missing'} />}

        {screen === 'collections' && activeCollectionId && !activeCollection && isCollectionsLoading && <CollectionDetailScreen activeCollection={{ id: activeCollectionId, name: 'Cargando...', cards: [], totalCount: 0, filters: {} }} navigateTo={navigateTo} isCollectionsLoading handleRenameCollection={handleRenameCollection} handleDeleteCollection={handleDeleteCollection} topCollectionTotals={{ total: 0, ownedCount: 0, missingCount: 0 }} activeCollectionFilterBits={[]} collectionOwnershipFilter={collectionOwnershipFilter} setCollectionOwnershipFilter={handleCollectionOwnershipFilterChange} visibleCollectionCards={[]} handleRemoveCollectionCard={handleRemoveCollectionCard} handleToggleCollectionCard={handleToggleCollectionCard} showMissingOnly={collectionOwnershipFilter === 'missing'} />}

        {screen === 'collections' && activeCollectionId && !activeCollection && hasLoadedCollections && !isCollectionsLoading && <NotFoundScreen navigateTo={navigateTo} />}

        {screen === 'not-found' && <NotFoundScreen navigateTo={navigateTo} />}

        <p className="footnote">Fuente de datos: API publica de Pokemon TCG en pokemontcg.io. Explora sets, guarda colecciones y sigue tu progreso con acceso rapido a faltantes.</p>
      </main>

      <CardModal modalCard={modalCard} closeModal={closeModal} modalImageButtonRef={modalImageButtonRef} toggleZoom={toggleZoom} updateZoomOrigin={updateZoomOrigin} handleZoomWheel={handleZoomWheel} modalImageRef={modalImageRef} currentSet={currentSet} modalCollectionSelection={modalCollectionSelection} setModalCollectionSelection={setModalCollectionSelection} user={user} modalCollectionsLoading={modalCollectionsLoading} collections={collections} modalSelectedCollection={modalSelectedCollection} modalCardAlreadyAdded={modalCardAlreadyAdded} handleAddModalCardToCollection={handleAddModalCardToCollection} modalCollectionSubmitLabel={modalCollectionSubmitLabel} modalCollectionStatus={modalCollectionStatus} modalCardCollections={modalCardCollections} modalPrevCard={modalPrevCard} modalNextCard={modalNextCard} openSiblingCard={openSiblingCard} />

      <NamePromptModal prompt={namePrompt} onResolve={async (result) => {
        const activePrompt = namePrompt;
        if (!activePrompt) return;
        if (result === null) {
          setNamePrompt(null);
          activePrompt.resolve?.(null);
          return;
        }
        try {
          if (activePrompt.onSubmit) {
            await activePrompt.onSubmit(result);
          }
          setNamePrompt(null);
          activePrompt.resolve?.(result);
        } catch (error) {
          console.error(error);
          throw error;
        }
      }} />

      <PromptModal
        open={Boolean(deletePrompt)}
        modalId="collection-delete-modal"
        confirmButtonId="collection-delete-confirm"
        kicker="Eliminar coleccion"
        title={deletePrompt ? `Vas a borrar "${deletePrompt.collection.name}"` : ''}
        copy={deletePrompt ? `Se eliminaran ${Number(deletePrompt.collection.cards?.length || 0).toLocaleString()} cartas guardadas y esta accion no se puede deshacer.` : ''}
        confirmLabel="Eliminar coleccion"
        danger
        onClose={() => {
          const resolve = deletePrompt?.resolve;
          setDeletePrompt(null);
          resolve?.(false);
        }}
        onConfirm={() => {
          const resolve = deletePrompt?.resolve;
          setDeletePrompt(null);
          resolve?.(true);
        }}
      >
        {deletePrompt && <div className="detail-fact collection-delete-fact"><span>Coleccion</span><strong id="collection-delete-title"><span id="collection-delete-name">{deletePrompt.collection.name}</span></strong></div>}
      </PromptModal>

      <PromptModal
        open={Boolean(removePrompt)}
        modalId="collection-card-remove-modal"
        confirmButtonId="collection-card-remove-confirm"
        kicker="Quitar carta"
        title={removePrompt ? `Quitar "${removePrompt.card.name}"` : ''}
        copy={removePrompt ? `La carta se quitara de la coleccion "${removePrompt.collection.name}" y dejara de contarse en su progreso.` : ''}
        confirmLabel="Quitar carta"
        danger
        onClose={() => {
          const resolve = removePrompt?.resolve;
          setRemovePrompt(null);
          resolve?.(false);
        }}
        onConfirm={() => {
          const resolve = removePrompt?.resolve;
          setRemovePrompt(null);
          resolve?.(true);
        }}
      >
        {removePrompt && <div className="detail-fact collection-delete-fact"><span>Carta</span><strong id="collection-card-remove-name">{removePrompt.card.name}</strong></div>}
      </PromptModal>
    </>
  );
}
