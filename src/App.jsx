import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { fetchAllExplorerCardsFromApi, fetchCardsForSetFromApi, fetchExplorerPageFromApi, fetchSetsFromApi } from './api.js';
import { getAuthSession, initializeAuth, setAuthChangeHandler } from './auth.js';
import { cacheRead, cacheWrite, isFresh, restoreUiState, saveUiState } from './cache.js';
import { addCardToCollection, createCollection, deleteCollection, getCollection, listCollections, removeCardFromCollection, renameCollection, updateCollectionCardOwnership } from './collections.js';
import { CARDS_TTL, SEARCH_TTL, SETS_TTL } from './config.js';
import { buildExplorerCacheKey, buildSeriesEntries, compareSetsByNewest, enrichCardWithSet } from './app-data.js';
import { collectionCardExists, collectionFiltersSummary, collectionNameFromFilters, detailCollectionFiltersSummary, detailCollectionName, filterCollectionCards, normalizeCollectionCards } from './app-collections.js';
import { buildRelativeUrl, collectionPath, expansionPath, routeCollectionId, routeScreen, routeSetId } from './app-routing.js';
import { AuthBar, CardModal, CollectionsScreen, CollectionDetailScreen, ExpansionScreen, ExplorerScreen, LandingScreen, LibraryScreen, NotFoundScreen, PromptModal } from './app-ui.jsx';
import { compareCardNumbers, debounce } from './utils.js';

const DEFAULT_HOME_MODE = 'library';
const DEFAULT_DETAIL_SORT = 'number-asc';

function useLocationState() {
  const [location, setLocation] = useState(() => ({
    pathname: window.location.pathname,
    search: window.location.search
  }));

  useEffect(() => {
    const handlePopState = () => {
      setLocation({ pathname: window.location.pathname, search: window.location.search });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((path, { replace = false, query = null } = {}) => {
    const nextUrl = buildRelativeUrl(path, query);
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl === currentUrl) {
      setLocation({ pathname: window.location.pathname, search: window.location.search });
      return;
    }

    const method = replace ? 'replaceState' : 'pushState';
    window.history[method](null, '', nextUrl);
    setLocation({ pathname: window.location.pathname, search: window.location.search });
  }, []);

  return { location, navigateTo };
}

function buildExplorerQuery(filters, page) {
  const query = new URLSearchParams();
  if (filters.cardQuery.trim()) query.set('q', filters.cardQuery.trim());
  if (filters.expansion) query.set('expansion', filters.expansion);
  if (filters.artist.trim()) query.set('artist', filters.artist.trim());
  if (filters.cardKind) query.set('kind', filters.cardKind);
  if (filters.element) query.set('element', filters.element);
  if (filters.rarity.trim()) query.set('rarity', filters.rarity.trim());
  if (Number(page) > 1) query.set('page', String(page));
  return query;
}

function parseExplorerQuery(search) {
  const params = new URLSearchParams(search);
  const page = Number(params.get('page') || '1');
  return {
    filters: {
      cardQuery: params.get('q') || '',
      expansion: params.get('expansion') || '',
      artist: params.get('artist') || '',
      cardKind: params.get('kind') || '',
      element: params.get('element') || '',
      rarity: params.get('rarity') || ''
    },
    page: page > 0 ? page : 1
  };
}

function buildDetailQuery(detailState) {
  const query = new URLSearchParams();
  if (detailState.detailQuery.trim()) query.set('q', detailState.detailQuery.trim());
  if (detailState.detailKind) query.set('kind', detailState.detailKind);
  if (detailState.detailSort && detailState.detailSort !== DEFAULT_DETAIL_SORT) query.set('sort', detailState.detailSort);
  return query;
}

function parseDetailQuery(search) {
  const params = new URLSearchParams(search);
  return {
    detailQuery: params.get('q') || '',
    detailKind: params.get('kind') || '',
    detailSort: params.get('sort') || DEFAULT_DETAIL_SORT
  };
}

function hasActiveFilters(filters) {
  return Boolean(
    filters.cardQuery.trim()
    || filters.expansion
    || filters.artist.trim()
    || filters.cardKind
    || filters.element
    || filters.rarity.trim()
  );
}

function compareDetailCards(sort, left, right) {
  if (sort === 'name-asc') return left.name.localeCompare(right.name) || compareCardNumbers(left.number, right.number);
  if (sort === 'number-desc') return compareCardNumbers(right.number, left.number) || left.name.localeCompare(right.name);
  return compareCardNumbers(left.number, right.number) || left.name.localeCompare(right.name);
}

function getHomeModeCaption(homeMode) {
  if (homeMode === 'explorer') return 'Explorador en vivo. Caza cartas con filtros rapidos y resultados actualizados.';
  if (homeMode === 'collections') return 'Archivo personal. Convierte filtros en colecciones y marca tu progreso carta a carta.';
  if (homeMode === 'library') return 'Biblioteca de expansiones. Recorre el archivo por series y abre cualquier set.';
  return 'Elige entre buscar cartas concretas, recorrer expansiones o entrar a tus colecciones guardadas.';
}


export function App() {
  const restoredUiState = useMemo(() => restoreUiState() || {}, []);
  const { location, navigateTo } = useLocationState();
  const screen = routeScreen(location.pathname);
  const activeSetId = routeSetId(location.pathname);
  const activeCollectionId = routeCollectionId(location.pathname);

  const [homeMode, setHomeMode] = useState(restoredUiState.homeMode === 'explorer' ? 'explorer' : DEFAULT_HOME_MODE);
  const [seriesPage, setSeriesPage] = useState(Number(restoredUiState.seriesPage) > 0 ? Number(restoredUiState.seriesPage) : 1);
  const [detailQuery, setDetailQuery] = useState(restoredUiState.detailQuery || '');
  const [detailKind, setDetailKind] = useState(restoredUiState.detailKind || '');
  const [detailSort, setDetailSort] = useState(restoredUiState.detailSort || DEFAULT_DETAIL_SORT);
  const [user, setUser] = useState(getAuthSession());
  const [sets, setSets] = useState([]);
  const [setsStatus, setSetsStatus] = useState('Cargando expansiones...');
  const [isSetsLoading, setIsSetsLoading] = useState(true);
  const [explorerFilters, setExplorerFilters] = useState(() => parseExplorerQuery(location.search).filters);
  const [explorerResult, setExplorerResult] = useState({ cards: [], page: 1, pageCount: 1, totalCount: 0 });
  const [explorerStatus, setExplorerStatus] = useState('Elige uno o mas filtros para buscar cartas entre las expansiones incluidas.');
  const [isExplorerLoading, setIsExplorerLoading] = useState(false);
  const [collections, setCollections] = useState([]);
  const [collectionsStatus, setCollectionsStatus] = useState('Todavia no creaste ninguna coleccion.');
  const [isCollectionsLoading, setIsCollectionsLoading] = useState(false);
  const [hasLoadedCollections, setHasLoadedCollections] = useState(false);
  const [cardsBySet, setCardsBySet] = useState(() => new Map());
  const [loadingSetId, setLoadingSetId] = useState('');
  const [collectionOwnershipFilter, setCollectionOwnershipFilter] = useState('all');
  const [modalState, setModalState] = useState({ setId: '', cardId: '', triggerId: '' });
  const [zoom, setZoom] = useState({ active: false, scale: 2.2, originX: 50, originY: 50 });
  const [modalCollectionSelection, setModalCollectionSelection] = useState('');
  const [modalCollectionStatus, setModalCollectionStatus] = useState('');
  const [modalCollectionsLoading, setModalCollectionsLoading] = useState(false);
  const [namePrompt, setNamePrompt] = useState(null);
  const [deletePrompt, setDeletePrompt] = useState(null);
  const [removePrompt, setRemovePrompt] = useState(null);
  const [isPending, startUiTransition] = useTransition();
  const prefetchedLargeImages = useRef(new Set());
  const hoverPrefetchTimer = useRef(0);
  const isScrollActive = useRef(false);
  const scrollIdleTimer = useRef(0);
  const activeTriggerRef = useRef(null);
  const modalImageButtonRef = useRef(null);
  const modalImageRef = useRef(null);
  const explorerAbortRef = useRef(null);

  const deferredDetailQuery = useDeferredValue(detailQuery);
  const setLookup = useMemo(() => new Map(sets.map((set) => [set.id, set])), [sets]);
  const expansionFilterOptions = useMemo(() => [...sets].sort(compareSetsByNewest), [sets]);
  const seriesEntries = useMemo(() => buildSeriesEntries([...sets].sort(compareSetsByNewest)), [sets]);
  const currentSet = activeSetId ? setLookup.get(activeSetId) || null : null;
  const activeSetCards = currentSet ? cardsBySet.get(currentSet.id) || [] : [];
  const hasCurrentSetCards = currentSet ? cardsBySet.has(currentSet.id) : false;
  const activeCollection = useMemo(() => collections.find((entry) => entry.id === activeCollectionId) || null, [collections, activeCollectionId]);

  const enrichCard = useCallback((card) => enrichCardWithSet(card, setLookup.get(card.setId) || null), [setLookup]);

  const modalCard = useMemo(() => {
    if (!modalState.setId || !modalState.cardId) return null;
    const fromSet = (cardsBySet.get(modalState.setId) || []).find((card) => card.id === modalState.cardId);
    if (fromSet) return enrichCard(fromSet);
    const fromExplorer = explorerResult.cards.find((card) => card.id === modalState.cardId && card.setId === modalState.setId);
    return fromExplorer ? enrichCard(fromExplorer) : null;
  }, [cardsBySet, enrichCard, explorerResult.cards, modalState.cardId, modalState.setId]);

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

  const visibleCollectionCards = useMemo(() => filterCollectionCards(activeCollection?.cards || [], collectionOwnershipFilter), [activeCollection, collectionOwnershipFilter]);
  const homeCaption = getHomeModeCaption(homeMode);
  const explorerHasActiveFilters = hasActiveFilters(explorerFilters);
  const currentSeriesEntry = useMemo(
    () => seriesEntries[Math.max(0, Math.min(seriesPage - 1, Math.max(seriesEntries.length - 1, 0)))] || null,
    [seriesEntries, seriesPage]
  );
  const explorerCardsWithSet = useMemo(
    () => explorerResult.cards.map((card) => enrichCard(card)),
    [enrichCard, explorerResult.cards]
  );
  const collectionsWithMetrics = useMemo(() => collections.map((collection) => {
    const cards = collection.cards || [];
    const ownedCount = cards.filter((card) => card.owned).length;
    const missingCount = Math.max(cards.length - ownedCount, 0);
    const filterBits = Object.entries(collection.filters || {})
      .filter(([, value]) => String(value || '').trim())
      .map(([key, value]) => `${key}: ${value}`);
    return { collection, ownedCount, missingCount, filterBits, cardsCount: cards.length };
  }), [collections]);
  const activeCollectionFilterBits = useMemo(
    () => Object.entries(activeCollection?.filters || {}).filter(([, value]) => String(value || '').trim()),
    [activeCollection]
  );

  const mergeCollectionIntoState = useCallback((nextCollection) => {
    if (!nextCollection) return;
    setCollections((current) => {
      const nextEntries = [nextCollection, ...current.filter((entry) => entry.id !== nextCollection.id)];
      return nextEntries.sort((left, right) => (right.updatedAt || '').localeCompare(left.updatedAt || '') || left.name.localeCompare(right.name));
    });
  }, []);

  const removeCollectionFromState = useCallback((collectionId) => {
    setCollections((current) => current.filter((entry) => entry.id !== collectionId));
  }, []);

  useEffect(() => {
    saveUiState({
      homeMode,
      activeSetId,
      detailQuery,
      detailKind,
      detailSort,
      seriesPage
    });
  }, [activeSetId, detailKind, detailQuery, detailSort, homeMode, seriesPage]);

  useEffect(() => {
    if (screen === 'explorer') setHomeMode('explorer');
    if (screen === 'collections') setHomeMode('collections');
    if (screen === 'library' || screen === 'expansion') setHomeMode('library');
  }, [screen]);

  useEffect(() => {
    const { filters } = parseExplorerQuery(location.search);
    setExplorerFilters(filters);
  }, [location.search]);

  useEffect(() => {
    if (screen !== 'expansion') return;
    const detailState = parseDetailQuery(location.search);
    setDetailQuery(detailState.detailQuery);
    setDetailKind(detailState.detailKind);
    setDetailSort(detailState.detailSort);
  }, [location.search, screen]);

  useEffect(() => {
    setAuthChangeHandler((session) => {
      setUser(session);
      if (!session) setCollections([]);
    });
    void initializeAuth();
    return () => setAuthChangeHandler(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function hydrateSets() {
      setIsSetsLoading(true);
      const cached = await cacheRead('sets:v1');
      let hadCached = false;

      if (cached?.value?.length && !cancelled) {
        hadCached = true;
        setSets(cached.value);
        setSetsStatus(
          isFresh(cached, SETS_TTL)
            ? 'Mostrando expansiones guardadas en cache. La actualizacion en vivo correra solo si hace falta.'
            : 'Mostrando expansiones en cache mientras se actualizan los datos en vivo...'
        );
      }

      if (hadCached && isFresh(cached, SETS_TTL)) {
        setIsSetsLoading(false);
        return;
      }

      try {
        const liveSets = await fetchSetsFromApi(controller.signal);
        if (cancelled) return;
        setSets(liveSets);
        setSetsStatus(`Mostrando ${liveSets.length.toLocaleString()} expansiones con datos actualizados en vivo.`);
        await cacheWrite('sets:v1', liveSets);
      } catch (error) {
        if (error.name !== 'AbortError' && !cancelled && !hadCached) {
          console.error(error);
          setSetsStatus('No se pudieron cargar las expansiones desde la API.');
        }
      } finally {
        if (!cancelled) setIsSetsLoading(false);
      }
    }

    void hydrateSets();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (screen !== 'expansion' || !activeSetId || !sets.length) return;
    if (setLookup.has(activeSetId)) return;
    navigateTo('/library', { replace: true });
  }, [activeSetId, navigateTo, screen, setLookup, sets.length]);

  useEffect(() => {
    if (!currentSet) return;
    if (hasCurrentSetCards) return;
    const controller = new AbortController();
    setLoadingSetId(currentSet.id);

    async function loadCards() {
      const cached = await cacheRead(`cards:${currentSet.id}:v2`);
      if (cached?.value?.length) {
        setCardsBySet((previous) => new Map(previous).set(currentSet.id, cached.value));
        if (isFresh(cached, CARDS_TTL)) {
          setLoadingSetId('');
          return;
        }
      }
      try {
        const cards = await fetchCardsForSetFromApi(currentSet.id, controller.signal);
        setCardsBySet((previous) => new Map(previous).set(currentSet.id, cards));
        await cacheWrite(`cards:${currentSet.id}:v2`, cards);
      } catch (error) {
        if (error.name !== 'AbortError') console.error(error);
      } finally {
        setLoadingSetId((value) => (value === currentSet.id ? '' : value));
      }
    }

    void loadCards();
    return () => controller.abort();
  }, [currentSet, hasCurrentSetCards]);

  useEffect(() => {
    if (screen !== 'explorer') return;
    if (!setLookup.size || !explorerHasActiveFilters) {
      setExplorerResult({ cards: [], page: 1, pageCount: 1, totalCount: 0 });
      setExplorerStatus('Elige al menos un filtro para ejecutar una busqueda en vivo.');
      setIsExplorerLoading(false);
      return;
    }

    const { filters, page } = parseExplorerQuery(location.search);
    const cacheKey = buildExplorerCacheKey(filters, page);
    explorerAbortRef.current?.abort();
    const controller = new AbortController();
    explorerAbortRef.current = controller;

    async function runExplorerSearch() {
      setIsExplorerLoading(true);
      const cached = await cacheRead(cacheKey);
      if (cached?.value) {
        setExplorerResult(cached.value);
        setIsExplorerLoading(false);
        setExplorerStatus(
          isFresh(cached, SEARCH_TTL)
            ? 'Mostrando resultados guardados en cache.'
            : 'Mostrando resultados en cache mientras se actualizan los datos en vivo...'
        );
        if (isFresh(cached, SEARCH_TTL)) return;
      } else {
        setExplorerStatus('Buscando cartas en vivo...');
      }

      try {
        const result = await fetchExplorerPageFromApi(filters, setLookup, page, controller.signal);
        if (!result) return;
        setExplorerResult(result);
        setExplorerStatus(
          result.cards.length
            ? `Mostrando ${result.cards.length.toLocaleString()} cartas desde resultados en vivo o actualizados. Combina filtros para acotar por expansion, artista, tipo y mas.`
            : 'No hay cartas que coincidan con los filtros actuales.'
        );
        await cacheWrite(cacheKey, result);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error(error);
          setExplorerStatus('No se pudieron cargar las cartas filtradas desde la API.');
        }
      } finally {
        setIsExplorerLoading(false);
      }
    }

    void runExplorerSearch();
    return () => controller.abort();
  }, [explorerHasActiveFilters, location.search, screen, setLookup]);

  const refreshCollections = useCallback(async (force = false) => {
    if (!user) {
      setCollections([]);
      setHasLoadedCollections(false);
      return [];
    }
    const nextCollections = await listCollections({ force });
    setCollections(nextCollections);
    return nextCollections;
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCollectionsStatus('Inicia sesion para crear y ver tus colecciones.');
      setIsCollectionsLoading(false);
      return;
    }
    if (screen !== 'collections' && activeCollectionId === '') return;

    let cancelled = false;
    setIsCollectionsLoading(true);
    setCollectionsStatus('Cargando tus colecciones...');
    void refreshCollections(true)
      .then((nextCollections) => {
        if (cancelled) return;
        setHasLoadedCollections(true);
        if (!nextCollections.length) {
          setCollectionsStatus('Todavia no creaste ninguna coleccion.');
          return;
        }
        const totalCards = nextCollections.reduce((count, collection) => count + (collection.cards || []).length, 0);
        setCollectionsStatus(`Tienes ${nextCollections.length.toLocaleString()} colecciones con ${totalCards.toLocaleString()} cartas guardadas en total.`);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(error);
          setHasLoadedCollections(true);
          setCollectionsStatus('No se pudieron cargar tus colecciones.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsCollectionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCollectionId, refreshCollections, screen, user]);

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

  useEffect(() => {
    const handleScroll = () => {
      isScrollActive.current = true;
      window.clearTimeout(scrollIdleTimer.current);
      scrollIdleTimer.current = window.setTimeout(() => {
        isScrollActive.current = false;
      }, 140);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!modalImageRef.current || !modalImageButtonRef.current) return;
    modalImageRef.current.style.transformOrigin = `${zoom.originX}% ${zoom.originY}%`;
    modalImageRef.current.style.transform = `scale(${zoom.active ? zoom.scale : 1})`;
    modalImageButtonRef.current.style.cursor = zoom.active ? 'zoom-out' : 'zoom-in';
  }, [zoom]);

  const updateExpansionRoute = useCallback((setId, detailState, replace = false) => {
    const set = setLookup.get(setId);
    if (!set) return;
    navigateTo(expansionPath(set), { replace, query: buildDetailQuery(detailState) });
  }, [navigateTo, setLookup]);

  const requestCollectionName = useCallback((config) => new Promise((resolve) => setNamePrompt({ ...config, resolve })), []);
  const requestCollectionDeletion = useCallback((collection) => new Promise((resolve) => setDeletePrompt({ collection, resolve })), []);
  const requestCollectionCardRemoval = useCallback((collection, card) => new Promise((resolve) => setRemovePrompt({ collection, card, resolve })), []);

  const openCardModal = useCallback((setId, cardId, trigger = null) => {
    activeTriggerRef.current = trigger;
    setZoom({ active: false, scale: 2.2, originX: 50, originY: 50 });
    setModalCollectionStatus('');
    setModalState({ setId, cardId, triggerId: trigger?.id || '' });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ setId: '', cardId: '', triggerId: '' });
    setZoom({ active: false, scale: 2.2, originX: 50, originY: 50 });
    activeTriggerRef.current?.focus?.();
  }, []);

  const schedulePrefetchLargeImage = useCallback((setId, cardId) => {
    window.clearTimeout(hoverPrefetchTimer.current);
    hoverPrefetchTimer.current = window.setTimeout(() => {
      if (isScrollActive.current) return;
      const src = ((cardsBySet.get(setId) || []).find((card) => card.id === cardId) || explorerResult.cards.find((card) => card.id === cardId && card.setId === setId))?.imageLarge;
      if (!src || prefetchedLargeImages.current.has(src)) return;
      prefetchedLargeImages.current.add(src);
      const run = () => {
        const img = new Image();
        img.src = src;
      };
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(run, { timeout: 250 });
      } else {
        window.setTimeout(run, 0);
      }
    }, 120);
  }, [cardsBySet, explorerResult.cards]);

  const toggleZoom = useCallback((event) => {
    setZoom((current) => {
      const nextActive = !current.active;
      if (!nextActive) return { active: false, scale: 2.2, originX: 50, originY: 50 };
      if (!modalImageButtonRef.current) return { ...current, active: true };
      const rect = modalImageButtonRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return { ...current, active: true };
      return {
        ...current,
        active: true,
        originX: ((event.clientX - rect.left) / rect.width) * 100,
        originY: ((event.clientY - rect.top) / rect.height) * 100
      };
    });
  }, []);

  const updateZoomOrigin = useCallback((event) => {
    if (!zoom.active || !modalImageButtonRef.current) return;
    const rect = modalImageButtonRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setZoom((current) => ({
      ...current,
      originX: Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1) * 100,
      originY: Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1) * 100
    }));
  }, [zoom.active]);

  const handleZoomWheel = useCallback((event) => {
    if (!zoom.active) return;
    event.preventDefault();
    setZoom((current) => ({ ...current, scale: Math.min(5, Math.max(1.4, current.scale + (event.deltaY < 0 ? 0.22 : -0.22))) }));
  }, [zoom.active]);

  const handleRunExplorerSearch = useCallback(() => {
    navigateTo('/explorer', { query: buildExplorerQuery(explorerFilters, 1) });
  }, [explorerFilters, navigateTo]);

  const handleClearFilters = useCallback(() => {
    setExplorerFilters({ cardQuery: '', expansion: '', artist: '', cardKind: '', element: '', rarity: '' });
    navigateTo('/explorer', { replace: true });
  }, [navigateTo]);

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
  }, [enrichCard, expansionFilterOptions, explorerFilters, explorerResult, navigateTo, refreshCollections, requestCollectionName, setLookup]);

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
  }, [currentSet, detailKind, detailQuery, detailSort, enrichCard, filteredDetailCards, navigateTo, refreshCollections, requestCollectionName]);

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
        mergeCollectionIntoState({
          ...activeCollection,
          name: collectionName,
          updatedAt: new Date().toISOString()
        });

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

  const debouncedDetailRouteSync = useMemo(() => debounce((nextQuery, nextKind, nextSort, setId) => {
    if (!setId) return;
    updateExpansionRoute(setId, { detailQuery: nextQuery, detailKind: nextKind, detailSort: nextSort }, true);
  }, 120), [updateExpansionRoute]);

  useEffect(() => {
    if (screen !== 'expansion' || !activeSetId) return;
    debouncedDetailRouteSync(detailQuery, detailKind, detailSort, activeSetId);
  }, [activeSetId, debouncedDetailRouteSync, detailKind, detailQuery, detailSort, screen]);

  const topCollectionTotals = useMemo(() => {
    const cards = activeCollection?.cards || [];
    const ownedCount = cards.filter((card) => card.owned).length;
    return { total: cards.length, ownedCount, missingCount: Math.max(cards.length - ownedCount, 0) };
  }, [activeCollection]);

  return (
    <>
      <main className="shell">
        <AuthBar user={user} />

        {screen === 'landing' && <LandingScreen homeMode={homeMode} homeCaption={homeCaption} navigateTo={navigateTo} />}

        {screen === 'explorer' && <ExplorerScreen navigateTo={navigateTo} explorerFilters={explorerFilters} setExplorerFilters={setExplorerFilters} expansionFilterOptions={expansionFilterOptions} handleRunExplorerSearch={handleRunExplorerSearch} user={user} explorerHasActiveFilters={explorerHasActiveFilters} explorerResult={explorerResult} handleCreateCollection={handleCreateCollection} handleClearFilters={handleClearFilters} explorerStatus={explorerStatus} isExplorerLoading={isExplorerLoading} explorerCardsWithSet={explorerCardsWithSet} schedulePrefetchLargeImage={schedulePrefetchLargeImage} openCardModal={openCardModal} buildExplorerQuery={buildExplorerQuery} />}

        {screen === 'library' && <LibraryScreen setsStatus={isSetsLoading && !sets.length ? 'Cargando expansiones...' : setsStatus} navigateTo={navigateTo} seriesEntries={seriesEntries} seriesPage={seriesPage} setSeriesPage={setSeriesPage} currentSeriesEntry={currentSeriesEntry} />}

        {screen === 'expansion' && currentSet && <ExpansionScreen navigateTo={navigateTo} user={user} filteredDetailCards={filteredDetailCards} handleCreateCollectionFromDetail={handleCreateCollectionFromDetail} currentSet={currentSet} activeSetCards={activeSetCards} detailQuery={detailQuery} setDetailQuery={setDetailQuery} startUiTransition={startUiTransition} detailKind={detailKind} setDetailKind={setDetailKind} detailSort={detailSort} setDetailSort={setDetailSort} loadingSetId={loadingSetId} isPending={isPending} schedulePrefetchLargeImage={schedulePrefetchLargeImage} openCardModal={openCardModal} />}

        {screen === 'collections' && !activeCollectionId && <CollectionsScreen user={user} collectionsStatus={collectionsStatus} isCollectionsLoading={isCollectionsLoading} navigateTo={navigateTo} collectionsWithMetrics={collectionsWithMetrics} handleDeleteCollection={handleDeleteCollection} />}

        {screen === 'collections' && activeCollectionId && activeCollection && <CollectionDetailScreen activeCollection={activeCollection} navigateTo={navigateTo} isCollectionsLoading={isCollectionsLoading} handleRenameCollection={handleRenameCollection} handleDeleteCollection={handleDeleteCollection} topCollectionTotals={topCollectionTotals} activeCollectionFilterBits={activeCollectionFilterBits} collectionOwnershipFilter={collectionOwnershipFilter} setCollectionOwnershipFilter={setCollectionOwnershipFilter} visibleCollectionCards={visibleCollectionCards} handleRemoveCollectionCard={handleRemoveCollectionCard} handleToggleCollectionCard={handleToggleCollectionCard} />}

        {screen === 'collections' && activeCollectionId && !activeCollection && isCollectionsLoading && <CollectionDetailScreen activeCollection={{ id: activeCollectionId, name: 'Cargando...', cards: [], totalCount: 0, filters: {} }} navigateTo={navigateTo} isCollectionsLoading handleRenameCollection={handleRenameCollection} handleDeleteCollection={handleDeleteCollection} topCollectionTotals={{ total: 0, ownedCount: 0, missingCount: 0 }} activeCollectionFilterBits={[]} collectionOwnershipFilter={collectionOwnershipFilter} setCollectionOwnershipFilter={setCollectionOwnershipFilter} visibleCollectionCards={[]} handleRemoveCollectionCard={handleRemoveCollectionCard} handleToggleCollectionCard={handleToggleCollectionCard} />}

        {screen === 'collections' && activeCollectionId && !activeCollection && hasLoadedCollections && !isCollectionsLoading && <NotFoundScreen navigateTo={navigateTo} />}

        {screen === 'not-found' && <NotFoundScreen navigateTo={navigateTo} />}

        <p className="footnote">Fuente de datos: API publica de Pokemon TCG en pokemontcg.io. La app guarda expansiones, cartas y resultados localmente, y luego los revalida en segundo plano.</p>
      </main>

      <CardModal modalCard={modalCard} closeModal={closeModal} modalImageButtonRef={modalImageButtonRef} toggleZoom={toggleZoom} updateZoomOrigin={updateZoomOrigin} handleZoomWheel={handleZoomWheel} modalImageRef={modalImageRef} currentSet={currentSet} modalCollectionSelection={modalCollectionSelection} setModalCollectionSelection={setModalCollectionSelection} user={user} modalCollectionsLoading={modalCollectionsLoading} collections={collections} modalSelectedCollection={modalSelectedCollection} modalCardAlreadyAdded={modalCardAlreadyAdded} handleAddModalCardToCollection={handleAddModalCardToCollection} modalCollectionSubmitLabel={modalCollectionSubmitLabel} modalCollectionStatus={modalCollectionStatus} />

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
        {deletePrompt && <div className="detail-fact collection-delete-fact"><span>Coleccion</span><strong>{deletePrompt.collection.name}</strong></div>}
      </PromptModal>

      <PromptModal
        open={Boolean(removePrompt)}
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
        {removePrompt && <div className="detail-fact collection-delete-fact"><span>Carta</span><strong>{removePrompt.card.name}</strong></div>}
      </PromptModal>
    </>
  );
}

function NamePromptModal({ prompt, onResolve }) {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    setValue(prompt?.defaultValue || '');
    setIsSubmitting(false);
    setSubmitError('');
  }, [prompt]);

  if (!prompt) return null;

  return (
    <div className="modal" onClick={(event) => { if (event.target === event.currentTarget) onResolve(null); }}>
      <div className="modal-frame prompt-modal-frame">
        <article className="modal-card prompt-modal-card">
          <form className="prompt-form" onSubmit={async (event) => {
            event.preventDefault();
            setSubmitError('');
            setIsSubmitting(true);
            try {
              await onResolve(value.trim());
            } catch {
              setSubmitError('No se pudo completar la accion. Revisa tu conexion y vuelve a intentar.');
              setIsSubmitting(false);
            }
          }}>
            <div className="modal-top">
              <div>
                <p className="eyebrow">{prompt.kicker}</p>
                <h2>{prompt.title}</h2>
              </div>
              <button className="modal-close" type="button" onClick={() => onResolve(null)}>Cerrar</button>
            </div>
            <p className="subtitle prompt-copy">{prompt.copy}</p>
            <label>
              Nombre de la coleccion
              <input name="collectionName" type="text" maxLength="80" placeholder="Mis favoritas de Scarlet and Violet" value={value} onChange={(event) => setValue(event.target.value)} disabled={isSubmitting} />
            </label>
            {isSubmitting && (
              <div className="prompt-loader" aria-live="polite">
                <span className="prompt-loader-orb" aria-hidden="true" />
                <span className="prompt-loader-copy">{prompt.loadingLabel || 'Guardando cambios'}</span>
              </div>
            )}
            {submitError ? <p className="subtitle prompt-error">{submitError}</p> : null}
            <div className="prompt-actions">
              <button className="action-btn" type="button" onClick={() => onResolve(null)} disabled={isSubmitting}>Cancelar</button>
              <button className="action-btn accent" type="submit" disabled={isSubmitting}>{isSubmitting ? `${prompt.loadingLabel || 'Guardando'}...` : prompt.submitLabel}</button>
            </div>
          </form>
        </article>
      </div>
    </div>
  );
}
