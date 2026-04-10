let collectionsCache = [];

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const error = new Error(payload.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return payload || {};
}

function sortCollections(collections) {
  return [...collections].sort((left, right) => (right.updatedAt || '').localeCompare(left.updatedAt || '') || left.name.localeCompare(right.name));
}

export async function listCollections({ force = false } = {}) {
  if (!force && collectionsCache.length) return sortCollections(collectionsCache);
  const payload = await apiRequest('/api/collections');
  collectionsCache = Array.isArray(payload.collections) ? payload.collections : [];
  return sortCollections(collectionsCache);
}

export async function getCollection(collectionId, { force = false } = {}) {
  if (!force) {
    const cached = collectionsCache.find((collection) => collection.id === collectionId);
    if (cached) return cached;
  }
  const payload = await apiRequest(`/api/collection?id=${encodeURIComponent(collectionId)}`);
  if (payload.collection) {
    collectionsCache = sortCollections([
      ...collectionsCache.filter((collection) => collection.id !== payload.collection.id),
      payload.collection
    ]);
  }
  return payload.collection || null;
}

export async function createCollection({ name, filters, totalCount, cards }) {
  const payload = await apiRequest('/api/collections', {
    method: 'POST',
    body: JSON.stringify({ name, filters, totalCount, cards })
  });
  if (payload.collection) {
    collectionsCache = sortCollections([payload.collection, ...collectionsCache.filter((collection) => collection.id !== payload.collection.id)]);
  }
  return payload.collection;
}

export async function renameCollection(collectionId, name) {
  const payload = await apiRequest(`/api/collection?id=${encodeURIComponent(collectionId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name })
  });
  if (payload.collection) {
    collectionsCache = sortCollections([
      ...collectionsCache.filter((collection) => collection.id !== payload.collection.id),
      payload.collection
    ]);
  }
  return payload.collection || null;
}

export async function deleteCollection(collectionId) {
  await apiRequest(`/api/collection?id=${encodeURIComponent(collectionId)}`, { method: 'DELETE' });
  collectionsCache = collectionsCache.filter((collection) => collection.id !== collectionId);
}

export async function updateCollectionCardOwnership(collectionId, cardId, owned) {
  const payload = await apiRequest(`/api/collection-card?collectionId=${encodeURIComponent(collectionId)}&cardId=${encodeURIComponent(cardId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ owned })
  });
  if (payload.collection) {
    collectionsCache = sortCollections([
      ...collectionsCache.filter((collection) => collection.id !== payload.collection.id),
      payload.collection
    ]);
  }
  return payload.collection || null;
}

export async function addCardToCollection(collectionId, card) {
  const payload = await apiRequest(`/api/collection-card?collectionId=${encodeURIComponent(collectionId)}`, {
    method: 'POST',
    body: JSON.stringify({ card })
  });
  if (payload.collection) {
    collectionsCache = sortCollections([
      ...collectionsCache.filter((collection) => collection.id !== payload.collection.id),
      payload.collection
    ]);
  }
  return payload.collection || null;
}

export async function removeCardFromCollection(collectionId, cardId) {
  const payload = await apiRequest(`/api/collection-card?collectionId=${encodeURIComponent(collectionId)}&cardId=${encodeURIComponent(cardId)}`, {
    method: 'DELETE'
  });
  if (payload.collection) {
    collectionsCache = sortCollections([
      ...collectionsCache.filter((collection) => collection.id !== payload.collection.id),
      payload.collection
    ]);
  }
  return payload.collection || null;
}

export function clearCollectionsCache() {
  collectionsCache = [];
}
