import { API_BASE, CARD_FIELDS, PAGE_SIZE, POKEMON_TCG_API_KEY, SET_FIELDS } from './config.js';
import { normalizeCard, normalizeSet, compareCardNumbers, buildContainsClause, sanitizeQueryValue } from './utils.js';

function buildExplorerClauses(filters) {
  const clauses = [];
  if (filters.cardQuery.trim()) clauses.push(buildContainsClause('name', filters.cardQuery));
  if (filters.expansion) clauses.push(`set.id:${filters.expansion}`);
  if (filters.artist.trim()) clauses.push(buildContainsClause('artist', filters.artist));
  if (filters.cardKind) clauses.push(`supertype:${sanitizeQueryValue(filters.cardKind)}`);
  if (filters.element) clauses.push(`types:${sanitizeQueryValue(filters.element)}`);
  if (filters.rarity.trim()) clauses.push(buildContainsClause('rarity', filters.rarity));
  return clauses.filter(Boolean);
}

export async function fetchJson(url, { signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (POKEMON_TCG_API_KEY) headers['X-Api-Key'] = POKEMON_TCG_API_KEY;
  const response = await fetch(url, { signal, headers });
  if (!response.ok) throw new Error('Request failed (' + response.status + ') for ' + url);
  return response.json();
}

export async function fetchSetsFromApi(signal) {
  const params = new URLSearchParams({ orderBy: 'releaseDate', select: SET_FIELDS });
  const json = await fetchJson(`${API_BASE}/sets?${params.toString()}`, { signal });
  return json.data.map(normalizeSet);
}

export async function fetchCardsForSetFromApi(setId, signal) {
  const cards = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const params = new URLSearchParams({
      q: `set.id:${setId}`,
      orderBy: 'number,name',
      page: String(page),
      pageSize: '250',
      select: CARD_FIELDS
    });
    const json = await fetchJson(`${API_BASE}/cards?${params.toString()}`, { signal });
    pageCount = json.pageCount || Math.max(1, Math.ceil((json.totalCount || json.count || 0) / (json.pageSize || 250)));
    cards.push(...json.data);
    page += 1;
  }

  return cards.map(normalizeCard).sort((a, b) => compareCardNumbers(a.number, b.number) || a.name.localeCompare(b.name));
}

export async function fetchExplorerPageFromApi(filters, setLookup, page, signal) {
  const clauses = buildExplorerClauses(filters);
  if (!clauses.length) return null;

  const allCards = await fetchAllExplorerCardsFromApi(filters, setLookup, signal);

  const totalCount = allCards.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const cards = allCards.slice(startIndex, startIndex + PAGE_SIZE);

  return {
    cards,
    page: safePage,
    pageCount,
    totalCount
  };
}

export async function fetchAllExplorerCardsFromApi(filters, setLookup, signal) {
  const clauses = buildExplorerClauses(filters);
  if (!clauses.length) return [];

  const cards = [];
  let apiPage = 1;
  let apiPageCount = 1;

  while (apiPage <= apiPageCount) {
    const params = new URLSearchParams({
      q: clauses.join(' '),
      orderBy: 'set.releaseDate,name',
      page: String(apiPage),
      pageSize: String(PAGE_SIZE),
      select: CARD_FIELDS
    });
    const json = await fetchJson(`${API_BASE}/cards?${params.toString()}`, { signal });
    apiPageCount = json.pageCount || Math.max(1, Math.ceil((json.totalCount || json.count || 0) / (json.pageSize || PAGE_SIZE)));
    cards.push(...(json.data || []).map(normalizeCard).filter((card) => setLookup.has(card.setId)));
    apiPage += 1;
  }

  return cards;
}
