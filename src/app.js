import { CARDS_TTL, SEARCH_TTL, SETS_TTL } from './config.js';
import { fetchCardsForSetFromApi, fetchExplorerPageFromApi, fetchSetsFromApi } from './api.js';
import { getAuthSession, initializeAuth, mountGoogleAuthButton, setAuthChangeHandler, signOut } from './auth.js';
import { cacheRead, cacheWrite, isFresh, restoreUiState, saveUiState } from './cache.js';
import { createCollection, deleteCollection, getCollection, listCollections, renameCollection, updateCollectionCardOwnership } from './collections.js';
import {
  APP_SHELL,
  buildCardButtonMarkup,
  buildCollectionCardMarkup,
  buildCollectionDetailCardMarkup,
  buildCollectionSummaryMarkup,
  buildCompactCardPosterMarkup,
  buildExpansionCardMarkup,
  buildExpansionDetailLoaderMarkup,
  buildExpansionSummaryMarkup,
  buildModalFact,
  topStatsMarkup
} from './templates.js';
import { debounce, escapeHtml } from './utils.js';

export function createApp(root) {
  root.innerHTML = APP_SHELL;

  const state = {
    sets: [],
    filteredSets: [],
    seriesEntries: [],
    seriesPage: 1,
    homeMode: 'library',
    user: getAuthSession(),
    collections: [],
    setLookup: new Map(),
    cardsBySet: new Map(),
    explorerCards: [],
    explorerPage: 1,
    explorerTotalPages: 1,
    explorerTotalCount: 0,
    zoomActive: false,
    zoomScale: 2.2,
    zoomOriginX: 50,
    zoomOriginY: 50,
    zoomRaf: 0,
    activeTrigger: null,
    prefetchedLargeImages: new Set(),
    hoverPrefetchTimer: 0,
    pendingPrefetchKey: '',
    isScrollActive: false,
    scrollIdleTimer: 0,
    detailRenderToken: 0,
    collectionPromptResolve: null,
    controllers: { sets: null, explorer: null, setCards: new Map() },
    lazyObserver: null,
    pendingExpansionValue: '',
    activeSetId: '',
    activeCollectionId: '',
    collectionOwnershipFilter: 'all',
    detailQuery: '',
    detailKind: '',
    detailSort: 'number-asc'
  };

  const el = {
    modeShell: root.querySelector('#mode-shell'),
    authBar: root.querySelector('#auth-bar'),
    authCopy: root.querySelector('#auth-copy'),
    authControls: root.querySelector('#auth-controls'),
    modeCaption: root.querySelector('#mode-caption'),
    modeExplorerButton: root.querySelector('#mode-explorer'),
    modeLibraryButton: root.querySelector('#mode-library'),
    modeCollectionsButton: root.querySelector('#mode-collections'),
    notFoundShell: root.querySelector('#not-found-shell'),
    notFoundHome: root.querySelector('#not-found-home'),
    notFoundLibrary: root.querySelector('#not-found-library'),
    explorerPanel: root.querySelector('#explorer-panel'),
    explorerHome: root.querySelector('#explorer-home'),
    cardQueryInput: root.querySelector('#card-query'),
    expansionFilter: root.querySelector('#expansion-filter'),
    artistFilter: root.querySelector('#artist-filter'),
    cardKindFilter: root.querySelector('#card-kind-filter'),
    elementFilter: root.querySelector('#element-filter'),
    rarityFilter: root.querySelector('#rarity-filter'),
    runFiltersButton: root.querySelector('#run-filters'),
    createCollectionButton: root.querySelector('#create-collection'),
    clearFiltersButton: root.querySelector('#clear-filters'),
    explorerStatus: root.querySelector('#explorer-status'),
    explorerResults: root.querySelector('#explorer-results'),
    explorerPager: root.querySelector('#explorer-pager'),
    explorerPageLabel: root.querySelector('#explorer-page-label'),
    explorerPrev: root.querySelector('#explorer-prev'),
    explorerNext: root.querySelector('#explorer-next'),
    libraryShell: root.querySelector('#library-shell'),
    libraryHome: root.querySelector('#library-home'),
    seriesPager: root.querySelector('#series-pager'),
    seriesPrev: root.querySelector('#series-prev'),
    seriesNext: root.querySelector('#series-next'),
    seriesPageLabel: root.querySelector('#series-page-label'),
    seriesList: root.querySelector('#series-list'),
    expansionDetail: root.querySelector('#expansion-detail'),
    detailBack: root.querySelector('#detail-back'),
    expansionSummary: root.querySelector('#expansion-summary'),
    detailSearch: root.querySelector('#detail-search'),
    detailKindFilter: root.querySelector('#detail-kind-filter'),
    detailSortFilter: root.querySelector('#detail-sort-filter'),
    detailCreateCollectionButton: root.querySelector('#detail-create-collection'),
    expansionCardsStatus: root.querySelector('#expansion-cards-status'),
    expansionCards: root.querySelector('#expansion-cards'),
    collectionsShell: root.querySelector('#collections-shell'),
    collectionsHome: root.querySelector('#collections-home'),
    collectionsStatus: root.querySelector('#collections-status'),
    collectionsList: root.querySelector('#collections-list'),
    collectionDetail: root.querySelector('#collection-detail'),
    collectionBack: root.querySelector('#collection-back'),
    collectionRename: root.querySelector('#collection-rename'),
    collectionDelete: root.querySelector('#collection-delete'),
    collectionOwnershipFilters: root.querySelector('#collection-ownership-filters'),
    collectionFilterAll: root.querySelector('#collection-filter-all'),
    collectionFilterOwned: root.querySelector('#collection-filter-owned'),
    collectionFilterMissing: root.querySelector('#collection-filter-missing'),
    collectionSummary: root.querySelector('#collection-summary'),
    collectionCardsStatus: root.querySelector('#collection-cards-status'),
    collectionCards: root.querySelector('#collection-cards'),
    status: root.querySelector('#status'),
    topStats: root.querySelector('#top-stats'),
    modal: root.querySelector('#card-modal'),
    modalClose: root.querySelector('#modal-close'),
    modalTitle: root.querySelector('#modal-title'),
    modalSubtitle: root.querySelector('#modal-subtitle'),
    modalMeta: root.querySelector('#modal-meta'),
    modalLinks: root.querySelector('#modal-links'),
    modalImage: root.querySelector('#modal-image'),
    modalImageButton: root.querySelector('#modal-image-button'),
    collectionNameModal: root.querySelector('#collection-name-modal'),
    collectionNameForm: root.querySelector('#collection-name-form'),
    collectionNameClose: root.querySelector('#collection-name-close'),
    collectionNameKicker: root.querySelector('#collection-name-kicker'),
    collectionNameTitle: root.querySelector('#collection-name-title'),
    collectionNameCopy: root.querySelector('#collection-name-copy'),
    collectionNameInput: root.querySelector('#collection-name-input'),
    collectionNameCancel: root.querySelector('#collection-name-cancel'),
    collectionNameSubmit: root.querySelector('#collection-name-submit')
  };

  function currentFilters() {
    return {
      cardQuery: el.cardQueryInput.value,
      expansion: el.expansionFilter.value,
      artist: el.artistFilter.value,
      cardKind: el.cardKindFilter.value,
      element: el.elementFilter.value,
      rarity: el.rarityFilter.value
    };
  }

  function renderAuthUi() {
    if (state.user) {
      const label = state.user.name || state.user.email || 'Usuario';
      el.authCopy.textContent = `Sesion iniciada como ${label}. Tus colecciones quedan separadas por cuenta.`;
      el.authControls.innerHTML = '<button class="action-btn" id="auth-logout" type="button">Cerrar sesion</button>';
      return;
    }
    el.authCopy.textContent = 'Inicia sesion con Google para guardar y ver tus colecciones personales.';
    el.authControls.innerHTML = '<div id="auth-google-button"></div>';
    mountGoogleAuthButton(el.authControls.querySelector('#auth-google-button'));
  }

  function renderCollectionsAuthGate() {
    el.collectionsStatus.textContent = 'Inicia sesion para crear y ver tus colecciones.';
    el.collectionsList.innerHTML = '<div class="empty auth-gate"><strong>Mis Colecciones es personal por usuario.</strong><span>Conectate con Google para guardar tu progreso y separar tus listas del resto.</span><div id="collections-google-button"></div></div>';
    mountGoogleAuthButton(el.collectionsList.querySelector('#collections-google-button'), 'Acceder con Google');
  }

  function handleAuthChange(session) {
    state.user = session;
    if (!session) state.collections = [];
    renderAuthUi();
    updateCreateCollectionButton();
    updateDetailCreateCollectionButton();
    if (!state.user && state.activeCollectionId) {
      navigateTo('/mis-colecciones', { replace: true });
      return;
    }
    if (!el.collectionsShell.hidden || !el.collectionDetail.hidden) void renderCollectionsList();
  }

  function persistUiState() {
    saveUiState({
      homeMode: state.homeMode,
      ...currentFilters(),
      explorerPage: state.explorerPage,
      activeSetId: state.activeSetId,
      detailQuery: state.detailQuery,
      detailKind: state.detailKind,
      detailSort: state.detailSort,
      seriesPage: state.seriesPage
    });
  }

  function hydrateUiState() {
    const data = restoreUiState();
    if (!data) return;
    state.homeMode = data.homeMode === 'explorer' ? 'explorer' : 'library';
    el.cardQueryInput.value = data.cardQuery || '';
    el.artistFilter.value = data.artist || '';
    el.cardKindFilter.value = data.cardKind || '';
    el.elementFilter.value = data.element || '';
    el.rarityFilter.value = data.rarity || '';
    state.explorerPage = Number(data.explorerPage) > 0 ? Number(data.explorerPage) : 1;
    state.pendingExpansionValue = data.expansion || '';
    state.activeSetId = data.activeSetId || '';
    state.detailQuery = data.detailQuery || '';
    state.detailKind = data.detailKind || '';
    state.detailSort = data.detailSort || 'number-asc';
    state.seriesPage = Number(data.seriesPage) > 0 ? Number(data.seriesPage) : 1;
    el.detailSearch.value = state.detailQuery;
    el.detailKindFilter.value = state.detailKind;
    el.detailSortFilter.value = state.detailSort;
  }

  function getSetById(setId) {
    return state.setLookup.get(setId) || null;
  }

  function getCardBits(card) {
    const bits = [card.supertype];
    if (card.subtypes.length) bits.push(card.subtypes.join(', '));
    if (card.types.length) bits.push(card.types.join(', '));
    if (card.rarity) bits.push(card.rarity);
    if (card.artist) bits.push('Artista: ' + card.artist);
    return bits.filter(Boolean);
  }

  function enrichCard(card) {
    const set = getSetById(card.setId);
    const setLabel = set ? `${set.displayName} (${set.code})` : (card.setName || 'Set desconocido');
    return {
      ...card,
      bits: getCardBits(card),
      setLabel,
      setLogo: set?.logo || '',
      setSymbol: set?.symbol || '',
      setCode: set?.code || ''
    };
  }

  function getCardListClass() {
    return 'card-list';
  }

  function updateHomeModeUi() {
    const isExplorer = state.homeMode === 'explorer';
    const isLibrary = state.homeMode === 'library';
    const isCollections = state.homeMode === 'collections';
    el.modeExplorerButton.setAttribute('aria-pressed', String(isExplorer));
    el.modeLibraryButton.setAttribute('aria-pressed', String(isLibrary));
    el.modeCollectionsButton.setAttribute('aria-pressed', String(isCollections));
    el.modeExplorerButton.classList.toggle('active', isExplorer);
    el.modeLibraryButton.classList.toggle('active', isLibrary);
    el.modeCollectionsButton.classList.toggle('active', isCollections);
    el.modeCaption.textContent = isExplorer
      ? 'Explorador en vivo. Caza cartas con filtros rapidos y resultados actualizados.'
      : isCollections
        ? 'Archivo personal. Convierte filtros en colecciones y marca tu progreso carta a carta.'
      : isLibrary
        ? 'Biblioteca de expansiones. Recorre el archivo por series y abre cualquier set.'
        : 'Elige entre buscar cartas concretas, recorrer expansiones o entrar a tus colecciones guardadas.';
  }

  function setHomeMode(mode, persist = true) {
    state.homeMode = ['explorer', 'collections'].includes(mode) ? mode : 'library';
    updateHomeModeUi();
    if (persist) persistUiState();
  }

  function normalizePathname(pathname = window.location.pathname) {
    if (!pathname || pathname === '/') return '/';
    return pathname.endsWith('/') ? pathname.slice(0, -1) || '/' : pathname;
  }

  function buildRelativeUrl(path, query) {
    const pathname = normalizePathname(path);
    const search = query ? new URLSearchParams(query).toString() : '';
    return search ? `${pathname}?${search}` : pathname;
  }

  function routeScreen() {
    const pathname = normalizePathname();
    if (pathname === '/') return 'landing';
    if (pathname === '/explorer' || pathname.startsWith('/explorer/')) return 'explorer';
    if (pathname === '/library' || pathname.startsWith('/library/')) return 'library';
    if (pathname.startsWith('/expansion/')) return 'expansion';
    if (pathname === '/mis-colecciones' || pathname.startsWith('/mis-colecciones/')) return 'collections';
    return 'not-found';
  }

  function navigateTo(path, { replace = false, query = null } = {}) {
    const nextUrl = buildRelativeUrl(path, query);
    const currentUrl = buildRelativeUrl(window.location.pathname, window.location.search);
    if (nextUrl === currentUrl) {
      syncRoute();
      return;
    }
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method](null, '', nextUrl);
    syncRoute();
  }

  function explorerQueryFromUi(page = state.explorerPage || 1) {
    const filters = currentFilters();
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

  function applyExplorerQueryFromRoute() {
    const params = new URLSearchParams(window.location.search);
    const page = Number(params.get('page') || '1');
    el.cardQueryInput.value = params.get('q') || '';
    el.artistFilter.value = params.get('artist') || '';
    el.cardKindFilter.value = params.get('kind') || '';
    el.elementFilter.value = params.get('element') || '';
    el.rarityFilter.value = params.get('rarity') || '';
    state.explorerPage = page > 0 ? page : 1;
    state.pendingExpansionValue = params.get('expansion') || '';
  }

  function syncExplorerRoute(page = state.explorerPage || 1, { replace = false } = {}) {
    navigateTo('/explorer', { replace, query: explorerQueryFromUi(page) });
  }

  function detailQueryFromState() {
    const query = new URLSearchParams();
    if (state.detailQuery.trim()) query.set('q', state.detailQuery.trim());
    if (state.detailKind) query.set('kind', state.detailKind);
    if (state.detailSort && state.detailSort !== 'number-asc') query.set('sort', state.detailSort);
    return query;
  }

  function applyDetailQueryFromRoute() {
    const params = new URLSearchParams(window.location.search);
    state.detailQuery = params.get('q') || '';
    state.detailKind = params.get('kind') || '';
    state.detailSort = params.get('sort') || 'number-asc';
    el.detailSearch.value = state.detailQuery;
    el.detailKindFilter.value = state.detailKind;
    el.detailSortFilter.value = state.detailSort;
  }

  function routeCollectionId() {
    const pathname = normalizePathname();
    if (!pathname.startsWith('/mis-colecciones/')) return '';
    try {
      return decodeURIComponent(pathname.slice('/mis-colecciones/'.length));
    } catch {
      return '';
    }
  }

  function expansionPath(set) {
    return `/expansion/${slugify(set.series)}/${slugify(set.displayName)}/${encodeURIComponent(set.id)}`;
  }

  function syncExpansionRoute(setId, { replace = false } = {}) {
    const set = getSetById(setId);
    if (!set) return;
    navigateTo(expansionPath(set), { replace, query: detailQueryFromState() });
  }

  function getLazyObserver() {
    if (!state.lazyObserver) {
      state.lazyObserver = new IntersectionObserver((entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const img = entry.target;
          if (img.dataset.src && img.src !== img.dataset.src) img.src = img.dataset.src;
          observer.unobserve(img);
        }
      }, { rootMargin: '720px 0px' });
    }
    return state.lazyObserver;
  }

  function revealDetailRegion(node, markup) {
    node.classList.remove('detail-region-ready');
    node.innerHTML = markup;
    requestAnimationFrame(() => node.classList.add('detail-region-ready'));
  }

  function scheduleDetailCardsAppend(grid, cards, setId, token, startIndex = 24, chunkSize = 48) {
    if (!grid || token !== state.detailRenderToken || startIndex >= cards.length) return;
    const appendChunk = () => {
      if (!grid.isConnected || token !== state.detailRenderToken) return;
      const slice = cards.slice(startIndex, startIndex + chunkSize);
      grid.insertAdjacentHTML('beforeend', slice.map((card) => buildCompactCardPosterMarkup(card, setId)).join(''));
      observeLazyImages(grid);
      scheduleDetailCardsAppend(grid, cards, setId, token, startIndex + chunkSize, chunkSize);
    };
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(appendChunk, { timeout: 120 });
      return;
    }
    window.setTimeout(appendChunk, 16);
  }

  function observeLazyImages(scope = root) {
    const observer = getLazyObserver();
    scope.querySelectorAll('img.lazy-image[data-src]').forEach((img) => observer.observe(img));
  }

  function abortController(slot, key) {
    if (key) {
      state.controllers[slot].get(key)?.abort();
      const controller = new AbortController();
      state.controllers[slot].set(key, controller);
      return controller;
    }
    state.controllers[slot]?.abort();
    const controller = new AbortController();
    state.controllers[slot] = controller;
    return controller;
  }

  function clearController(slot, key, controller) {
    if (key) {
      if (state.controllers[slot].get(key) === controller) state.controllers[slot].delete(key);
      return;
    }
    if (state.controllers[slot] === controller) state.controllers[slot] = null;
  }

  function updateTopStats(fromCache) {
    if (!el.topStats) return;
    const totals = state.sets.reduce((acc, set) => {
      acc.sets += 1;
      acc[set.category] += 1;
      return acc;
    }, { sets: 0, main: 0, special: 0 });
    el.topStats.innerHTML = topStatsMarkup(totals, fromCache);
  }

  function populateExpansionFilter() {
    const sorted = [...state.sets].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || a.displayName.localeCompare(b.displayName));
    el.expansionFilter.innerHTML = '<option value="">Cualquier expansion</option>' + sorted.map((set) => `<option value="${escapeHtml(set.id)}">${escapeHtml(set.displayName + ' (' + set.code + ')')}</option>`).join('');
    if (state.pendingExpansionValue) {
      el.expansionFilter.value = state.pendingExpansionValue;
      state.pendingExpansionValue = '';
    }
  }

  function compareSetsByNewest(a, b) {
    return b.releaseDate.localeCompare(a.releaseDate) || a.displayName.localeCompare(b.displayName);
  }

  function slugify(value) {
    return String(value || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function buildSeriesEntries(sets) {
    const groups = new Map();
    for (const set of sets) {
      if (!groups.has(set.series)) groups.set(set.series, []);
      groups.get(set.series).push(set);
    }
    return Array.from(groups.entries())
      .map(([series, groupSets]) => [series, groupSets.sort(compareSetsByNewest)])
      .sort((a, b) => compareSetsByNewest(a[1][0], b[1][0]));
  }

  function seriesAnchorId(series) {
    return 'series-' + slugify(series);
  }

  function updateSeriesPager() {
    const totalPages = Math.max(1, state.seriesEntries.length);
    const currentPage = Math.min(state.seriesPage, totalPages);
    state.seriesPage = currentPage;
    el.seriesPageLabel.textContent = totalPages
      ? `Serie ${currentPage.toLocaleString()} de ${totalPages.toLocaleString()}`
      : 'No hay series disponibles';
    el.seriesPrev.disabled = currentPage <= 1;
    el.seriesNext.disabled = currentPage >= totalPages;
    el.seriesPager.hidden = totalPages <= 1;
  }

  function renderSets() {
    state.filteredSets = state.sets
      .sort(compareSetsByNewest);

    el.status.textContent = state.filteredSets.length
      ? `Mostrando ${state.filteredSets.length.toLocaleString()} expansiones de la mas nueva a la mas antigua.`
      : 'No hay expansiones disponibles en este momento.';

    if (!state.filteredSets.length) {
      state.seriesEntries = [];
      updateSeriesPager();
      el.seriesList.innerHTML = '<div class="empty">No hay datos de expansiones disponibles ahora mismo.</div>';
      persistUiState();
      return;
    }

    state.seriesEntries = buildSeriesEntries(state.filteredSets);
    if (state.seriesPage > state.seriesEntries.length) state.seriesPage = state.seriesEntries.length;
    if (state.seriesPage < 1) state.seriesPage = 1;
    const entry = state.seriesEntries[state.seriesPage - 1];
    updateSeriesPager();
    el.seriesList.innerHTML = entry
      ? `<section class="series-block" id="${escapeHtml(seriesAnchorId(entry[0]))}"><div class="series-head"><div><p class="series-kicker">Serie</p><h2>${escapeHtml(entry[0])}</h2></div><div class="series-count">${entry[1].length.toLocaleString()} set${entry[1].length === 1 ? '' : 's'}</div></div><div class="set-grid compact-grid">${entry[1].map((set) => buildExpansionCardMarkup(set)).join('')}</div></section>`
      : '<div class="empty">No hay series disponibles.</div>';
    observeLazyImages(el.seriesList);
    persistUiState();
  }

  function compareDetailCards(a, b) {
    if (state.detailSort === 'name-asc') return a.name.localeCompare(b.name) || a.number.localeCompare(b.number);
    if (state.detailSort === 'number-desc') return b.number.localeCompare(a.number, undefined, { numeric: true, sensitivity: 'base' }) || a.name.localeCompare(b.name);
    return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' }) || a.name.localeCompare(b.name);
  }

  function filterDetailCards(cards) {
    const query = state.detailQuery.trim().toLowerCase();
    return cards
      .filter((card) => state.detailKind ? card.supertype === state.detailKind : true)
      .filter((card) => query ? [card.name, card.number, card.supertype, card.rarity, card.artist, ...card.subtypes, ...card.types].join(' ').toLowerCase().includes(query) : true)
      .sort(compareDetailCards);
  }

  function routeSetId() {
    const pathname = normalizePathname();
    if (!pathname.startsWith('/expansion/')) return '';
    try {
      const parts = pathname.slice(11).split('/').filter(Boolean);
      return decodeURIComponent(parts[parts.length - 1] || '');
    } catch {
      return '';
    }
  }

  function renderActiveSet() {
    const set = getSetById(state.activeSetId);
    if (!set) return;
    state.detailRenderToken += 1;
    const renderToken = state.detailRenderToken;
    const cards = state.cardsBySet.get(set.id) || [];
    const filteredCards = filterDetailCards(cards);
    revealDetailRegion(el.expansionSummary, buildExpansionSummaryMarkup(set, cards.length));
    updateDetailCreateCollectionButton();
    if (!cards.length) {
      el.expansionDetail.dataset.loading = 'true';
      el.expansionCardsStatus.textContent = 'Cargando cartas para esta expansion...';
      revealDetailRegion(el.expansionCards, buildExpansionDetailLoaderMarkup(set));
      return;
    }
    el.expansionDetail.dataset.loading = 'false';
    el.expansionCardsStatus.textContent = filteredCards.length
      ? `Mostrando ${filteredCards.length.toLocaleString()} de ${cards.length.toLocaleString()} cartas. Haz clic en cualquier carta para abrir su detalle.`
      : 'Ninguna carta coincide con los filtros actuales.';
    if (!filteredCards.length) {
      revealDetailRegion(el.expansionCards, '<div class="empty">Prueba otro nombre, tipo o criterio de orden.</div>');
      return;
    }
    const initialCards = filteredCards.slice(0, 24);
    revealDetailRegion(el.expansionCards, `<ol class="poster-grid">${initialCards.map((card, index) => buildCompactCardPosterMarkup(card, set.id, index < 12)).join('')}</ol>`);
    observeLazyImages(el.expansionCards);
    scheduleDetailCardsAppend(el.expansionCards.querySelector('.poster-grid'), filteredCards, set.id, renderToken);
  }

  function showHomeScreen() {
    state.activeSetId = '';
    state.activeCollectionId = '';
    state.homeMode = '';
    el.modeShell.hidden = false;
    el.notFoundShell.hidden = true;
    updateHomeModeUi();
    el.explorerPanel.hidden = true;
    el.libraryShell.hidden = true;
    el.expansionDetail.hidden = true;
    el.collectionsShell.hidden = true;
    el.collectionDetail.hidden = true;
    persistUiState();
  }

  function showExplorerScreen() {
    setHomeMode('explorer', false);
    state.activeSetId = '';
    state.activeCollectionId = '';
    el.modeShell.hidden = true;
    el.notFoundShell.hidden = true;
    el.explorerPanel.hidden = false;
    el.libraryShell.hidden = true;
    el.expansionDetail.hidden = true;
    el.collectionsShell.hidden = true;
    el.collectionDetail.hidden = true;
    applyExplorerQueryFromRoute();
    updateCreateCollectionButton();
    persistUiState();
  }

  function showLibraryScreen() {
    setHomeMode('library', false);
    state.activeSetId = '';
    state.activeCollectionId = '';
    el.modeShell.hidden = true;
    el.notFoundShell.hidden = true;
    el.explorerPanel.hidden = true;
    el.libraryShell.hidden = false;
    el.expansionDetail.hidden = true;
    el.collectionsShell.hidden = true;
    el.collectionDetail.hidden = true;
    persistUiState();
  }

  function showExpansionScreen(setId) {
    const set = getSetById(setId);
    if (!set) {
      showHomeScreen();
      return;
    }
    state.activeSetId = setId;
    state.activeCollectionId = '';
    state.homeMode = 'library';
    updateHomeModeUi();
    el.modeShell.hidden = true;
    el.notFoundShell.hidden = true;
    el.explorerPanel.hidden = true;
    el.libraryShell.hidden = true;
    el.expansionDetail.hidden = false;
    el.collectionsShell.hidden = true;
    el.collectionDetail.hidden = true;
    applyDetailQueryFromRoute();
    renderActiveSet();
    updateDetailCreateCollectionButton();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    persistUiState();
  }

  function showNotFoundScreen() {
    state.activeSetId = '';
    state.activeCollectionId = '';
    state.homeMode = '';
    el.modeShell.hidden = true;
    el.notFoundShell.hidden = false;
    el.explorerPanel.hidden = true;
    el.libraryShell.hidden = true;
    el.expansionDetail.hidden = true;
    el.collectionsShell.hidden = true;
    el.collectionDetail.hidden = true;
    updateHomeModeUi();
    persistUiState();
  }

  async function renderCollectionsList() {
    if (!state.user) {
      renderCollectionsAuthGate();
      return;
    }
    el.collectionsStatus.textContent = 'Cargando tus colecciones...';
    try {
      state.collections = await listCollections({ force: true });
    } catch (error) {
      el.collectionsStatus.textContent = 'No se pudieron cargar tus colecciones.';
      el.collectionsList.innerHTML = '<div class="error">La app no pudo cargar tus colecciones guardadas. Intentalo otra vez.</div>';
      console.error(error);
      return;
    }
    if (!state.collections.length) {
      el.collectionsStatus.textContent = 'Todavia no creaste ninguna coleccion.';
      el.collectionsList.innerHTML = '<div class="empty">Aplica filtros en el explorador y usa Crear Coleccion para guardar tu primer listado.</div>';
      return;
    }
    const cardTotal = state.collections.reduce((acc, collection) => acc + (collection.cards || []).length, 0);
    el.collectionsStatus.textContent = `Tienes ${state.collections.length.toLocaleString()} colecciones con ${cardTotal.toLocaleString()} cartas guardadas en total.`;
    el.collectionsList.innerHTML = `<div class="collections-grid">${state.collections.map((collection) => buildCollectionCardMarkup(collection)).join('')}</div>`;
  }

  function showCollectionsScreen() {
    setHomeMode('collections', false);
    state.activeSetId = '';
    state.activeCollectionId = '';
    el.modeShell.hidden = true;
    el.notFoundShell.hidden = true;
    el.explorerPanel.hidden = true;
    el.libraryShell.hidden = true;
    el.expansionDetail.hidden = true;
    el.collectionsShell.hidden = false;
    el.collectionDetail.hidden = true;
    void renderCollectionsList();
    persistUiState();
  }

  async function renderCollectionDetail() {
    if (!state.user) {
      navigateTo('/mis-colecciones', { replace: true });
      return;
    }
    let collection = state.collections.find((entry) => entry.id === state.activeCollectionId) || null;
    if (!collection) {
      try {
        collection = await getCollection(state.activeCollectionId, { force: true });
      } catch (error) {
        console.error(error);
      }
    }
    if (!collection) {
      navigateTo('/mis-colecciones', { replace: true });
      return;
    }
    const cards = collection.cards || [];
    const visibleCards = filterCollectionCards(cards);
    el.collectionSummary.innerHTML = buildCollectionSummaryMarkup(collection);
    syncCollectionOwnershipFilterUi();
    el.collectionCardsStatus.textContent = cards.length
      ? `Mostrando ${visibleCards.length.toLocaleString()} de ${cards.length.toLocaleString()} cartas. Usa el filtro para ver las que tienes o las que te faltan.`
      : 'Esta coleccion no tiene cartas guardadas.';
    el.collectionCards.innerHTML = visibleCards.length
      ? `<div class="collection-card-list">${visibleCards.map((card) => buildCollectionDetailCardMarkup(collection.id, card)).join('')}</div>`
      : '<div class="empty">No hay cartas que coincidan con este filtro dentro de la coleccion.</div>';
    observeLazyImages(el.collectionCards);
  }

  function refreshCollectionSummary(collection) {
    const cards = collection.cards || [];
    const ownedCount = cards.filter((card) => card.owned).length;
    const visibleCards = filterCollectionCards(cards);
    el.collectionSummary.innerHTML = buildCollectionSummaryMarkup(collection);
    el.collectionCardsStatus.textContent = cards.length
      ? `Mostrando ${visibleCards.length.toLocaleString()} de ${cards.length.toLocaleString()} cartas. Ya marcaste ${ownedCount.toLocaleString()} como obtenidas.`
      : 'Esta coleccion no tiene cartas guardadas.';
  }

  function filterCollectionCards(cards) {
    if (state.collectionOwnershipFilter === 'owned') return cards.filter((card) => card.owned);
    if (state.collectionOwnershipFilter === 'missing') return cards.filter((card) => !card.owned);
    return cards;
  }

  function syncCollectionOwnershipFilterUi() {
    const active = state.collectionOwnershipFilter;
    [el.collectionFilterAll, el.collectionFilterOwned, el.collectionFilterMissing].forEach((button) => {
      const isActive = button.dataset.collectionFilter === active;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function filteredCardsForActiveSet() {
    if (!state.activeSetId) return [];
    const cards = state.cardsBySet.get(state.activeSetId) || [];
    return filterDetailCards(cards).map(enrichCard);
  }

  function detailCollectionName() {
    const set = getSetById(state.activeSetId);
    return set ? `Coleccion ${set.displayName}` : 'Nueva coleccion';
  }

  function detailCollectionFiltersSummary() {
    const set = getSetById(state.activeSetId);
    return {
      Expansion: set ? `${set.displayName} (${set.code})` : '',
      Buscar: state.detailQuery.trim(),
      Clase: state.detailKind,
      Orden: state.detailSort
    };
  }

  function updateDetailCreateCollectionButton(isBusy = false) {
    const cards = filteredCardsForActiveSet();
    const canCreate = !isBusy && Boolean(state.user) && cards.length > 0;
    el.detailCreateCollectionButton.disabled = !canCreate;
    el.detailCreateCollectionButton.textContent = isBusy ? 'Creando Coleccion...' : 'Crear Coleccion';
  }

  function showCollectionDetailScreen(collectionId) {
    if (!state.user) {
      showCollectionsScreen();
      return;
    }
    state.activeSetId = '';
    state.activeCollectionId = collectionId;
    state.collectionOwnershipFilter = 'all';
    state.homeMode = 'collections';
    updateHomeModeUi();
    el.modeShell.hidden = true;
    el.notFoundShell.hidden = true;
    el.explorerPanel.hidden = true;
    el.libraryShell.hidden = true;
    el.expansionDetail.hidden = true;
    el.collectionsShell.hidden = true;
    el.collectionDetail.hidden = false;
    void renderCollectionDetail();
    persistUiState();
  }

  function setExpansionRoute(setId) {
    syncExpansionRoute(setId);
  }

  function syncRoute() {
    const screen = routeScreen();
    const setId = routeSetId();
    const collectionId = routeCollectionId();
    if (screen === 'not-found') {
      showNotFoundScreen();
      return;
    }
    if (screen === 'landing') {
      showHomeScreen();
      return;
    }
    if (screen === 'explorer') {
      showExplorerScreen();
      if (state.setLookup.size && Object.values(currentFilters()).some(Boolean)) runExplorerSearch(state.explorerPage || 1);
      return;
    }
    if (screen === 'library' && !setId) {
      showLibraryScreen();
      return;
    }
    if (screen === 'collections') {
      if (!collectionId) {
        showCollectionsScreen();
        return;
      }
      showCollectionDetailScreen(collectionId);
      return;
    }
    if (!setId) {
      showHomeScreen();
      return;
    }
    if (!state.setLookup.size) return;
    if (!getSetById(setId)) {
      navigateTo('/library', { replace: true });
      return;
    }
    showExpansionScreen(setId);
    loadSetCards(setId);
  }

  async function loadSetCards(setId) {
    const cached = await cacheRead(`cards:${setId}:v2`);
    const set = getSetById(setId);
    if (!set) return;

    if (cached?.value?.length) {
      state.cardsBySet.set(setId, cached.value);
      if (state.activeSetId === setId) renderActiveSet();
    }

    if (cached?.value?.length && isFresh(cached, CARDS_TTL)) return;

    const controller = abortController('setCards', setId);
    try {
      const cards = await fetchCardsForSetFromApi(setId, controller.signal);
      state.cardsBySet.set(setId, cards);
      await cacheWrite(`cards:${setId}:v2`, cards);
      if (state.activeSetId === setId) renderActiveSet();
    } catch (error) {
      if (error.name !== 'AbortError') {
        if (!cached?.value?.length && state.activeSetId === setId) {
          el.expansionDetail.dataset.loading = 'false';
          el.expansionCardsStatus.textContent = 'No se pudieron cargar las cartas de esta expansion.';
          revealDetailRegion(el.expansionCards, '<div class="error">La app no pudo cargar esta expansion desde la API. Intentalo otra vez.</div>');
        }
        console.error(error);
      }
    } finally {
      clearController('setCards', setId, controller);
    }
  }

  function buildExplorerCacheKey(page) {
    const f = currentFilters();
    return ['search:v2', f.cardQuery, f.expansion, f.artist, f.cardKind, f.element, f.rarity, page].join('|');
  }

  function renderExplorerResults() {
    if (!state.explorerCards.length) {
      el.explorerResults.innerHTML = '<div class="empty">No hay cartas que coincidan con los filtros actuales en esta pagina.</div>';
      el.explorerPager.hidden = true;
      updateCreateCollectionButton();
      return;
    }

    const cards = state.explorerCards.map(enrichCard);
    el.explorerResults.innerHTML = '<div class="filter-summary"><span>' + cards.length.toLocaleString() + ' cartas en esta pagina</span><span>' + state.explorerTotalCount.toLocaleString() + ' coincidencias totales</span></div><ol class="' + getCardListClass() + '">' + cards.map((card, index) => buildCardButtonMarkup(card, card.setLabel, card.setId, index < 12)).join('') + '</ol>';
    el.explorerPageLabel.textContent = 'Pagina ' + state.explorerPage.toLocaleString() + ' de ' + state.explorerTotalPages.toLocaleString();
    el.explorerPrev.disabled = state.explorerPage <= 1;
    el.explorerNext.disabled = state.explorerPage >= state.explorerTotalPages;
    el.explorerPager.hidden = false;
    observeLazyImages(el.explorerResults);
    updateCreateCollectionButton();
  }

  function collectionPath(collectionId) {
    return `/mis-colecciones/${encodeURIComponent(collectionId)}`;
  }

  function collectionNameFromFilters() {
    const filters = currentFilters();
    const bits = [];
    if (filters.cardQuery.trim()) bits.push(filters.cardQuery.trim());
    if (filters.rarity.trim()) bits.push(filters.rarity.trim());
    if (filters.artist.trim()) bits.push(filters.artist.trim());
    if (filters.element) bits.push(filters.element);
    if (filters.cardKind) bits.push(filters.cardKind);
    if (filters.expansion) bits.push(el.expansionFilter.selectedOptions[0]?.textContent?.trim() || filters.expansion);
    return bits.length ? `Coleccion ${bits.slice(0, 2).join(' - ')}` : 'Nueva coleccion';
  }

  function normalizeCollectionCards(cards) {
    return cards.map((card) => {
      const enriched = enrichCard(card);
      return {
        ...card,
        setLabel: enriched.setLabel,
        setLogo: enriched.setLogo,
        setSymbol: enriched.setSymbol,
        setCode: enriched.setCode,
        owned: false
      };
    });
  }

  function collectionFiltersSummary() {
    const filters = currentFilters();
    return {
      Nombre: filters.cardQuery.trim(),
      Expansion: filters.expansion ? (el.expansionFilter.selectedOptions[0]?.textContent?.trim() || filters.expansion) : '',
      Artista: filters.artist.trim(),
      Clase: filters.cardKind,
      Elemento: filters.element,
      Rareza: filters.rarity.trim()
    };
  }

  function updateCreateCollectionButton(isBusy = false) {
    const canCreate = !isBusy && Boolean(state.user) && Object.values(currentFilters()).some(Boolean) && state.explorerTotalCount > 0;
    el.createCollectionButton.disabled = !canCreate;
    el.createCollectionButton.textContent = isBusy ? 'Creando Coleccion...' : 'Crear Coleccion';
  }

  async function collectExplorerCardsForCollection() {
    const filters = currentFilters();
    const firstPage = state.explorerPage === 1 && state.explorerCards.length
      ? {
          cards: state.explorerCards,
          page: 1,
          pageCount: state.explorerTotalPages,
          totalCount: state.explorerTotalCount
        }
      : await fetchExplorerPageFromApi(filters, state.setLookup, 1);
    if (!firstPage) return null;
    const cards = [...firstPage.cards];
    for (let page = 2; page <= firstPage.pageCount; page += 1) {
      const nextPage = await fetchExplorerPageFromApi(filters, state.setLookup, page);
      if (!nextPage) continue;
      cards.push(...nextPage.cards);
    }
    return {
      totalCount: firstPage.totalCount,
      cards
    };
  }

  async function handleCreateCollection() {
    if (el.createCollectionButton.disabled) return;
    updateCreateCollectionButton(true);
    try {
      const result = await collectExplorerCardsForCollection();
      if (!result?.cards?.length) {
        el.explorerStatus.textContent = 'No se pudo crear la coleccion porque no hay cartas para guardar.';
        return;
      }
      const chosenName = await requestCollectionName({
        kicker: 'Crear coleccion',
        title: 'Convierte estos filtros en una coleccion',
        copy: 'Se guardaran todas las cartas que coinciden con tu busqueda para que puedas marcar facilmente cuales ya tienes.',
        defaultValue: collectionNameFromFilters(),
        submitLabel: 'Crear coleccion'
      });
      if (chosenName === null) return;
      const collection = await createCollection({
        name: chosenName,
        filters: collectionFiltersSummary(),
        totalCount: result.totalCount,
        cards: normalizeCollectionCards(result.cards)
      });
      state.collections = await listCollections();
      navigateTo(collectionPath(collection.id));
    } catch (error) {
      el.explorerStatus.textContent = 'No se pudo crear la coleccion desde estos filtros.';
      console.error(error);
    } finally {
      updateCreateCollectionButton();
    }
  }

  async function handleCreateCollectionFromDetail() {
    if (el.detailCreateCollectionButton.disabled) return;
    updateDetailCreateCollectionButton(true);
    try {
      const cards = filteredCardsForActiveSet();
      if (!cards.length) {
        el.expansionCardsStatus.textContent = 'No hay cartas visibles para convertir en una coleccion.';
        return;
      }
      const chosenName = await requestCollectionName({
        kicker: 'Crear desde expansion',
        title: 'Guarda esta seleccion como coleccion',
        copy: 'Usaremos las cartas visibles en esta expansion, respetando los filtros que tienes activos en este momento.',
        defaultValue: detailCollectionName(),
        submitLabel: 'Guardar coleccion'
      });
      if (chosenName === null) return;
      const collection = await createCollection({
        name: chosenName,
        filters: detailCollectionFiltersSummary(),
        totalCount: cards.length,
        cards: normalizeCollectionCards(cards)
      });
      state.collections = await listCollections();
      navigateTo(collectionPath(collection.id));
    } catch (error) {
      el.expansionCardsStatus.textContent = 'No se pudo crear la coleccion desde esta expansion.';
      console.error(error);
    } finally {
      updateDetailCreateCollectionButton();
    }
  }

  async function handleRenameCollection() {
    const collection = await getCollection(state.activeCollectionId, { force: true });
    if (!collection) return;
    const chosenName = await requestCollectionName({
      kicker: 'Renombrar coleccion',
      title: 'Actualiza el nombre de esta coleccion',
      copy: 'El nuevo nombre se vera en el listado principal y en el detalle de la coleccion.',
      defaultValue: collection.name,
      submitLabel: 'Guardar nombre'
    });
    if (chosenName === null) return;
    await renameCollection(collection.id, chosenName);
    state.collections = await listCollections();
    await renderCollectionDetail();
  }

  async function handleDeleteCollection() {
    const collection = await getCollection(state.activeCollectionId, { force: true });
    if (!collection) return;
    const confirmed = window.confirm(`Vas a borrar la coleccion "${collection.name}". Esta accion no se puede deshacer.`);
    if (!confirmed) return;
    await deleteCollection(collection.id);
    state.collections = await listCollections();
    navigateTo('/mis-colecciones');
  }

  async function runExplorerSearch(page = 1) {
    const filters = currentFilters();
    const hasFilters = Object.values(filters).some(Boolean);
    if (!hasFilters) {
      state.explorerCards = [];
      state.explorerPage = 1;
      state.explorerTotalPages = 1;
      state.explorerTotalCount = 0;
      el.explorerStatus.textContent = 'Elige al menos un filtro para ejecutar una busqueda en vivo.';
      el.explorerResults.innerHTML = '<div class="empty">Agrega uno o mas filtros y luego lanza la busqueda.</div>';
      el.explorerPager.hidden = true;
      updateCreateCollectionButton();
      persistUiState();
      return;
    }

    const cacheKey = buildExplorerCacheKey(page);
    const cached = await cacheRead(cacheKey);
    if (cached?.value) {
      state.explorerCards = cached.value.cards;
      state.explorerPage = cached.value.page;
      state.explorerTotalPages = cached.value.pageCount;
      state.explorerTotalCount = cached.value.totalCount;
      el.explorerStatus.textContent = isFresh(cached, SEARCH_TTL)
        ? 'Mostrando resultados guardados en cache.'
        : 'Mostrando resultados en cache mientras se actualizan los datos en vivo...';
      renderExplorerResults();
      if (isFresh(cached, SEARCH_TTL)) {
        persistUiState();
        return;
      }
    } else {
      el.explorerStatus.textContent = 'Buscando cartas en vivo...';
      el.explorerResults.innerHTML = '<div class="loading">Cargando cartas filtradas desde la API...</div>';
      el.explorerPager.hidden = true;
      updateCreateCollectionButton(true);
    }

    const controller = abortController('explorer');
    try {
      const result = await fetchExplorerPageFromApi(filters, state.setLookup, page, controller.signal);
      if (!result) return;
      state.explorerCards = result.cards;
      state.explorerPage = result.page;
      state.explorerTotalPages = result.pageCount;
      state.explorerTotalCount = result.totalCount;
      el.explorerStatus.textContent = result.cards.length
        ? `Mostrando ${result.cards.length.toLocaleString()} cartas desde resultados en vivo o actualizados. Combina filtros para acotar por expansion, artista, tipo y mas.`
        : 'No hay cartas que coincidan con los filtros actuales.';
      renderExplorerResults();
      await cacheWrite(cacheKey, result);
    } catch (error) {
      if (error.name !== 'AbortError') {
        el.explorerStatus.textContent = 'No se pudieron cargar las cartas filtradas desde la API.';
        if (!cached?.value) el.explorerResults.innerHTML = '<div class="error">La busqueda en vivo fallo. Prueba con un filtro mas preciso o vuelve a intentarlo.</div>';
        updateCreateCollectionButton();
        console.error(error);
      }
    } finally {
      clearController('explorer', null, controller);
      updateCreateCollectionButton();
      persistUiState();
    }
  }

  function findCard(setId, cardId) {
    const fromSet = (state.cardsBySet.get(setId) || []).find((card) => card.id === cardId);
    if (fromSet) return fromSet;
    return state.explorerCards.find((card) => card.id === cardId && card.setId === setId) || null;
  }

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
    el.modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setZoom(false);
    el.modalClose.focus();
  }

  function closeModal() {
    el.modal.hidden = true;
    document.body.style.overflow = '';
    setZoom(false);
    state.activeTrigger?.focus();
  }

  function closeCollectionNameModal(result = null) {
    if (el.collectionNameModal.hidden) return;
    el.collectionNameModal.hidden = true;
    if (el.modal.hidden) document.body.style.overflow = '';
    const resolve = state.collectionPromptResolve;
    state.collectionPromptResolve = null;
    if (resolve) resolve(result);
  }

  function requestCollectionName({ kicker, title, copy, defaultValue = '', submitLabel = 'Guardar coleccion' }) {
    if (state.collectionPromptResolve) closeCollectionNameModal(null);
    el.collectionNameKicker.textContent = kicker;
    el.collectionNameTitle.textContent = title;
    el.collectionNameCopy.textContent = copy;
    el.collectionNameInput.value = defaultValue;
    el.collectionNameSubmit.textContent = submitLabel;
    el.collectionNameModal.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      el.collectionNameInput.focus();
      el.collectionNameInput.select();
    });
    return new Promise((resolve) => {
      state.collectionPromptResolve = resolve;
    });
  }

  async function hydrateSets() {
    const cached = await cacheRead('sets:v1');
    let hadCached = false;

    if (cached?.value?.length) {
      hadCached = true;
      applySets(cached.value, true);
      el.status.textContent = isFresh(cached, SETS_TTL)
        ? 'Mostrando expansiones guardadas en cache. La actualizacion en vivo correra solo si hace falta.'
        : 'Mostrando expansiones en cache mientras se actualizan los datos en vivo...';
    }

    if (hadCached && isFresh(cached, SETS_TTL)) return;

    const controller = abortController('sets');
    try {
      const liveSets = await fetchSetsFromApi(controller.signal);
      await cacheWrite('sets:v1', liveSets);
      applySets(liveSets, false);
      el.status.textContent = `Mostrando ${liveSets.length.toLocaleString()} expansiones con datos actualizados en vivo.`;
    } catch (error) {
      if (error.name !== 'AbortError') {
        if (!hadCached) {
          el.status.textContent = 'No se pudieron cargar las expansiones desde la API.';
          el.seriesList.innerHTML = '<div class="error">La pagina no pudo conectarse con la API de Pokemon TCG. Prueba otra vez con internet disponible.</div>';
          el.explorerStatus.textContent = 'No se pudo preparar el explorador en vivo porque fallo la carga de expansiones.';
          el.explorerResults.innerHTML = '<div class="error">El explorador en vivo no estara disponible hasta que cargue la lista de sets.</div>';
        }
        console.error(error);
      }
    } finally {
      clearController('sets', null, controller);
    }
  }

  function applySets(sets, fromCache) {
    state.sets = sets;
    state.setLookup = new Map(sets.map((set) => [set.id, set]));
    updateTopStats(fromCache);
    populateExpansionFilter();
    renderSets();
    if (routeScreen() === 'explorer' && Object.values(currentFilters()).some(Boolean)) runExplorerSearch(state.explorerPage || 1);
    syncRoute();
  }

  function handleCardTrigger(event) {
    const trigger = event.target.closest('.card-trigger, .card-poster');
    if (!trigger) return;
    openCardModal(trigger.dataset.setId, trigger.dataset.cardId, trigger);
  }

  function handleCardHover(event) {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const trigger = event.target.closest('.card-trigger, .card-poster');
    if (!trigger || state.isScrollActive) return;
    schedulePrefetchLargeImage(trigger.dataset.setId, trigger.dataset.cardId);
  }

  el.modalClose.addEventListener('click', closeModal);
  el.modal.addEventListener('click', (event) => {
    if (event.target === el.modal) closeModal();
  });
  el.collectionNameClose.addEventListener('click', () => closeCollectionNameModal(null));
  el.collectionNameCancel.addEventListener('click', () => closeCollectionNameModal(null));
  el.collectionNameModal.addEventListener('click', (event) => {
    if (event.target === el.collectionNameModal) closeCollectionNameModal(null);
  });
  el.collectionNameForm.addEventListener('submit', (event) => {
    event.preventDefault();
    closeCollectionNameModal(el.collectionNameInput.value.trim());
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !el.collectionNameModal.hidden) {
      closeCollectionNameModal(null);
      return;
    }
    if (event.key === 'Escape' && !el.modal.hidden) closeModal();
  });
  el.modalImageButton.addEventListener('click', (event) => setZoom(!state.zoomActive, event));
  el.modalImageButton.addEventListener('pointermove', updateZoomOriginFromPointer);
  el.modalImageButton.addEventListener('wheel', (event) => {
    if (!state.zoomActive) return;
    event.preventDefault();
    state.zoomScale = Math.min(5, Math.max(1.4, state.zoomScale + (event.deltaY < 0 ? 0.22 : -0.22)));
    requestZoomRender();
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
  const debouncedDetailRender = debounce(() => {
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
    el.cardQueryInput.value = '';
    el.expansionFilter.value = '';
    el.artistFilter.value = '';
    el.cardKindFilter.value = '';
    el.elementFilter.value = '';
    el.rarityFilter.value = '';
    state.explorerCards = [];
    state.explorerPage = 1;
    state.explorerTotalPages = 1;
    state.explorerTotalCount = 0;
    el.explorerStatus.textContent = 'Elige uno o mas filtros para buscar cartas entre las expansiones incluidas.';
    el.explorerResults.innerHTML = '<div class="empty">Todavia no hiciste una busqueda en vivo.</div>';
    el.explorerPager.hidden = true;
    updateCreateCollectionButton();
    persistUiState();
    syncExplorerRoute(1, { replace: true });
  });
  el.collectionsList.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-collection-id]');
    if (!trigger) return;
    navigateTo(collectionPath(trigger.dataset.openCollectionId));
  });
  el.collectionCards.addEventListener('click', async (event) => {
    const trigger = event.target.closest('[data-toggle-collection-card]');
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
    trigger.classList.toggle('is-owned', nextOwned);
    trigger.setAttribute('aria-pressed', String(nextOwned));
    refreshCollectionSummary(updatedCollection);
    state.collections = await listCollections();
    if (!el.collectionsShell.hidden) void renderCollectionsList();
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

  setAuthChangeHandler(handleAuthChange);
  hydrateUiState();
  renderAuthUi();
  updateHomeModeUi();
  syncRoute();
  void initializeAuth();
  hydrateSets();
}
