import { CARDS_TTL, SEARCH_TTL, SETS_TTL } from './config.js';
import { fetchCardsForSetFromApi, fetchExplorerPageFromApi, fetchSetsFromApi } from './api.js';
import { getAuthSession, initializeAuth, mountGoogleAuthButton, setAuthChangeHandler, signOut } from './auth.js';
import { cacheRead, cacheWrite, isFresh, restoreUiState, saveUiState } from './cache.js';
import { addCardToCollection, createCollection, deleteCollection, getCollection, listCollections, removeCardFromCollection, renameCollection, updateCollectionCardOwnership } from './collections.js';
import { collectionCardExists, collectionFiltersSummary, collectionNameFromFilters, detailCollectionFiltersSummary, detailCollectionName, filterCollectionCards, normalizeCollectionCards } from './app-collections.js';
import { buildExplorerCacheKey, buildSeriesEntries, compareSetsByNewest, enrichCardWithSet, seriesAnchorId } from './app-data.js';
import { bindAppEvents } from './app-events.js';
import { bootstrapApp, collectAppElements, createInitialState } from './app-init.js';
import { createCardModalController } from './app-modal.js';
import { buildRelativeUrl, collectionPath, expansionPath, routeCollectionId, routeScreen, routeSetId } from './app-routing.js';
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

  const state = createInitialState(getAuthSession());
  const el = collectAppElements(root);

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
      el.authBar.classList.remove('auth-bar-guest');
      el.authBar.classList.add('auth-bar-user');
      const avatar = state.user.picture
        ? `<img class="auth-avatar" src="${escapeHtml(state.user.picture)}" alt="Avatar de ${escapeHtml(label)}" referrerpolicy="no-referrer" />`
        : `<span class="auth-avatar auth-avatar-fallback" aria-hidden="true">${escapeHtml(label.trim().charAt(0).toUpperCase() || 'U')}</span>`;
      el.authCopy.innerHTML = `${avatar}<strong class="auth-name">${escapeHtml(label)}</strong>`;
      el.authControls.innerHTML = '<button class="auth-logout-btn" id="auth-logout" type="button" aria-label="Cerrar sesion" title="Cerrar sesion"><span class="auth-logout-glyph" aria-hidden="true">x</span></button>';
      return;
    }
    el.authBar.classList.remove('auth-bar-user');
    el.authBar.classList.add('auth-bar-guest');
    el.authCopy.textContent = '';
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
    if (!el.modal.hidden) void refreshModalCollections({ force: true });
    if (!state.user && state.activeCollectionId) {
      navigateTo('/mis-colecciones', { replace: true });
      return;
    }
    if (!el.collectionsShell.hidden || !el.collectionDetail.hidden) void renderCollectionsList();
  }

  function persistUiState() {
    saveUiState({
      homeMode: state.homeMode,
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

  function enrichCard(card) {
    return enrichCardWithSet(card, getSetById(card.setId));
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

  function resetExplorerState() {
    el.cardQueryInput.value = '';
    el.expansionFilter.value = '';
    el.artistFilter.value = '';
    el.cardKindFilter.value = '';
    el.elementFilter.value = '';
    el.rarityFilter.value = '';
    state.pendingExpansionValue = '';
    state.explorerCards = [];
    state.explorerPage = 1;
    state.explorerTotalPages = 1;
    state.explorerTotalCount = 0;
    el.explorerStatus.textContent = 'Elige uno o mas filtros para buscar cartas entre las expansiones incluidas.';
    el.explorerResults.innerHTML = '<div class="empty">Todavia no hiciste una busqueda en vivo.</div>';
    el.explorerPager.hidden = true;
    updateCreateCollectionButton();
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
    state.filteredSets = [...state.sets].sort(compareSetsByNewest);

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
    resetExplorerState();
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
    resetExplorerState();
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
    resetExplorerState();
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
    resetExplorerState();
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
    resetExplorerState();
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
    const visibleCards = filterCollectionCards(cards, state.collectionOwnershipFilter);
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
    const visibleCards = filterCollectionCards(cards, state.collectionOwnershipFilter);
    el.collectionSummary.innerHTML = buildCollectionSummaryMarkup(collection);
    el.collectionCardsStatus.textContent = cards.length
      ? `Mostrando ${visibleCards.length.toLocaleString()} de ${cards.length.toLocaleString()} cartas. Ya marcaste ${ownedCount.toLocaleString()} como obtenidas.`
      : 'Esta coleccion no tiene cartas guardadas.';
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
    resetExplorerState();
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

  function activeModalCollection() {
    return state.collections.find((collection) => collection.id === el.modalCollectionSelect.value) || null;
  }

  function updateModalCollectionUi({ busy = false, status = '' } = {}) {
    const card = state.activeModalCard;
    if (!state.user) {
      el.modalCollectionSelect.disabled = true;
      el.modalCollectionSubmit.disabled = true;
      el.modalCollectionSubmit.textContent = 'Agregar a coleccion';
      el.modalCollectionStatus.textContent = 'Inicia sesion para guardar esta carta en una coleccion existente.';
      return;
    }
    if (busy && !state.collections.length) {
      el.modalCollectionSelect.disabled = true;
      el.modalCollectionSubmit.disabled = true;
      el.modalCollectionSubmit.textContent = 'Agregar a coleccion';
      el.modalCollectionStatus.textContent = status || 'Cargando tus colecciones...';
      return;
    }
    if (!state.collections.length) {
      el.modalCollectionSelect.innerHTML = '<option value="">No tienes colecciones</option>';
      el.modalCollectionSelect.disabled = true;
      el.modalCollectionSubmit.disabled = true;
      el.modalCollectionSubmit.textContent = 'Agregar a coleccion';
      el.modalCollectionStatus.textContent = status || 'Primero crea una coleccion desde el explorador o desde una expansion.';
      return;
    }

    const collection = activeModalCollection();
    const alreadyAdded = collectionCardExists(collection, card?.id);
    el.modalCollectionSelect.disabled = busy;
    el.modalCollectionSubmit.disabled = busy || !collection || !card || alreadyAdded;
    el.modalCollectionSubmit.textContent = busy ? 'Agregando...' : (alreadyAdded ? 'Ya agregada' : 'Agregar a coleccion');
    el.modalCollectionStatus.textContent = status || (alreadyAdded
      ? `La carta ya esta en "${collection.name}".`
      : collection
        ? `La carta se agregara a "${collection.name}" como pendiente.`
        : 'Selecciona una coleccion para guardar esta carta.');
  }

  function populateModalCollections() {
    if (!state.user || !state.collections.length) {
      updateModalCollectionUi();
      return;
    }
    const previousValue = el.modalCollectionSelect.value;
    el.modalCollectionSelect.innerHTML = state.collections
      .map((collection) => `<option value="${escapeHtml(collection.id)}">${escapeHtml(collection.name)}</option>`)
      .join('');
    const nextValue = state.collections.some((collection) => collection.id === previousValue)
      ? previousValue
      : state.collections.find((collection) => !collectionCardExists(collection, state.activeModalCard?.id))?.id || state.collections[0]?.id || '';
    el.modalCollectionSelect.value = nextValue;
    updateModalCollectionUi();
  }

  async function refreshModalCollections({ force = false } = {}) {
    if (!state.activeModalCard) return;
    if (!state.user) {
      updateModalCollectionUi();
      return;
    }
    const token = state.modalCollectionsToken + 1;
    state.modalCollectionsToken = token;
    el.modalCollectionSelect.innerHTML = '<option value="">Cargando colecciones...</option>';
    el.modalCollectionSelect.disabled = true;
    updateModalCollectionUi({ busy: true, status: 'Cargando tus colecciones...' });
    try {
      state.collections = await listCollections({ force });
      if (token !== state.modalCollectionsToken || !state.activeModalCard) return;
      populateModalCollections();
    } catch (error) {
      if (token !== state.modalCollectionsToken || !state.activeModalCard) return;
      el.modalCollectionSelect.innerHTML = '<option value="">No disponible</option>';
      el.modalCollectionSelect.disabled = true;
      updateModalCollectionUi({ status: 'No se pudieron cargar tus colecciones ahora mismo.' });
      console.error(error);
    }
  }

  async function handleAddModalCardToCollection() {
    const card = state.activeModalCard;
    const collection = activeModalCollection();
    if (!card || !collection || collectionCardExists(collection, card.id)) {
      updateModalCollectionUi();
      return;
    }
    updateModalCollectionUi({ busy: true, status: `Agregando la carta a "${collection.name}"...` });
    try {
      const updatedCollection = await addCardToCollection(collection.id, normalizeCollectionCards([card], enrichCard)[0]);
      if (!updatedCollection) throw new Error('Collection update failed');
      state.collections = await listCollections();
      updateModalCollectionUi({ status: `Carta agregada a "${updatedCollection.name}".` });
      if (state.activeCollectionId === updatedCollection.id && !el.collectionDetail.hidden) await renderCollectionDetail();
      if (!el.collectionsShell.hidden) void renderCollectionsList();
    } catch (error) {
      if (error?.status === 409) {
        state.collections = await listCollections({ force: true });
        populateModalCollections();
        updateModalCollectionUi({ status: `La carta ya estaba guardada en "${activeModalCollection()?.name || collection.name}".` });
        return;
      }
      updateModalCollectionUi({ status: 'No se pudo agregar la carta a esta coleccion.' });
      console.error(error);
    }
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

    const remainingPages = Array.from({ length: Math.max(firstPage.pageCount - 1, 0) }, (_, index) => index + 2);
    const remainingResults = await Promise.all(
      remainingPages.map((page) => fetchExplorerPageFromApi(filters, state.setLookup, page))
    );

    const cards = [
      ...firstPage.cards,
      ...remainingResults.flatMap((pageResult) => pageResult?.cards || [])
    ];

    return {
      totalCount: cards.length,
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
        defaultValue: collectionNameFromFilters(currentFilters(), el.expansionFilter.selectedOptions[0]?.textContent?.trim() || ''),
        submitLabel: 'Crear coleccion'
      });
      if (chosenName === null) return;
      const collection = await createCollection({
        name: chosenName,
        filters: collectionFiltersSummary(currentFilters(), el.expansionFilter.selectedOptions[0]?.textContent?.trim() || ''),
        totalCount: result.totalCount,
        cards: normalizeCollectionCards(result.cards, enrichCard)
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
        defaultValue: detailCollectionName(getSetById(state.activeSetId)),
        submitLabel: 'Guardar coleccion'
      });
      if (chosenName === null) return;
      const collection = await createCollection({
        name: chosenName,
        filters: detailCollectionFiltersSummary(getSetById(state.activeSetId), state),
        totalCount: cards.length,
        cards: normalizeCollectionCards(cards, enrichCard)
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
    await handleDeleteCollectionById(state.activeCollectionId, { redirectToList: true });
  }

  async function handleDeleteCollectionById(collectionId, { redirectToList = false } = {}) {
    const collection = await getCollection(collectionId, { force: true });
    if (!collection) return;
    const confirmed = await requestCollectionDeletion(collection);
    if (!confirmed) return;
    await deleteCollection(collection.id);
    state.collections = await listCollections({ force: true });
    if (redirectToList) {
      navigateTo('/mis-colecciones');
      await renderCollectionsList();
      return;
    }
    await renderCollectionsList();
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

    const cacheKey = buildExplorerCacheKey(filters, page);
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

  const {
    requestZoomRender,
    updateZoomOriginFromPointer,
    setZoom,
    schedulePrefetchLargeImage,
    openCardModal,
    closeModal
  } = createCardModalController({
    el,
    state,
    escapeHtml,
    buildModalFact,
    getSetById,
    findCard,
    enrichCard,
    updateModalCollectionUi,
    refreshModalCollections
  });

  function closeCollectionNameModal(result = null) {
    if (el.collectionNameModal.hidden) return;
    el.collectionNameModal.hidden = true;
    if (el.modal.hidden && el.collectionDeleteModal.hidden && el.collectionCardRemoveModal.hidden) document.body.style.overflow = '';
    const resolve = state.collectionPromptResolve;
    state.collectionPromptResolve = null;
    if (resolve) resolve(result);
  }

  function closeCollectionDeleteModal(result = false) {
    if (el.collectionDeleteModal.hidden) return;
    el.collectionDeleteModal.hidden = true;
    if (el.modal.hidden && el.collectionNameModal.hidden && el.collectionCardRemoveModal.hidden) document.body.style.overflow = '';
    const resolve = state.collectionDeleteResolve;
    state.collectionDeleteResolve = null;
    if (resolve) resolve(result);
  }

  function closeCollectionCardRemoveModal(result = false) {
    if (el.collectionCardRemoveModal.hidden) return;
    el.collectionCardRemoveModal.hidden = true;
    if (el.modal.hidden && el.collectionNameModal.hidden && el.collectionDeleteModal.hidden) document.body.style.overflow = '';
    const resolve = state.collectionCardRemoveResolve;
    state.collectionCardRemoveResolve = null;
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

  function requestCollectionDeletion(collection) {
    if (state.collectionDeleteResolve) closeCollectionDeleteModal(false);
    el.collectionDeleteKicker.textContent = 'Eliminar coleccion';
    el.collectionDeleteTitle.textContent = `Vas a borrar "${collection.name}"`;
    el.collectionDeleteCopy.textContent = `Se eliminaran ${Number(collection.cards?.length || 0).toLocaleString()} cartas guardadas y esta accion no se puede deshacer.`;
    el.collectionDeleteName.textContent = collection.name;
    el.collectionDeleteModal.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      el.collectionDeleteConfirm.focus();
    });
    return new Promise((resolve) => {
      state.collectionDeleteResolve = resolve;
    });
  }

  function requestCollectionCardRemoval(collection, card) {
    if (state.collectionCardRemoveResolve) closeCollectionCardRemoveModal(false);
    el.collectionCardRemoveKicker.textContent = 'Quitar carta';
    el.collectionCardRemoveTitle.textContent = `Quitar "${card.name}"`;
    el.collectionCardRemoveCopy.textContent = `La carta se quitara de la coleccion "${collection.name}" y dejara de contarse en su progreso.`;
    el.collectionCardRemoveName.textContent = card.name;
    el.collectionCardRemoveModal.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      el.collectionCardRemoveConfirm.focus();
    });
    return new Promise((resolve) => {
      state.collectionCardRemoveResolve = resolve;
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

  bindAppEvents({
    el,
    state,
    handlers: {
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
      renderCollectionsList,
      updateCollectionCardOwnership,
      refreshCollectionSummary,
      signOut,
      handleRenameCollection,
      handleDeleteCollection,
      syncRoute,
      collectionPath,
      requestZoomRender,
      debounce
    }
  });

  bootstrapApp({
    setAuthChangeHandler,
    handleAuthChange,
    hydrateUiState,
    renderAuthUi,
    updateHomeModeUi,
    syncRoute,
    initializeAuth,
    hydrateSets
  });
}
