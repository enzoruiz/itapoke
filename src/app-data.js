export function getCardBits(card) {
  const bits = [card.supertype];
  if (card.subtypes.length) bits.push(card.subtypes.join(', '));
  if (card.types.length) bits.push(card.types.join(', '));
  if (card.rarity) bits.push(card.rarity);
  if (card.artist) bits.push('Artista: ' + card.artist);
  return bits.filter(Boolean);
}

export function enrichCardWithSet(card, set) {
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

export function compareSetsByNewest(a, b) {
  return b.releaseDate.localeCompare(a.releaseDate) || a.displayName.localeCompare(b.displayName);
}

function slugify(value) {
  return String(value || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function buildSeriesEntries(sets) {
  const groups = new Map();
  for (const set of sets) {
    if (!groups.has(set.series)) groups.set(set.series, []);
    groups.get(set.series).push(set);
  }

  return Array.from(groups.entries())
    .map(([series, groupSets]) => [series, [...groupSets].sort(compareSetsByNewest)])
    .sort((a, b) => compareSetsByNewest(a[1][0], b[1][0]));
}

export function seriesAnchorId(series) {
  return 'series-' + slugify(series);
}

export function buildExplorerCacheKey(filters, page) {
  return ['search:v2', filters.cardQuery, filters.expansion, filters.artist, filters.cardKind, filters.element, filters.rarity, page].join('|');
}
