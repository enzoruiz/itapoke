import { expect, test } from '@playwright/test';

const backendStateByPage = new WeakMap();

async function signInAsTestUser(page) {
  const state = backendStateByPage.get(page);
  state.user = {
    id: 'user-1',
    sub: 'test-user-1',
    name: 'Tester',
    email: 'tester@example.com',
    picture: ''
  };
}

function createCard({ id, name, number, rarity = 'Common', artist = 'Mock Artist', types = ['Grass'], setId = 'sv1', setName = 'Scarlet and Violet', setCode = 'SVI', setSeries = 'Scarlet and Violet' }) {
  const slug = id.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return {
    id,
    name,
    number,
    images: {
      small: `https://images.example.com/${slug}-small.png`,
      large: `https://images.example.com/${slug}-large.png`
    },
    artist,
    supertype: 'Pokemon',
    subtypes: ['Basic'],
    rarity,
    types,
    hp: '70',
    nationalPokedexNumbers: [25],
    tcgplayer: { url: `https://example.com/tcgplayer/${slug}` },
    cardmarket: { url: `https://example.com/cardmarket/${slug}` },
    set: { id: setId, name: setName, ptcgoCode: setCode, series: setSeries }
  };
}

const setsPayload = {
  data: [
    {
      id: 'sv1',
      name: 'Scarlet and Violet',
      series: 'Scarlet and Violet',
      printedTotal: 198,
      total: 258,
      ptcgoCode: 'SVI',
      releaseDate: '2023/03/31',
      images: {
        symbol: 'https://images.example.com/sv1-symbol.png',
        logo: 'https://images.example.com/sv1-logo.png'
      }
    },
    {
      id: 'cel25',
      name: 'Celebrations',
      series: 'Sword and Shield',
      printedTotal: 25,
      total: 50,
      ptcgoCode: 'CEL',
      releaseDate: '2021/10/08',
      images: {
        symbol: 'https://images.example.com/cel-symbol.png',
        logo: 'https://images.example.com/cel-logo.png'
      }
    }
  ]
};

const setCardsPayload = {
  data: [
    {
      ...createCard({ id: 'sv1-1', name: 'Sprigatito', number: '1' }),
      hp: '60',
      nationalPokedexNumbers: [906]
    },
    {
      ...createCard({ id: 'sv1-2', name: 'Floragato', number: '2', rarity: 'Uncommon' }),
      hp: '90',
      nationalPokedexNumbers: [907],
      subtypes: ['Stage 1']
    }
  ],
  page: 1,
  pageSize: 250,
  count: 2,
  totalCount: 2,
  pageCount: 1
};

const explorerOneCardPayload = {
  data: [
    createCard({ id: 'sv1-58', name: 'Pikachu', number: '58', types: ['Lightning'] })
  ],
  page: 1,
  pageSize: 24,
  count: 1,
  totalCount: 1,
  pageCount: 1
};

const explorerTwoCardsPayload = {
  data: [
    explorerOneCardPayload.data[0],
    { ...createCard({ id: 'sv1-59', name: 'Raichu', number: '59', rarity: 'Rare', types: ['Lightning'] }), subtypes: ['Stage 1'], hp: '120', nationalPokedexNumbers: [26] }
  ],
  page: 1,
  pageSize: 24,
  count: 2,
  totalCount: 2,
  pageCount: 1
};

const explorerRarePageOnePayload = {
  data: Array.from({ length: 24 }, (_, index) => createCard({ id: `sv1-r${index + 1}`, name: `Rare Pokemon ${index + 1}`, number: String(100 + index), rarity: 'Rare' })),
  page: 1,
  pageSize: 24,
  count: 24,
  totalCount: 25,
  pageCount: 2
};

const explorerRarePageTwoPayload = {
  data: [createCard({ id: 'sv1-r25', name: 'Rare Pokemon 25', number: '125', rarity: 'Rare', artist: 'Ken Sugimori' })],
  page: 2,
  pageSize: 24,
  count: 1,
  totalCount: 25,
  pageCount: 2
};

function nowIso() {
  return new Date().toISOString();
}

function sortedCollections(collections) {
  return [...collections].sort((left, right) => (right.updatedAt || '').localeCompare(left.updatedAt || '') || left.name.localeCompare(right.name));
}

function parseJsonBody(route) {
  const body = route.request().postData();
  return body ? JSON.parse(body) : {};
}

async function mockBackendApi(page) {
  const state = { user: null, collections: [] };
  backendStateByPage.set(page, state);

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/api/me' && request.method() === 'GET') {
      await route.fulfill({ json: { user: state.user } });
      return;
    }

    if (url.pathname === '/api/auth/google' && request.method() === 'POST') {
      state.user = {
        id: 'user-1',
        sub: 'google-test-user',
        name: 'Google Tester',
        email: 'google@example.com',
        picture: ''
      };
      await route.fulfill({ json: { user: state.user } });
      return;
    }

    if (url.pathname === '/api/auth/logout' && request.method() === 'POST') {
      state.user = null;
      state.collections = [];
      await route.fulfill({ json: { ok: true } });
      return;
    }

    if (!state.user) {
      await route.fulfill({ status: 401, json: { error: 'Authentication required.' } });
      return;
    }

    if (url.pathname === '/api/collections' && request.method() === 'GET') {
      await route.fulfill({ json: { collections: sortedCollections(state.collections) } });
      return;
    }

    if (url.pathname === '/api/collections' && request.method() === 'POST') {
      const body = parseJsonBody(route);
      const timestamp = nowIso();
      const baseId = String(body.name || 'coleccion').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'coleccion';
      const collection = {
        id: `${baseId}-test`,
        name: String(body.name || '').trim(),
        filters: body.filters || {},
        totalCount: Number(body.totalCount) || (Array.isArray(body.cards) ? body.cards.length : 0),
        cards: Array.isArray(body.cards) ? body.cards : [],
        createdAt: timestamp,
        updatedAt: timestamp
      };
      state.collections = sortedCollections([collection, ...state.collections.filter((entry) => entry.id !== collection.id)]);
      await route.fulfill({ status: 201, json: { collection } });
      return;
    }

    if (url.pathname === '/api/collection' && request.method() === 'GET') {
      const id = url.searchParams.get('id') || '';
      const collection = state.collections.find((entry) => entry.id === id);
      await route.fulfill(collection ? { json: { collection } } : { status: 404, json: { error: 'Collection not found.' } });
      return;
    }

    if (url.pathname === '/api/collection' && request.method() === 'PATCH') {
      const id = url.searchParams.get('id') || '';
      const body = parseJsonBody(route);
      state.collections = state.collections.map((collection) => collection.id === id
        ? { ...collection, name: String(body.name || '').trim(), updatedAt: nowIso() }
        : collection);
      const collection = state.collections.find((entry) => entry.id === id);
      await route.fulfill(collection ? { json: { collection } } : { status: 404, json: { error: 'Collection not found.' } });
      return;
    }

    if (url.pathname === '/api/collection' && request.method() === 'DELETE') {
      const id = url.searchParams.get('id') || '';
      state.collections = state.collections.filter((entry) => entry.id !== id);
      await route.fulfill({ json: { ok: true } });
      return;
    }

    if (url.pathname === '/api/collection-card' && request.method() === 'PATCH') {
      const collectionId = url.searchParams.get('collectionId') || '';
      const cardId = url.searchParams.get('cardId') || '';
      const body = parseJsonBody(route);
      state.collections = state.collections.map((collection) => {
        if (collection.id !== collectionId) return collection;
        return {
          ...collection,
          updatedAt: nowIso(),
          cards: collection.cards.map((card) => card.id === cardId ? { ...card, owned: Boolean(body.owned) } : card)
        };
      });
      const collection = state.collections.find((entry) => entry.id === collectionId);
      await route.fulfill(collection ? { json: { collection } } : { status: 404, json: { error: 'Collection not found.' } });
      return;
    }

    if (url.pathname === '/api/collection-card' && request.method() === 'DELETE') {
      const collectionId = url.searchParams.get('collectionId') || '';
      const cardId = url.searchParams.get('cardId') || '';
      const collection = state.collections.find((entry) => entry.id === collectionId);
      if (!collection) {
        await route.fulfill({ status: 404, json: { error: 'Collection not found.' } });
        return;
      }
      if (!collection.cards.some((entry) => entry.id === cardId)) {
        await route.fulfill({ status: 404, json: { error: 'Collection card not found.' } });
        return;
      }
      const updatedCollection = {
        ...collection,
        updatedAt: nowIso(),
        totalCount: Math.max(collection.cards.length - 1, 0),
        cards: collection.cards.filter((entry) => entry.id !== cardId)
      };
      state.collections = sortedCollections(state.collections.map((entry) => entry.id === collectionId ? updatedCollection : entry));
      await route.fulfill({ json: { collection: updatedCollection } });
      return;
    }

    if (url.pathname === '/api/collection-card' && request.method() === 'POST') {
      const collectionId = url.searchParams.get('collectionId') || '';
      const body = parseJsonBody(route);
      const card = body.card || null;
      const collection = state.collections.find((entry) => entry.id === collectionId);
      if (!collection) {
        await route.fulfill({ status: 404, json: { error: 'Collection not found.' } });
        return;
      }
      if (collection.cards.some((entry) => entry.id === card?.id)) {
        await route.fulfill({ status: 409, json: { error: 'Collection card already exists.' } });
        return;
      }
      const updatedCollection = {
        ...collection,
        updatedAt: nowIso(),
        totalCount: Number(collection.totalCount || collection.cards.length) + 1,
        cards: [...collection.cards, card]
      };
      state.collections = sortedCollections(state.collections.map((entry) => entry.id === collectionId ? updatedCollection : entry));
      await route.fulfill({ json: { collection: updatedCollection } });
      return;
    }

    await route.fallback();
  });
}

async function mockPokemonApi(page) {
  await page.route('https://api.pokemontcg.io/v2/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname.endsWith('/sets')) {
      await route.fulfill({ json: setsPayload });
      return;
    }

    if (url.pathname.endsWith('/cards')) {
      const query = url.searchParams.get('q') || '';
      if (query.includes('set.id:sv1') && !query.includes('name:*')) {
        await route.fulfill({ json: setCardsPayload });
        return;
      }
      if (/name:\*pikachu\*/i.test(query)) {
        await route.fulfill({ json: explorerOneCardPayload });
        return;
      }
      if (/types:lightning/i.test(query)) {
        await route.fulfill({ json: explorerTwoCardsPayload });
        return;
      }
      if (/rarity:\*rare\*/i.test(query) && (/artist:"ken sugimori"/i.test(query) || (/artist:\*ken\*/i.test(query) && /artist:\*sugimori\*/i.test(query)))) {
        await route.fulfill({ json: { ...explorerRarePageTwoPayload, page: 1, pageCount: 1, totalCount: 1 } });
        return;
      }
      if (/rarity:\*rare\*/i.test(query)) {
        const pageParam = Number(url.searchParams.get('page') || '1');
        await route.fulfill({ json: pageParam === 2 ? explorerRarePageTwoPayload : explorerRarePageOnePayload });
        return;
      }
      await route.fulfill({ json: { data: [], page: 1, pageSize: 24, count: 0, totalCount: 0, pageCount: 1 } });
      return;
    }

    await route.fallback();
  });
}

test.beforeEach(async ({ page }) => {
  await mockBackendApi(page);
  await mockPokemonApi(page);
});

test('loads expansions from Pokemon TCG API without restricted browser headers', async ({ page }) => {
  let setsRequestHeaders = null;

  await page.route('https://api.pokemontcg.io/v2/sets**', async (route) => {
    setsRequestHeaders = route.request().headers();
    await route.fulfill({ json: setsPayload });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /biblioteca de expansiones/i }).click();

  await expect(page.locator('#status')).toContainText('Mostrando 2 expansiones');
  expect(setsRequestHeaders).toBeTruthy();
  expect(setsRequestHeaders?.['user-agent'] || '').not.toContain('OpenCode Pokemon TCG Browser');
  expect(setsRequestHeaders).not.toHaveProperty('x-api-key');
  expect(setsRequestHeaders?.accept || '').toContain('application/json');
});

test('shows a friendly error when expansions API fails', async ({ page }) => {
  await page.route('https://api.pokemontcg.io/v2/sets**', async (route) => {
    await route.fulfill({ status: 500, json: { error: 'Upstream failure' } });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /biblioteca de expansiones/i }).click();

  await expect(page.locator('#status')).toContainText('No se pudieron cargar las expansiones desde la API.');
  await expect(page.locator('.error')).toContainText('No se pudieron cargar las expansiones desde la API.');
  await expect(page.locator('.expansion-card')).toHaveCount(0);
});

test('renders expansion library and opens a set detail', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /biblioteca de expansiones/i }).click();
  await expect(page.locator('#status')).toContainText('Mostrando 2 expansiones');
  await expect(page.locator('#library-shell')).toBeVisible();
  await expect(page).toHaveURL(/\/library$/);
  await page.locator('.expansion-card').first().click();

  await expect(page).toHaveURL(/\/expansion\/scarlet-and-violet\/scarlet-and-violet\/sv1$/);
  expect(page.url()).not.toContain('#');
  await expect(page.locator('#expansion-detail')).toBeVisible();
  await expect(page.locator('#expansion-summary')).toBeVisible();
  await expect(page.locator('#expansion-summary')).toContainText('Scarlet and Violet');
  await expect(page.locator('#expansion-cards .poster-item')).toHaveCount(2);
  await expect(page.locator('#expansion-cards .poster-item').first()).toBeVisible();

  await page.locator('#detail-search').fill('Floragato');
  await expect(page).toHaveURL(/\/expansion\/scarlet-and-violet\/scarlet-and-violet\/sv1\?q=Floragato$/);
  await expect(page.locator('#expansion-cards .poster-item')).toHaveCount(1);

  await page.locator('#detail-kind-filter').selectOption('Pokemon');
  await expect(page).toHaveURL(/kind=Pokemon/);

  await page.locator('#detail-sort-filter').selectOption('name-asc');
  await expect(page).toHaveURL(/sort=name-asc/);
});

test('keeps explorer cards fixed width with one or two results', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /explorador de cartas/i }).click();
  await expect(page).toHaveURL(/\/explorer$/);
  expect(page.url()).not.toContain('#');

  const nameInput = page.locator('#card-query');
  await nameInput.fill('Pikachu');
  await page.getByRole('button', { name: /buscar cartas/i }).click();
  await expect(page).toHaveURL(/\/explorer\?q=Pikachu$/);

  const firstCard = page.locator('.card-list .card-item').first();
  await expect(firstCard).toBeVisible();
  const oneCardBox = await firstCard.boundingBox();
  expect(oneCardBox?.width ?? 0).toBeGreaterThan(170);
  expect(oneCardBox?.width ?? 0).toBeLessThan(191);

  await nameInput.fill('');
  await page.locator('#element-filter').selectOption('Lightning');
  await page.getByRole('button', { name: /buscar cartas/i }).click();
  await expect(page).toHaveURL(/\/explorer\?element=Lightning$/);

  const cards = page.locator('.card-list .card-item');
  await expect(cards).toHaveCount(2);
  const firstTwoCardBox = await cards.nth(0).boundingBox();
  const secondTwoCardBox = await cards.nth(1).boundingBox();
  expect(firstTwoCardBox?.width ?? 0).toBeGreaterThan(170);
  expect(firstTwoCardBox?.width ?? 0).toBeLessThan(191);
  expect(secondTwoCardBox?.width ?? 0).toBeGreaterThan(170);
  expect(secondTwoCardBox?.width ?? 0).toBeLessThan(191);
});

test('shows simplified modal details and no zoom helper text', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /biblioteca de expansiones/i }).click();
  await page.locator('.expansion-card').first().click();
  await page.locator('.poster-item').first().click();

  await expect(page.locator('#card-modal')).toBeVisible();
  await expect(page.locator('#modal-subtitle')).toContainText('Scarlet and Violet (SVI) - #1');
  await expect(page.locator('.modal-set-image')).toBeVisible();
  await expect(page.locator('.modal-set-panel')).toContainText('Scarlet and Violet');
  await expect(page.locator('#modal-meta')).toContainText('Rareza');
  await expect(page.locator('#modal-meta')).toContainText('Artista');
  await expect(page.locator('#modal-meta')).not.toContainText('HP');
  await expect(page.locator('#modal-meta')).not.toContainText('Supertype');
  await expect(page.locator('.modal-zoom-note')).toHaveCount(0);
  await expect(page.locator('#modal-links a')).toHaveCount(3);
});

test('supports advanced explorer filters and pagination', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /explorador de cartas/i }).click();
  await expect(page).toHaveURL(/\/explorer$/);

  await page.locator('#rarity-filter').fill('Rare');
  await page.getByRole('button', { name: /buscar cartas/i }).click();
  await expect(page).toHaveURL(/\/explorer\?rarity=Rare$/);

  await expect(page.locator('.card-list .card-item')).toHaveCount(24);
  await expect(page.locator('#explorer-page-label')).toContainText('Pagina 1 de 2');

  await page.locator('#explorer-next').click();
  await expect(page).toHaveURL(/\/explorer\?rarity=Rare&page=2$/);
  await expect(page.locator('#explorer-page-label')).toContainText('Pagina 2 de 2');
  await expect(page.locator('.card-list .card-name')).toContainText(['Rare Pokemon 25']);

  await page.locator('#artist-filter').fill('Ken Sugimori');
  await expect(page.locator('#artist-filter')).toHaveValue('Ken Sugimori');
  await page.getByRole('button', { name: /buscar cartas/i }).click();
  await expect(page).toHaveURL(/\/explorer\?artist=Ken\+Sugimori&rarity=Rare|\/explorer\?rarity=Rare&artist=Ken\+Sugimori/);

  await expect(page.locator('#explorer-page-label')).toContainText('Pagina 1 de 1');
  await expect(page.locator('.card-list .card-item')).toHaveCount(1);
  await expect(page.locator('.card-list .card-name')).toContainText(['Rare Pokemon 25']);
});

test('resets explorer filters and results after navigating away and back', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /explorador de cartas/i }).click();
  await page.locator('#card-query').fill('Pikachu');
  await page.getByRole('button', { name: /buscar cartas/i }).click();

  await expect(page).toHaveURL(/\/explorer\?q=Pikachu$/);
  await expect(page.locator('.card-list .card-item')).toHaveCount(1);

  await page.locator('#explorer-home').click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole('button', { name: /biblioteca de expansiones/i }).click();
  await expect(page).toHaveURL(/\/library$/);

  await page.locator('#library-home').click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole('button', { name: /explorador de cartas/i }).click();
  await expect(page).toHaveURL(/\/explorer$/);
  await expect(page.locator('#card-query')).toHaveValue('');
  await expect(page.locator('#explorer-results')).toContainText('Todavia no hiciste una busqueda en vivo.');
  await expect(page.locator('.card-list .card-item')).toHaveCount(0);
});

test('creates personal collections from explorer filters and tracks owned cards', async ({ page }) => {
  await signInAsTestUser(page);
  await page.goto('/');
  await page.getByRole('button', { name: /explorador de cartas/i }).click();
  await page.locator('#rarity-filter').fill('Rare');
  await page.getByRole('button', { name: /buscar cartas/i }).click();

  await expect(page.locator('#create-collection')).toBeEnabled();
  await page.locator('#create-collection').click();
  await expect(page.locator('#collection-name-modal')).toBeVisible();
  await page.locator('#collection-name-input').fill('Rares favoritos');
  await page.locator('#collection-name-submit').click();

  await expect(page).toHaveURL(/\/mis-colecciones\/rares-favoritos-/);
  await expect(page.locator('#collection-summary')).toContainText('Rares favoritos');
  await expect(page.locator('.collection-entry')).toHaveCount(25);

  const firstCard = page.locator('.collection-entry').first();
  const firstToggle = firstCard.locator('.collection-entry-toggle');
  await expect(firstCard).not.toHaveClass(/is-owned/);
  await firstCard.click();
  await expect(firstCard).toHaveClass(/is-owned/);
  await expect(firstToggle).toHaveAttribute('aria-pressed', 'true');
  await firstCard.click();
  await expect(firstCard).not.toHaveClass(/is-owned/);
  await expect(firstToggle).toHaveAttribute('aria-pressed', 'false');

  await firstCard.click();
  await expect(firstCard).toHaveClass(/is-owned/);
  await page.locator('#collection-filter-owned').click();
  await expect(page.locator('.collection-entry')).toHaveCount(1);
  await page.locator('#collection-filter-missing').click();
  await expect(page.locator('.collection-entry')).toHaveCount(24);
  await page.locator('#collection-filter-all').click();
  await expect(page.locator('.collection-entry')).toHaveCount(25);

  await page.locator('#collection-back').click();
  await expect(page).toHaveURL(/\/mis-colecciones$/);
  await expect(page.locator('#collections-list')).toContainText('Rares favoritos');
  await expect(page.locator('#collections-list')).toContainText('1 tengo');
});

test('supports renaming and deleting a collection', async ({ page }) => {
  await signInAsTestUser(page);
  await page.goto('/');
  await page.getByRole('button', { name: /explorador de cartas/i }).click();
  await page.locator('#rarity-filter').fill('Rare');
  await page.getByRole('button', { name: /buscar cartas/i }).click();

  await page.locator('#create-collection').click();
  await page.locator('#collection-name-input').fill('Coleccion temporal');
  await page.locator('#collection-name-submit').click();
  await expect(page.locator('#collection-summary')).toContainText('Coleccion temporal');

  await page.locator('#collection-rename').click();
  await expect(page.locator('#collection-name-modal')).toBeVisible();
  await page.locator('#collection-name-input').fill('Coleccion final');
  await page.locator('#collection-name-submit').click();
  await expect(page.locator('#collection-summary')).toContainText('Coleccion final');

  await page.locator('#collection-delete').click();
  await expect(page.locator('#collection-delete-modal')).toBeVisible();
  await expect(page.locator('#collection-delete-title')).toContainText('Coleccion final');
  await page.locator('#collection-delete-confirm').click();
  await expect(page).toHaveURL(/\/mis-colecciones$/);
  await expect(page.locator('#collections-status')).toContainText('Todavia no creaste ninguna coleccion');
});

test('creates a collection from expansion detail filters', async ({ page }) => {
  await signInAsTestUser(page);
  await page.goto('/');
  await page.getByRole('button', { name: /biblioteca de expansiones/i }).click();
  await page.locator('.expansion-card').first().click();

  await expect(page.locator('#detail-create-collection')).toBeEnabled();
  await page.locator('#detail-search').fill('Floragato');
  await expect(page.locator('#expansion-cards .poster-item')).toHaveCount(1);

  await page.locator('#detail-create-collection').click();
  await expect(page.locator('#collection-name-modal')).toBeVisible();
  await page.locator('#collection-name-input').fill('Floragato set');
  await page.locator('#collection-name-submit').click();

  await expect(page).toHaveURL(/\/mis-colecciones\/floragato-set-/);
  await expect(page.locator('#collection-summary')).toContainText('Floragato set');
  await expect(page.locator('.collection-entry')).toHaveCount(1);
  await expect(page.locator('#collection-summary')).toContainText('Buscar: Floragato');
});

test('adds a card to an existing collection from the card modal', async ({ page }) => {
  await signInAsTestUser(page);
  await page.goto('/');
  await page.getByRole('button', { name: /biblioteca de expansiones/i }).click();
  await page.locator('.expansion-card').first().click();
  await page.locator('#detail-search').fill('Floragato');
  await expect(page.locator('#expansion-cards .poster-item')).toHaveCount(1);
  await page.locator('#detail-create-collection').click();
  await page.locator('#collection-name-input').fill('Mi set de Floragato');
  await page.locator('#collection-name-submit').click();
  await expect(page.locator('#collection-summary')).toContainText('Mi set de Floragato');

  await page.goto('/library');
  await page.locator('.expansion-card').first().click();
  await page.locator('#detail-search').fill('');
  await expect(page.locator('#expansion-cards .poster-item')).toHaveCount(2);
  await page.locator('.poster-item').first().click();

  await expect(page.locator('#card-modal')).toBeVisible();
  await expect(page.locator('#modal-collection-select')).toHaveValue(/mi-set-de-floragato-/);
  await expect(page.locator('#modal-collection-submit')).toBeEnabled();
  await page.locator('#modal-collection-submit').click();
  await expect(page.locator('#modal-collection-status')).toContainText('Carta agregada');
  await expect(page.locator('#modal-collection-submit')).toBeDisabled();

  await page.locator('#modal-close').click();
  await page.goto('/mis-colecciones');
  await page.getByRole('button', { name: /ver detalle/i }).click();
  await expect(page.locator('.collection-entry')).toHaveCount(2);
  await expect(page.locator('#collection-cards')).toContainText('Sprigatito');
  await expect(page.locator('#collection-cards')).toContainText('Floragato');
});

test('removes a card from a collection and deletes a collection from the list', async ({ page }) => {
  await signInAsTestUser(page);
  await page.goto('/');
  await page.getByRole('button', { name: /biblioteca de expansiones/i }).click();
  await page.locator('.expansion-card').first().click();
  await page.locator('#detail-create-collection').click();
  await page.locator('#collection-name-input').fill('Coleccion editable');
  await page.locator('#collection-name-submit').click();

  await expect(page.locator('.collection-entry')).toHaveCount(2);
  const firstEntry = page.locator('.collection-entry').first();
  const firstName = await firstEntry.locator('.card-name').textContent();
  await firstEntry.getByRole('button', { name: /quitar/i }).click();
  await expect(page.locator('#collection-card-remove-modal')).toBeVisible();
  await expect(page.locator('#collection-card-remove-name')).toContainText(firstName || '');
  await page.locator('#collection-card-remove-confirm').click();
  await expect(page.locator('.collection-entry')).toHaveCount(1);
  await expect(page.locator('#collection-cards')).not.toContainText(firstName || '');

  await page.locator('#collection-back').click();
  await expect(page).toHaveURL(/\/mis-colecciones$/);
  const collectionCard = page.locator('#collections-list .collection-card').filter({ hasText: 'Coleccion editable' }).first();
  await collectionCard.getByRole('button', { name: /eliminar/i }).click();
  await expect(page.locator('#collection-delete-modal')).toBeVisible();
  await expect(page.locator('#collection-delete-name')).toContainText('Coleccion editable');
  await page.locator('#collection-delete-confirm').click();
  await expect(page.locator('#collections-list')).not.toContainText('Coleccion editable');
});

test('opens Mis Colecciones from the main screen', async ({ page }) => {
  await signInAsTestUser(page);
  await page.goto('/');
  await page.getByRole('button', { name: /mis colecciones/i }).click();

  await expect(page).toHaveURL(/\/mis-colecciones$/);
  await expect(page.locator('#collections-shell')).toBeVisible();
  await expect(page.locator('#collections-status')).toContainText('Todavia no creaste ninguna coleccion');
});

test('supports clean direct routes without hash fragments', async ({ page }) => {
  await page.goto('/explorer?q=Pikachu');

  await expect(page.locator('#explorer-panel')).toBeVisible();
  await expect(page.locator('#not-found-shell')).toBeHidden();
  await expect(page.locator('#card-query')).toHaveValue('Pikachu');
  await expect(page.locator('.card-list .card-item')).toHaveCount(1);
  await expect(page).toHaveURL(/\/explorer\?q=Pikachu$/);
  expect(page.url()).not.toContain('#');
});

test('hydrates expansion detail filters from query params', async ({ page }) => {
  await page.goto('/expansion/scarlet-and-violet/scarlet-and-violet/sv1?q=Floragato&kind=Pokemon&sort=name-asc');

  await expect(page.locator('#expansion-detail')).toBeVisible();
  await expect(page.locator('#not-found-shell')).toBeHidden();
  await expect(page.locator('#detail-search')).toHaveValue('Floragato');
  await expect(page.locator('#detail-kind-filter')).toHaveValue('Pokemon');
  await expect(page.locator('#detail-sort-filter')).toHaveValue('name-asc');
  await expect(page.locator('#expansion-cards .poster-item')).toHaveCount(1);
  expect(page.url()).not.toContain('#');
});

test('keeps 404 hidden on library route', async ({ page }) => {
  await page.goto('/library');

  await expect(page.locator('#library-shell')).toBeVisible();
  await expect(page.locator('#not-found-shell')).toBeHidden();
  expect(page.url()).not.toContain('#');
});

test('shows a friendly 404 screen for invalid routes without changing the url', async ({ page }) => {
  await page.goto('/ruta-que-no-existe');

  await expect(page.locator('#not-found-shell')).toBeVisible();
  await expect(page.locator('#not-found-shell')).toContainText('404');
  await expect(page).toHaveURL(/\/ruta-que-no-existe$/);
  expect(page.url()).not.toContain('#');
});
