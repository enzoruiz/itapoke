import { EXCLUDED_NAME_PATTERNS, OTHER_SERIES_ALLOWED, SPECIAL_SET_NAMES, TODAY } from './config.js';

export function normalizeAscii(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function releaseDateToDate(value) {
  return new Date(String(value).replace(/\//g, '-') + 'T00:00:00Z');
}

export function isFutureSet(set) {
  return releaseDateToDate(set.releaseDate) > TODAY;
}

export function isExcludedByName(name) {
  return EXCLUDED_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

export function isIncludedExpansion(set) {
  const asciiName = normalizeAscii(set.name);
  if (isFutureSet(set) || isExcludedByName(asciiName)) return false;
  if (set.series === 'Other') return OTHER_SERIES_ALLOWED.has(asciiName);
  return true;
}

export function classifySet(set) {
  const asciiName = normalizeAscii(set.name);
  if (SPECIAL_SET_NAMES.has(asciiName)) return 'special';
  if (/^(base|gym|neo|ecard|ex|dp|pl|hgss|bw|xy|sm|swsh|sv|me)\d+$/.test(set.id)) return 'main';
  if (set.id === 'base6') return 'special';
  return 'special';
}

export function compareCardNumbers(left, right) {
  const parse = (value) => {
    const match = String(value).match(/^(\d+)(.*)$/);
    if (!match) return { num: Number.POSITIVE_INFINITY, suffix: String(value) };
    return { num: Number(match[1]), suffix: match[2] };
  };
  const a = parse(left);
  const b = parse(right);
  if (a.num !== b.num) return a.num - b.num;
  return a.suffix.localeCompare(b.suffix);
}

export function debounce(fn, wait) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), wait);
  };
}

export function sanitizeQueryValue(value) {
  return normalizeAscii(value).replace(/[\\"]/g, '').trim();
}

export function buildContainsClause(field, value) {
  const clean = sanitizeQueryValue(value);
  if (!clean) return '';
  const terms = clean.split(/\s+/).filter(Boolean);
  if (terms.length > 1) {
    return `(${field}:"${clean}" OR ${terms.map((term) => field + ':*' + term + '*').join(' ')})`;
  }
  return terms.map((term) => field + ':*' + term + '*').join(' ');
}

export function normalizeSet(set) {
  return {
    id: set.id,
    displayName: normalizeAscii(set.name),
    series: normalizeAscii(set.series),
    releaseDate: set.releaseDate,
    printedTotal: set.printedTotal,
    total: set.total,
    code: set.ptcgoCode || set.id.toUpperCase(),
    category: classifySet(set),
    symbol: set.images?.symbol || '',
    logo: set.images?.logo || ''
  };
}

export function normalizeCard(card) {
  return {
    id: card.id,
    number: card.number,
    name: normalizeAscii(card.name),
    imageSmall: card.images?.small || '',
    imageLarge: card.images?.large || '',
    supertype: normalizeAscii(card.supertype || ''),
    subtypes: (card.subtypes || []).map(normalizeAscii),
    rarity: normalizeAscii(card.rarity || ''),
    types: (card.types || []).map(normalizeAscii),
    hp: card.hp || '',
    artist: normalizeAscii(card.artist || ''),
    flavorText: normalizeAscii(card.flavorText || ''),
    evolvesFrom: normalizeAscii(card.evolvesFrom || ''),
    level: normalizeAscii(card.level || ''),
    nationalPokedexNumbers: card.nationalPokedexNumbers || [],
    tcgplayerUrl: card.tcgplayer?.url || '',
    cardmarketUrl: card.cardmarket?.url || '',
    setId: card.set?.id || '',
    setName: normalizeAscii(card.set?.name || ''),
    setCode: card.set?.ptcgoCode || '',
    setSeries: normalizeAscii(card.set?.series || '')
  };
}
