export function filterCollectionCards(cards, ownershipFilter) {
  if (ownershipFilter === 'owned') return cards.filter((card) => card.owned);
  if (ownershipFilter === 'missing') return cards.filter((card) => !card.owned);
  return cards;
}

export function detailCollectionName(set) {
  return set ? `Coleccion ${set.displayName}` : 'Nueva coleccion';
}

export function detailCollectionFiltersSummary(set, detailState) {
  return {
    Expansion: set ? `${set.displayName} (${set.code})` : '',
    Buscar: detailState.detailQuery.trim(),
    Clase: detailState.detailKind,
    Orden: detailState.detailSort
  };
}

export function collectionNameFromFilters(filters, expansionLabel = '') {
  const bits = [];
  if (filters.cardQuery.trim()) bits.push(filters.cardQuery.trim());
  if (filters.rarity.trim()) bits.push(filters.rarity.trim());
  if (filters.artist.trim()) bits.push(filters.artist.trim());
  if (filters.element) bits.push(filters.element);
  if (filters.cardKind) bits.push(filters.cardKind);
  if (filters.expansion) bits.push(expansionLabel || filters.expansion);
  return bits.length ? `Coleccion ${bits.slice(0, 2).join(' - ')}` : 'Nueva coleccion';
}

export function normalizeCollectionCards(cards, enrichCard) {
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

export function collectionCardExists(collection, cardId) {
  return Boolean(collection?.cards?.some((entry) => entry.id === cardId));
}

export function collectionFiltersSummary(filters, expansionLabel = '') {
  return {
    Nombre: filters.cardQuery.trim(),
    Expansion: filters.expansion ? (expansionLabel || filters.expansion) : '',
    Artista: filters.artist.trim(),
    Clase: filters.cardKind,
    Elemento: filters.element,
    Rareza: filters.rarity.trim()
  };
}
