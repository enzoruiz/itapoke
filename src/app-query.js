import { compareCardNumbers } from './utils.js';

export const DEFAULT_HOME_MODE = 'library';
export const DEFAULT_DETAIL_SORT = 'number-asc';
export const DEFAULT_EXPLORER_SORT = 'set-desc';

export function buildExplorerQuery(filters, page, sort = DEFAULT_EXPLORER_SORT) {
  const query = new URLSearchParams();
  if (filters.cardQuery.trim()) query.set('q', filters.cardQuery.trim());
  if (filters.expansion) query.set('expansion', filters.expansion);
  if (filters.artist.trim()) query.set('artist', filters.artist.trim());
  if (filters.cardKind) query.set('kind', filters.cardKind);
  if (filters.element) query.set('element', filters.element);
  if (filters.rarity.trim()) query.set('rarity', filters.rarity.trim());
  if (sort && sort !== DEFAULT_EXPLORER_SORT) query.set('sort', sort);
  if (Number(page) > 1) query.set('page', String(page));
  return query;
}

export function parseExplorerQuery(search) {
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
    sort: params.get('sort') || DEFAULT_EXPLORER_SORT,
    page: page > 0 ? page : 1
  };
}

export function buildDetailQuery(detailState) {
  const query = new URLSearchParams();
  if (detailState.detailQuery.trim()) query.set('q', detailState.detailQuery.trim());
  if (detailState.detailKind) query.set('kind', detailState.detailKind);
  if (detailState.detailSort && detailState.detailSort !== DEFAULT_DETAIL_SORT) query.set('sort', detailState.detailSort);
  return query;
}

export function parseDetailQuery(search) {
  const params = new URLSearchParams(search);
  return {
    detailQuery: params.get('q') || '',
    detailKind: params.get('kind') || '',
    detailSort: params.get('sort') || DEFAULT_DETAIL_SORT
  };
}

export function buildCollectionQuery(view = 'all') {
  const query = new URLSearchParams();
  if (view && view !== 'all') query.set('view', view);
  return query;
}

export function parseCollectionQuery(search) {
  const params = new URLSearchParams(search);
  const view = params.get('view') || 'all';
  return view === 'owned' || view === 'missing' ? view : 'all';
}

export function hasActiveFilters(filters) {
  return Boolean(
    filters.cardQuery.trim()
    || filters.expansion
    || filters.artist.trim()
    || filters.cardKind
    || filters.element
    || filters.rarity.trim()
  );
}

export function compareDetailCards(sort, left, right) {
  if (sort === 'name-asc') return left.name.localeCompare(right.name) || compareCardNumbers(left.number, right.number);
  if (sort === 'number-desc') return compareCardNumbers(right.number, left.number) || left.name.localeCompare(right.name);
  return compareCardNumbers(left.number, right.number) || left.name.localeCompare(right.name);
}

export function sortExplorerCards(cards, sort, setLookup) {
  const nextCards = [...cards];
  if (sort === 'name-asc') {
    return nextCards.sort((left, right) => left.name.localeCompare(right.name) || compareCardNumbers(left.number, right.number));
  }
  if (sort === 'number-asc') {
    return nextCards.sort((left, right) => compareCardNumbers(left.number, right.number) || left.name.localeCompare(right.name));
  }
  if (sort === 'rarity-asc') {
    return nextCards.sort((left, right) => (left.rarity || '').localeCompare(right.rarity || '') || left.name.localeCompare(right.name));
  }
  return nextCards.sort((left, right) => {
    const leftSet = setLookup.get(left.setId);
    const rightSet = setLookup.get(right.setId);
    return (rightSet?.releaseDate || '').localeCompare(leftSet?.releaseDate || '')
      || (rightSet?.displayName || '').localeCompare(leftSet?.displayName || '')
      || left.name.localeCompare(right.name);
  });
}

export function buildExplorerFilterChips(filters, expansionOptions) {
  const expansionLabel = expansionOptions.find((set) => set.id === filters.expansion)?.displayName || filters.expansion;
  return [
    filters.cardQuery.trim() ? { key: 'cardQuery', label: 'Nombre', value: filters.cardQuery.trim() } : null,
    filters.expansion ? { key: 'expansion', label: 'Expansion', value: expansionLabel } : null,
    filters.artist.trim() ? { key: 'artist', label: 'Artista', value: filters.artist.trim() } : null,
    filters.cardKind ? { key: 'cardKind', label: 'Clase', value: filters.cardKind } : null,
    filters.element ? { key: 'element', label: 'Elemento', value: filters.element } : null,
    filters.rarity.trim() ? { key: 'rarity', label: 'Rareza', value: filters.rarity.trim() } : null
  ].filter(Boolean);
}

export function getHomeModeCaption(homeMode) {
  if (homeMode === 'explorer') return 'Explorador en vivo. Caza cartas con filtros rapidos, presets y resultados ordenados.';
  if (homeMode === 'collections') return 'Archivo personal. Convierte filtros en colecciones y sigue el progreso con foco en faltantes.';
  if (homeMode === 'library') return 'Biblioteca de expansiones. Recorre el archivo por series, busca sets y salta rapido a cualquier era.';
  return 'Elige entre buscar cartas concretas, recorrer expansiones o entrar a tus colecciones guardadas.';
}
