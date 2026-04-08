import crypto from 'node:crypto';

function slugify(value) {
  return String(value || 'coleccion')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'coleccion';
}

export function createCollectionId(name) {
  return `${slugify(name)}-${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`;
}

export function sanitizeFilters(filters) {
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) return {};
  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [String(key), typeof value === 'string' ? value.trim() : String(value || '').trim()])
      .filter(([, value]) => value)
  );
}

export function sanitizeCards(cards) {
  if (!Array.isArray(cards)) return [];
  return cards
    .map((card) => ({
      id: String(card?.id || '').trim(),
      number: String(card?.number || '').trim(),
      name: String(card?.name || '').trim(),
      imageSmall: String(card?.imageSmall || '').trim(),
      imageLarge: String(card?.imageLarge || '').trim(),
      supertype: String(card?.supertype || '').trim(),
      subtypes: Array.isArray(card?.subtypes) ? card.subtypes.map((value) => String(value || '').trim()).filter(Boolean) : [],
      rarity: String(card?.rarity || '').trim(),
      types: Array.isArray(card?.types) ? card.types.map((value) => String(value || '').trim()).filter(Boolean) : [],
      hp: String(card?.hp || '').trim(),
      artist: String(card?.artist || '').trim(),
      flavorText: String(card?.flavorText || '').trim(),
      evolvesFrom: String(card?.evolvesFrom || '').trim(),
      level: String(card?.level || '').trim(),
      nationalPokedexNumbers: Array.isArray(card?.nationalPokedexNumbers) ? card.nationalPokedexNumbers.map((value) => Number(value)).filter(Number.isFinite) : [],
      tcgplayerUrl: String(card?.tcgplayerUrl || '').trim(),
      cardmarketUrl: String(card?.cardmarketUrl || '').trim(),
      setId: String(card?.setId || '').trim(),
      setName: String(card?.setName || '').trim(),
      setCode: String(card?.setCode || '').trim(),
      setSeries: String(card?.setSeries || '').trim(),
      setLabel: String(card?.setLabel || '').trim(),
      setLogo: String(card?.setLogo || '').trim(),
      setSymbol: String(card?.setSymbol || '').trim(),
      owned: Boolean(card?.owned)
    }))
    .filter((card) => card.id);
}

export function serializeCollection(doc) {
  return {
    id: doc.id,
    name: doc.name,
    filters: doc.filters || {},
    totalCount: Number(doc.totalCount) || 0,
    cards: Array.isArray(doc.cards) ? doc.cards : [],
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt
  };
}
