import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCardsForSetFromApi, fetchExplorerPageFromApi, fetchSetsFromApi } from './api.js';
import { cacheRead, cacheWrite, isFresh } from './cache.js';
import { listCollections } from './collections.js';
import { CARDS_TTL, SEARCH_TTL, SETS_TTL } from './config.js';
import { buildExplorerCacheKey } from './app-data.js';
import { buildRelativeUrl } from './app-routing.js';
import { hasActiveFilters, parseExplorerQuery } from './app-query.js';

export function useLocationState() {
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

export function useSetCatalog() {
  const [sets, setSets] = useState([]);
  const [setsStatus, setSetsStatus] = useState('Cargando expansiones...');
  const [isSetsLoading, setIsSetsLoading] = useState(true);

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

  return { sets, setsStatus, isSetsLoading };
}

export function useSetCards(currentSet) {
  const [cardsBySet, setCardsBySet] = useState(() => new Map());
  const [loadingSetId, setLoadingSetId] = useState('');

  useEffect(() => {
    if (!currentSet) return;
    if (cardsBySet.has(currentSet.id)) return;

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
  }, [cardsBySet, currentSet]);

  return { cardsBySet, loadingSetId, setCardsBySet };
}

export function useExplorerSearch({ screen, locationSearch, setLookup }) {
  const [explorerResult, setExplorerResult] = useState({ cards: [], page: 1, pageCount: 1, totalCount: 0 });
  const [explorerStatus, setExplorerStatus] = useState('');
  const [isExplorerLoading, setIsExplorerLoading] = useState(false);
  const explorerAbortRef = useRef(null);

  useEffect(() => {
    if (screen !== 'explorer') return;

    const { filters, page } = parseExplorerQuery(locationSearch);
    if (!setLookup.size || !hasActiveFilters(filters)) {
      setExplorerResult({ cards: [], page: 1, pageCount: 1, totalCount: 0 });
      setExplorerStatus('');
      setIsExplorerLoading(false);
      return;
    }

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
  }, [locationSearch, screen, setLookup]);

  return { explorerResult, explorerStatus, isExplorerLoading, setExplorerResult };
}

export function useCollectionsData({ user, screen, activeCollectionId }) {
  const [collections, setCollections] = useState([]);
  const [collectionsStatus, setCollectionsStatus] = useState('Todavia no creaste ninguna coleccion.');
  const [isCollectionsLoading, setIsCollectionsLoading] = useState(false);
  const [hasLoadedCollections, setHasLoadedCollections] = useState(false);

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

  return {
    collections,
    setCollections,
    collectionsStatus,
    isCollectionsLoading,
    hasLoadedCollections,
    refreshCollections,
    mergeCollectionIntoState,
    removeCollectionFromState
  };
}

export function useCardModalControls({ cardsBySet, explorerCards }) {
  const [modalState, setModalState] = useState({ setId: '', cardId: '', source: '', triggerId: '' });
  const [zoom, setZoom] = useState({ active: false, scale: 2.2, originX: 50, originY: 50 });
  const prefetchedLargeImages = useRef(new Set());
  const hoverPrefetchTimer = useRef(0);
  const isScrollActive = useRef(false);
  const scrollIdleTimer = useRef(0);
  const activeTriggerRef = useRef(null);
  const modalImageButtonRef = useRef(null);
  const modalImageRef = useRef(null);

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

  const openCardModal = useCallback((setId, cardId, source = '', trigger = null) => {
    activeTriggerRef.current = trigger;
    setZoom({ active: false, scale: 2.2, originX: 50, originY: 50 });
    setModalState({ setId, cardId, source, triggerId: trigger?.id || '' });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ setId: '', cardId: '', source: '', triggerId: '' });
    setZoom({ active: false, scale: 2.2, originX: 50, originY: 50 });
    activeTriggerRef.current?.focus?.();
  }, []);

  const schedulePrefetchLargeImage = useCallback((setId, cardId) => {
    window.clearTimeout(hoverPrefetchTimer.current);
    hoverPrefetchTimer.current = window.setTimeout(() => {
      if (isScrollActive.current) return;
      const src = ((cardsBySet.get(setId) || []).find((card) => card.id === cardId) || explorerCards.find((card) => card.id === cardId && card.setId === setId))?.imageLarge;
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
  }, [cardsBySet, explorerCards]);

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
    setZoom((current) => {
      if (!current.active || !modalImageButtonRef.current) return current;
      const rect = modalImageButtonRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return current;
      return {
        ...current,
        originX: Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1) * 100,
        originY: Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1) * 100
      };
    });
  }, []);

  const handleZoomWheel = useCallback((event) => {
    setZoom((current) => {
      if (!current.active) return current;
      event.preventDefault();
      return { ...current, scale: Math.min(5, Math.max(1.4, current.scale + (event.deltaY < 0 ? 0.22 : -0.22))) };
    });
  }, []);

  return {
    modalState,
    zoom,
    modalImageButtonRef,
    modalImageRef,
    openCardModal,
    closeModal,
    schedulePrefetchLargeImage,
    toggleZoom,
    updateZoomOrigin,
    handleZoomWheel,
    setModalState,
    setZoom
  };
}
