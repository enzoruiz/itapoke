import { escapeHtml } from './utils.js';

export const APP_SHELL = `
  <main class="shell">
    <section class="auth-bar" id="auth-bar">
      <div class="auth-copy" id="auth-copy">Inicia sesion con Google</div>
      <div class="auth-controls" id="auth-controls"></div>
    </section>

    <section class="mode-shell" id="mode-shell">
      <div class="mode-shell-head">
        <div>
          <p class="eyebrow">Elige tu ruta</p>
          <h2>Tres rutas principales para entrar al archivo Pokemon TCG</h2>
        </div>
        <div class="mode-caption" id="mode-caption">Elige entre buscar cartas concretas, recorrer expansiones o entrar a tus colecciones guardadas.</div>
      </div>
      <div class="mode-grid" aria-label="Secciones principales">
        <button class="mode-card" id="mode-explorer" type="button" data-mode="explorer" aria-pressed="false">
          <span class="mode-card-art mode-card-art-explorer" aria-hidden="true"></span>
          <span class="mode-card-badge">Busqueda viva</span>
          <strong>Explorador de cartas</strong>
          <span>Encuentra cartas por nombre, expansion, artista, rareza y tipo con resultados actualizados.</span>
        </button>
        <button class="mode-card" id="mode-library" type="button" data-mode="library" aria-pressed="false">
          <span class="mode-card-art mode-card-art-library" aria-hidden="true"></span>
          <span class="mode-card-badge">Ruta de coleccion</span>
          <strong>Biblioteca de expansiones</strong>
          <span>Avanza por series, abre un set y revisa su galeria completa como si hojeases un album.</span>
        </button>
        <button class="mode-card" id="mode-collections" type="button" data-mode="collections" aria-pressed="false">
          <span class="mode-card-art mode-card-art-collections" aria-hidden="true"></span>
          <span class="mode-card-badge">Seguimiento propio</span>
          <strong>Mis Colecciones</strong>
          <span>Guarda resultados del explorador y marca rapido cuales cartas ya tienes y cuales te faltan.</span>
        </button>
      </div>
    </section>

    <section class="explorer" id="explorer-panel" hidden>
      <div class="explorer-head">
        <div>
          <p class="eyebrow">Explorador de cartas</p>
          <h2>Haz una busqueda afinada y encuentra tu proxima carta favorita</h2>
          <p class="explorer-copy">Combina filtros para aterrizar rapido en una carta concreta o para curiosear entre artistas, rarezas y expansiones sin perder el tono calido de la landing.</p>
        </div>
        <button class="action-btn" id="explorer-home" type="button">Volver al inicio</button>
      </div>
      <div class="explorer-grid">
        <label>Nombre o texto de carta<input id="card-query" type="search" placeholder="Charizard, Pikachu, Profesor..." /></label>
        <label>Expansion<select id="expansion-filter"><option value="">Cualquier expansion</option></select></label>
        <label>Artista<input id="artist-filter" type="search" placeholder="Ken Sugimori, 5ban Graphics..." /></label>
        <label>Clase de carta<select id="card-kind-filter"><option value="">Cualquiera</option><option value="Pokemon">Pokemon</option><option value="Trainer">Entrenador</option><option value="Energy">Energia</option></select></label>
        <label>Tipo elemental<select id="element-filter"><option value="">Cualquier elemento</option><option value="Grass">Planta</option><option value="Fire">Fuego</option><option value="Water">Agua</option><option value="Lightning">Rayo</option><option value="Psychic">Psiquico</option><option value="Fighting">Lucha</option><option value="Darkness">Oscuridad</option><option value="Metal">Metal</option><option value="Dragon">Dragon</option><option value="Colorless">Incoloro</option><option value="Fairy">Hada</option></select></label>
        <label>Rareza<input id="rarity-filter" type="search" placeholder="Rare Holo, Common, Illustration Rare..." /></label>
      </div>
      <div class="explorer-actions">
        <button class="action-btn primary" id="run-filters" type="button">Buscar cartas</button>
        <button class="action-btn accent" id="create-collection" type="button" disabled>Crear Coleccion</button>
        <button class="action-btn" id="clear-filters" type="button">Limpiar filtros</button>
      </div>
      <div id="explorer-status">Elige uno o mas filtros para buscar cartas entre las expansiones incluidas.</div>
      <div id="explorer-results"><div class="empty">Todavia no hiciste una busqueda en vivo.</div></div>
      <div class="pager" id="explorer-pager" hidden>
        <div id="explorer-page-label">Pagina 1</div>
        <div class="view-toggle"><button class="action-btn" id="explorer-prev" type="button">Anterior</button><button class="action-btn" id="explorer-next" type="button">Siguiente</button></div>
      </div>
    </section>

    <section class="library-shell" id="library-shell">
      <div class="library-head">
        <div>
          <p class="eyebrow">Biblioteca de expansiones</p>
          <h2>Recorre las eras, detecta tus sets favoritos y abre cada expansion con un toque</h2>
          <p class="explorer-copy">La biblioteca esta pensada como un mapa visual: cada pagina te muestra una serie y cada logo te lleva al detalle del set para seguir explorando cartas.</p>
        </div>
        <div class="library-head-actions">
          <div id="status">Cargando expansiones...</div>
          <button class="action-btn" id="library-home" type="button">Volver al inicio</button>
        </div>
      </div>
      <div class="series-pager" id="series-pager">
        <button class="action-btn" id="series-prev" type="button">Serie anterior</button>
        <div class="series-page-label" id="series-page-label">Pagina de serie 1</div>
        <button class="action-btn" id="series-next" type="button">Serie siguiente</button>
      </div>
      <section id="series-list" aria-live="polite"><div class="loading">Cargando expansiones desde la API de Pokemon TCG...</div></section>
    </section>

    <section class="expansion-detail" id="expansion-detail" hidden>
      <div class="detail-nav">
        <button class="action-btn" id="detail-back" type="button">Volver a expansiones</button>
        <button class="action-btn accent" id="detail-create-collection" type="button" disabled>Crear Coleccion</button>
      </div>
      <div id="expansion-summary"></div>
      <div class="detail-filters">
        <label>Buscar cartas<input id="detail-search" type="search" placeholder="Charizard, Pikachu, Rare, Entrenador..." /></label>
        <label>Clase de carta<select id="detail-kind-filter"><option value="">Cualquiera</option><option value="Pokemon">Pokemon</option><option value="Trainer">Entrenador</option><option value="Energy">Energia</option></select></label>
        <label>Ordenar cartas<select id="detail-sort-filter"><option value="number-asc">Numero ascendente</option><option value="number-desc">Numero descendente</option><option value="name-asc">Nombre A-Z</option></select></label>
      </div>
      <div class="detail-status" id="expansion-cards-status"></div>
      <div id="expansion-cards"></div>
    </section>

    <section class="collections-shell" id="collections-shell" hidden>
      <div class="library-head collections-head">
        <div>
          <p class="eyebrow">Mis Colecciones</p>
          <h2>Tu archivo personal para seguir que cartas tienes y cuales aun buscas</h2>
          <p class="explorer-copy">Cada coleccion nace desde un filtro del explorador y queda guardada para revisar progreso, faltantes y duplicados de interes.</p>
        </div>
        <div class="library-head-actions">
          <div id="collections-status">Todavia no creaste ninguna coleccion.</div>
          <button class="action-btn" id="collections-home" type="button">Volver al inicio</button>
        </div>
      </div>
      <div id="collections-list"><div class="empty">Todavia no guardaste colecciones desde el explorador.</div></div>
    </section>

    <section class="collection-detail" id="collection-detail" hidden>
      <div class="detail-nav collection-detail-nav">
        <button class="action-btn" id="collection-back" type="button">Volver a Mis Colecciones</button>
        <div class="collection-detail-actions">
          <button class="action-btn" id="collection-rename" type="button">Renombrar</button>
          <button class="action-btn danger" id="collection-delete" type="button">Borrar</button>
        </div>
      </div>
      <div id="collection-summary"></div>
      <div class="collection-ownership-filters" id="collection-ownership-filters">
        <button class="action-btn active" id="collection-filter-all" type="button" data-collection-filter="all" aria-pressed="true">Todas</button>
        <button class="action-btn" id="collection-filter-owned" type="button" data-collection-filter="owned" aria-pressed="false">Las tengo</button>
        <button class="action-btn" id="collection-filter-missing" type="button" data-collection-filter="missing" aria-pressed="false">No las tengo</button>
      </div>
      <div class="detail-status" id="collection-cards-status"></div>
      <div id="collection-cards"></div>
    </section>

    <section class="mode-shell not-found-shell" id="not-found-shell" hidden>
      <div class="not-found-copy">
        <p class="eyebrow">404</p>
        <h2>Esta ruta no existe dentro del archivo Pokemon TCG</h2>
        <p class="subtitle">Puede que el enlace este incompleto, sea antiguo o que la expansion ya no coincida con una ruta valida.</p>
        <div class="hero-actions">
          <button class="action-btn primary" id="not-found-home" type="button">Volver al inicio</button>
          <button class="action-btn" id="not-found-library" type="button">Ir a expansiones</button>
        </div>
      </div>
    </section>

    <p class="footnote">Fuente de datos: API publica de Pokemon TCG en pokemontcg.io. La app guarda expansiones, cartas y resultados localmente, y luego los revalida en segundo plano.</p>
  </main>

  <div class="modal" id="card-modal" hidden>
    <div class="modal-frame">
      <article class="modal-card">
        <div class="modal-top">
          <div>
            <p class="eyebrow">Detalle de carta</p>
            <h2 id="modal-title">Carta</h2>
          </div>
          <button class="modal-close" id="modal-close" type="button">Cerrar</button>
        </div>
        <div class="modal-grid">
          <div class="modal-image-wrap">
            <button class="modal-image-button" id="modal-image-button" type="button" aria-label="Acercar carta">
              <img class="modal-image" id="modal-image" alt="" />
            </button>
          </div>
          <div>
            <p id="modal-subtitle" class="subtitle"></p>
            <div class="modal-meta" id="modal-meta"></div>
            <div class="modal-links" id="modal-links"></div>
          </div>
        </div>
      </article>
    </div>
  </div>

  <div class="modal" id="collection-name-modal" hidden>
    <div class="modal-frame prompt-modal-frame">
      <article class="modal-card prompt-modal-card">
        <form class="prompt-form" id="collection-name-form">
          <div class="modal-top">
            <div>
              <p class="eyebrow" id="collection-name-kicker">Nueva coleccion</p>
              <h2 id="collection-name-title">Ponle nombre a tu coleccion</h2>
            </div>
            <button class="modal-close" id="collection-name-close" type="button">Cerrar</button>
          </div>
          <p class="subtitle prompt-copy" id="collection-name-copy">Guarda este grupo de cartas para seguir cuales ya tienes y cuales aun te faltan.</p>
          <label>
            Nombre de la coleccion
            <input id="collection-name-input" name="collectionName" type="text" maxlength="80" placeholder="Mis favoritas de Scarlet and Violet" />
          </label>
          <div class="prompt-actions">
            <button class="action-btn" id="collection-name-cancel" type="button">Cancelar</button>
            <button class="action-btn accent" id="collection-name-submit" type="submit">Guardar coleccion</button>
          </div>
        </form>
      </article>
    </div>
  </div>
`;

export function topStatsMarkup(totals, fromCache) {
  return [
    ['Expansiones', totals.sets.toLocaleString()],
    ['Sets principales', totals.main.toLocaleString()],
    ['Sets especiales', totals.special.toLocaleString()],
    ['Datos', fromCache ? 'Cache + live' : 'API live']
  ].map(([label, value]) => `<article class="stat"><span class="stat-label">${label}</span><strong>${value}</strong></article>`).join('');
}

export function buildLazyImage(url, alt, className = 'card-art lazy-image', eager = false) {
  if (!url) return '<div class="card-art-placeholder" aria-hidden="true"></div>';
  if (eager) return `<img class="${escapeHtml(className)}" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" decoding="async" fetchpriority="high" />`;
  return `<img class="${escapeHtml(className)}" data-src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" fetchpriority="low" />`;
}

export function buildCardButtonMarkup(card, setLabel, fallbackSetId = '', eager = false) {
  const setMark = card.setLogo
    ? `<img class="explorer-set-mark" src="${escapeHtml(card.setLogo)}" alt="Logo de ${escapeHtml(setLabel)}" />`
    : card.setSymbol
      ? `<img class="explorer-set-mark explorer-set-symbol" src="${escapeHtml(card.setSymbol)}" alt="Simbolo de ${escapeHtml(setLabel)}" />`
      : `<span class="explorer-set-mark explorer-set-fallback" aria-hidden="true">${escapeHtml((card.setCode || setLabel || 'SET').slice(0, 3))}</span>`;
  return `<li class="card-item"><button class="card-trigger explorer-card-trigger" type="button" data-set-id="${escapeHtml(card.setId || fallbackSetId)}" data-card-id="${escapeHtml(card.id)}">${buildLazyImage(card.imageSmall, `Carta de ${card.name}`, 'card-art lazy-image', eager)}<div class="card-body explorer-card-body"><div class="explorer-card-head"><span class="card-number">#${escapeHtml(card.number)}</span>${setMark}</div><span class="card-name">${escapeHtml(card.name)}</span></div></button></li>`;
}

export function buildExpansionCardMarkup(set) {
  const media = set.logo
    ? `<img class="expansion-logo lazy-image" data-src="${escapeHtml(set.logo)}" alt="Logo de ${escapeHtml(set.displayName)}" loading="lazy" decoding="async" fetchpriority="low" />`
    : set.symbol
      ? `<img class="expansion-logo expansion-symbol lazy-image" data-src="${escapeHtml(set.symbol)}" alt="Simbolo de ${escapeHtml(set.displayName)}" loading="lazy" decoding="async" fetchpriority="low" />`
      : `<div class="expansion-logo expansion-logo-placeholder" aria-hidden="true">${escapeHtml(set.code.slice(0, 3))}</div>`;
  return `<button class="expansion-card" type="button" data-open-set-id="${escapeHtml(set.id)}" aria-label="Abrir ${escapeHtml(set.displayName)}">${media}<span class="sr-only">${escapeHtml(set.displayName)}</span></button>`;
}

export function buildExpansionSummaryMarkup(set, count) {
  return `<article class="detail-hero"><div class="detail-hero-main"><div class="detail-logo-wrap">${set.logo ? `<img class="detail-logo" src="${escapeHtml(set.logo)}" alt="Logo de ${escapeHtml(set.displayName)}" />` : set.symbol ? `<img class="detail-logo detail-symbol" src="${escapeHtml(set.symbol)}" alt="Simbolo de ${escapeHtml(set.displayName)}" />` : `<div class="detail-logo detail-logo-placeholder" aria-hidden="true">${escapeHtml(set.code.slice(0, 3))}</div>`}</div><div><p class="eyebrow">${escapeHtml(set.series)}</p><h2>${escapeHtml(set.displayName)}</h2><p class="subtitle">Expansion ${escapeHtml(set.category)} dentro de la serie ${escapeHtml(set.series)}.</p></div></div><div class="detail-facts"><article class="detail-fact"><span>Serie</span><strong>${escapeHtml(set.series)}</strong></article><article class="detail-fact"><span>Lanzamiento</span><strong>${escapeHtml(set.releaseDate)}</strong></article><article class="detail-fact"><span>Impresas</span><strong>${escapeHtml(String(set.printedTotal))}</strong></article><article class="detail-fact"><span>Total</span><strong>${escapeHtml(String(set.total))}</strong></article><article class="detail-fact"><span>Codigo</span><strong>${escapeHtml(set.code)}</strong></article><article class="detail-fact"><span>Cartas cargadas</span><strong>${count.toLocaleString()}</strong></article></div></article>`;
}

export function buildExpansionDetailLoaderMarkup(set) {
  const media = set.logo
    ? `<img class="detail-loader-logo" src="${escapeHtml(set.logo)}" alt="Logo de ${escapeHtml(set.displayName)}" />`
    : set.symbol
      ? `<img class="detail-loader-logo detail-loader-symbol" src="${escapeHtml(set.symbol)}" alt="Simbolo de ${escapeHtml(set.displayName)}" />`
      : `<div class="detail-loader-logo detail-loader-placeholder" aria-hidden="true">${escapeHtml(set.code.slice(0, 3))}</div>`;
  const skeletons = Array.from({ length: 8 }, (_, index) => `<li class="detail-skeleton-item" style="--skeleton-delay:${index * 70}ms" aria-hidden="true"><div class="detail-skeleton-card"></div></li>`).join('');
  return `<div class="detail-loader" role="status" aria-live="polite"><div class="detail-loader-orbit"><span class="detail-loader-ring detail-loader-ring-outer" aria-hidden="true"></span><span class="detail-loader-ring detail-loader-ring-inner" aria-hidden="true"></span><div class="detail-loader-core">${media}</div></div><div class="detail-loader-copy"><p class="detail-loader-kicker">Preparando expansion</p><strong>${escapeHtml(set.displayName)}</strong><span>Cargando cartas desde cache o API en vivo...</span></div></div><ol class="detail-skeleton-grid">${skeletons}</ol>`;
}

export function buildCompactCardPosterMarkup(card, setId, eager = false) {
  return `<li class="poster-item"><button class="card-poster" type="button" data-set-id="${escapeHtml(setId)}" data-card-id="${escapeHtml(card.id)}">${buildLazyImage(card.imageSmall, `Carta de ${card.name}`, 'poster-art lazy-image', eager)}<span class="sr-only">${escapeHtml(card.name)}</span></button></li>`;
}

export function buildModalFact(label, value) {
  return `<div class="modal-fact"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value || 'No disponible')}</span></div>`;
}

export function buildCollectionCardMarkup(collection) {
  const ownedCount = (collection.cards || []).filter((card) => card.owned).length;
  const missingCount = Math.max((collection.cards || []).length - ownedCount, 0);
  const filterBits = Object.entries(collection.filters || {})
    .filter(([, value]) => String(value || '').trim())
    .map(([key, value]) => `${key}: ${value}`);
  return `<article class="collection-card"><div class="collection-card-main"><p class="eyebrow">Coleccion guardada</p><h3>${escapeHtml(collection.name)}</h3><p class="subtitle">${filterBits.length ? escapeHtml(filterBits.join(' - ')) : 'Coleccion creada desde una busqueda filtrada del explorador.'}</p></div><div class="collection-metrics"><span>${(collection.cards || []).length.toLocaleString()} cartas</span><span>${ownedCount.toLocaleString()} tengo</span><span>${missingCount.toLocaleString()} me faltan</span></div><button class="action-btn primary" type="button" data-open-collection-id="${escapeHtml(collection.id)}">Ver detalle</button></article>`;
}

export function buildCollectionSummaryMarkup(collection) {
  const cards = collection.cards || [];
  const ownedCount = cards.filter((card) => card.owned).length;
  const missingCount = Math.max(cards.length - ownedCount, 0);
  const filterBits = Object.entries(collection.filters || {})
    .filter(([, value]) => String(value || '').trim())
    .map(([key, value]) => `<span>${escapeHtml(key)}: ${escapeHtml(value)}</span>`)
    .join('');
  return `<article class="detail-hero collection-hero"><div class="detail-hero-main"><div><p class="eyebrow">Coleccion personal</p><h2>${escapeHtml(collection.name)}</h2><p class="subtitle">Listado guardado desde el explorador para seguir tus cartas obtenidas y las que aun buscas.</p></div></div><div class="detail-facts"><article class="detail-fact"><span>Cartas</span><strong>${cards.length.toLocaleString()}</strong></article><article class="detail-fact"><span>Tengo</span><strong>${ownedCount.toLocaleString()}</strong></article><article class="detail-fact"><span>Me faltan</span><strong>${missingCount.toLocaleString()}</strong></article><article class="detail-fact"><span>Coincidencias</span><strong>${Number(collection.totalCount || cards.length).toLocaleString()}</strong></article></div>${filterBits ? `<div class="collection-filter-chips">${filterBits}</div>` : ''}</article>`;
}

export function buildCollectionDetailCardMarkup(collectionId, card) {
  const setMark = card.setLogo
    ? `<img class="explorer-set-mark" src="${escapeHtml(card.setLogo)}" alt="Logo de ${escapeHtml(card.setLabel)}" />`
    : card.setSymbol
      ? `<img class="explorer-set-mark explorer-set-symbol" src="${escapeHtml(card.setSymbol)}" alt="Simbolo de ${escapeHtml(card.setLabel)}" />`
      : `<span class="explorer-set-mark explorer-set-fallback" aria-hidden="true">${escapeHtml((card.setCode || 'SET').slice(0, 3))}</span>`;
  return `<button class="collection-entry ${card.owned ? 'is-owned' : ''}" type="button" aria-pressed="${card.owned ? 'true' : 'false'}" data-toggle-collection-card="${escapeHtml(collectionId)}" data-card-id="${escapeHtml(card.id)}"><div class="collection-entry-art">${buildLazyImage(card.imageSmall, `Carta de ${card.name}`, 'card-art lazy-image')}</div><div class="collection-entry-body"><div class="explorer-card-head"><span class="card-number">#${escapeHtml(card.number)}</span>${setMark}</div><strong class="card-name">${escapeHtml(card.name)}</strong><p class="subtitle collection-entry-set">${escapeHtml(card.setLabel || card.setName || 'Set desconocido')}</p></div></button>`;
}
