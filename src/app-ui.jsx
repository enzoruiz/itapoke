import { memo, useEffect, useRef, useState } from 'react';
import { mountGoogleAuthButton, signOut } from './auth.js';
import { collectionPath, expansionPath } from './app-routing.js';
import { seriesAnchorId } from './app-data.js';

function SkeletonTile({ className = '', delay = 0 }) {
  return <div className={`app-skeleton ${className}`.trim()} style={{ '--skeleton-delay': `${delay}ms` }} aria-hidden="true" />;
}

function SkeletonLine({ className = '', delay = 0 }) {
  return <SkeletonTile className={`skeleton-line ${className}`.trim()} delay={delay} />;
}

function LibrarySkeleton() {
  return (
    <section className="series-block" aria-busy="true" aria-live="polite">
      <div className="series-head">
        <div className="skeleton-stack">
          <SkeletonLine className="skeleton-line-short" />
          <SkeletonLine className="skeleton-line-title" delay={90} />
        </div>
        <SkeletonTile className="skeleton-pill" delay={160} />
      </div>
      <div className="set-grid compact-grid">
        {Array.from({ length: 8 }, (_, index) => <SkeletonTile key={index} className="expansion-card expansion-card-skeleton" delay={index * 70} />)}
      </div>
    </section>
  );
}

function ExplorerSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="filter-summary skeleton-summary">
        <SkeletonLine className="skeleton-line-medium" />
        <SkeletonLine className="skeleton-line-short" delay={90} />
      </div>
      <ol className="card-list skeleton-card-list">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index} className="card-item">
            <div className="card-trigger explorer-card-trigger skeleton-card-shell" aria-hidden="true">
              <SkeletonTile className="card-art" delay={index * 70} />
              <div className="explorer-card-body skeleton-stack">
                <div className="explorer-card-head">
                  <SkeletonLine className="skeleton-line-short" delay={index * 70 + 60} />
                  <SkeletonTile className="explorer-set-mark skeleton-mark" delay={index * 70 + 120} />
                </div>
                <SkeletonLine className="skeleton-line-medium" delay={index * 70 + 180} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ExpansionSkeleton({ currentSet }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <article className="detail-loader">
        <div className="detail-loader-orbit">
          <span className="detail-loader-ring detail-loader-ring-outer" aria-hidden="true" />
          <span className="detail-loader-ring detail-loader-ring-inner" aria-hidden="true" />
          <div className="detail-loader-core">
            {currentSet.logo
              ? <img className="detail-loader-logo" src={currentSet.logo} alt="" />
              : currentSet.symbol
                ? <img className="detail-loader-logo detail-loader-symbol" src={currentSet.symbol} alt="" />
                : <div className="detail-loader-placeholder">{currentSet.code.slice(0, 3)}</div>}
          </div>
        </div>
        <div className="detail-loader-copy">
          <p className="detail-loader-kicker">Cargando expansion</p>
          <strong>{currentSet.displayName}</strong>
          <span>Estamos trayendo las cartas de este set para mostrar su galeria completa.</span>
        </div>
      </article>
      <ol className="detail-skeleton-grid">
        {Array.from({ length: 10 }, (_, index) => <li key={index} className="detail-skeleton-card" style={{ '--skeleton-delay': `${index * 80}ms` }} aria-hidden="true" />)}
      </ol>
    </div>
  );
}

function CollectionsSkeleton() {
  return (
    <div className="collections-grid" aria-busy="true" aria-live="polite">
      {Array.from({ length: 3 }, (_, index) => (
        <article key={index} className="collection-card collection-card-skeleton" aria-hidden="true">
          <div className="collection-card-main skeleton-stack">
            <SkeletonLine className="skeleton-line-short" delay={index * 80} />
            <SkeletonLine className="skeleton-line-title" delay={index * 80 + 70} />
            <SkeletonLine className="skeleton-line-medium" delay={index * 80 + 140} />
          </div>
          <div className="collection-metrics">
            <SkeletonTile className="skeleton-pill" delay={index * 80 + 210} />
            <SkeletonTile className="skeleton-pill" delay={index * 80 + 260} />
            <SkeletonTile className="skeleton-pill" delay={index * 80 + 310} />
          </div>
          <div className="collection-card-actions">
            <SkeletonTile className="action-btn skeleton-button" delay={index * 80 + 360} />
            <SkeletonTile className="action-btn skeleton-button" delay={index * 80 + 420} />
          </div>
        </article>
      ))}
    </div>
  );
}

function CollectionDetailSkeleton() {
  return (
    <div className="collection-card-list" aria-busy="true" aria-live="polite">
      {Array.from({ length: 4 }, (_, index) => (
        <article key={index} className="collection-entry collection-entry-skeleton" aria-hidden="true">
          <div className="collection-entry-toggle">
            <div className="collection-entry-art">
              <SkeletonTile className="card-art" delay={index * 80} />
            </div>
            <div className="collection-entry-body skeleton-stack">
              <SkeletonLine className="skeleton-line-short" delay={index * 80 + 70} />
              <SkeletonLine className="skeleton-line-title" delay={index * 80 + 140} />
              <SkeletonLine className="skeleton-line-medium" delay={index * 80 + 210} />
            </div>
          </div>
          <div className="collection-entry-footer">
            <SkeletonTile className="action-btn skeleton-button" delay={index * 80 + 280} />
          </div>
        </article>
      ))}
    </div>
  );
}

export const ELEMENT_OPTIONS = [
  { value: '', label: 'Cualquier elemento' },
  { value: 'Grass', label: 'Planta' },
  { value: 'Fire', label: 'Fuego' },
  { value: 'Water', label: 'Agua' },
  { value: 'Lightning', label: 'Rayo' },
  { value: 'Psychic', label: 'Psiquico' },
  { value: 'Fighting', label: 'Lucha' },
  { value: 'Darkness', label: 'Oscuridad' },
  { value: 'Metal', label: 'Metal' },
  { value: 'Dragon', label: 'Dragon' },
  { value: 'Colorless', label: 'Incoloro' },
  { value: 'Fairy', label: 'Hada' }
];

export const CARD_KIND_OPTIONS = [
  { value: '', label: 'Cualquiera' },
  { value: 'Pokemon', label: 'Pokemon' },
  { value: 'Trainer', label: 'Entrenador' },
  { value: 'Energy', label: 'Energia' }
];

export function GoogleButtonMount({ user, label = 'Iniciar con Google' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || user) return;
    mountGoogleAuthButton(ref.current, label);
  }, [label, user]);

  return <div ref={ref} />;
}

export function Modal({ open, children, onBackdropClick }) {
  if (!open) return null;
  return (
    <div className="modal" onClick={onBackdropClick}>
      <div className="modal-frame">{children}</div>
    </div>
  );
}

export function PromptModal({ open, kicker, title, copy, confirmLabel, cancelLabel = 'Cancelar', danger = false, children, onClose, onConfirm, modalId = '', closeButtonId = '', confirmButtonId = '' }) {
  if (!open) return null;
  return (
    <div className="modal" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal-frame prompt-modal-frame">
        <article className="modal-card prompt-modal-card" id={modalId || undefined}>
          <div className="prompt-form collection-delete-prompt">
            <div className="modal-top">
              <div>
                <span className={`hud-tag ${danger ? 'hud-tag-rose' : 'hud-tag-warm'}`}><span className="hud-tag-dot" aria-hidden="true" />{kicker}</span>
                <h2>{title}</h2>
              </div>
              <button className="modal-close" id={closeButtonId || undefined} type="button" onClick={onClose}>Cerrar</button>
            </div>
            <p className="subtitle prompt-copy">{copy}</p>
            {children}
            <div className="prompt-actions">
              <button className="action-btn" type="button" onClick={onClose}>{cancelLabel}</button>
              <button className={`action-btn ${danger ? 'danger' : 'accent'}`} id={confirmButtonId || undefined} type="button" onClick={onConfirm}>{confirmLabel}</button>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

function SetMark({ logo, symbol, label, code }) {
  if (logo) return <img className="explorer-set-mark" src={logo} alt={`Logo de ${label}`} />;
  if (symbol) return <img className="explorer-set-mark explorer-set-symbol" src={symbol} alt={`Simbolo de ${label}`} />;
  return <span className="explorer-set-mark explorer-set-fallback" aria-hidden="true">{(code || label || 'SET').slice(0, 3)}</span>;
}

export function SetArtwork({ set, className = 'expansion-logo' }) {
  if (set.logo) return <img className={className} src={set.logo} alt={`Logo de ${set.displayName}`} loading="lazy" decoding="async" />;
  if (set.symbol) return <img className={`${className} expansion-symbol`} src={set.symbol} alt={`Simbolo de ${set.displayName}`} loading="lazy" decoding="async" />;
  return <div className={`${className} expansion-logo-placeholder`} aria-hidden="true">{set.code.slice(0, 3)}</div>;
}

function ExplorerCard({ card, onOpen, eager = false, onHover }) {
  return (
    <li className="card-item">
      <button className="card-trigger explorer-card-trigger" type="button" onClick={() => onOpen(card.setId, card.id)} onPointerEnter={() => onHover(card.setId, card.id)}>
        {card.imageSmall ? <img className="card-art lazy-image" src={card.imageSmall} alt={`Carta de ${card.name}`} loading={eager ? 'eager' : 'lazy'} decoding="async" fetchPriority={eager ? 'high' : 'low'} /> : <div className="card-art-placeholder" aria-hidden="true" />}
        <div className="card-body explorer-card-body">
          <div className="explorer-card-head">
            <span className="card-number">#{card.number}</span>
            <SetMark logo={card.setLogo} symbol={card.setSymbol} label={card.setLabel} code={card.setCode} />
          </div>
          <span className="card-name">{card.name}</span>
        </div>
      </button>
    </li>
  );
}

function PosterCard({ card, setId, onOpen, eager = false, onHover }) {
  return (
    <li className="poster-item">
      <button className="card-poster" type="button" onClick={() => onOpen(setId, card.id)} onPointerEnter={() => onHover(setId, card.id)}>
        {card.imageSmall ? <img className="poster-art lazy-image" src={card.imageSmall} alt={`Carta de ${card.name}`} loading={eager ? 'eager' : 'lazy'} decoding="async" fetchPriority={eager ? 'high' : 'low'} /> : <div className="card-art-placeholder" aria-hidden="true" />}
        <span className="sr-only">{card.name}</span>
      </button>
    </li>
  );
}

function CollectionEntry({ collectionId, card, onToggleOwned, onRemove }) {
  return (
    <article className={`collection-entry ${card.owned ? 'is-owned' : ''}`}>
      <button className="collection-entry-toggle" type="button" aria-pressed={card.owned} onClick={() => onToggleOwned(collectionId, card.id)}>
        <div className="collection-entry-art">
          {card.imageSmall ? <img className="card-art lazy-image" src={card.imageSmall} alt={`Carta de ${card.name}`} loading="lazy" decoding="async" /> : <div className="card-art-placeholder" aria-hidden="true" />}
        </div>
        <div className="collection-entry-body">
          <div className="explorer-card-head">
            <span className="card-number">#{card.number}</span>
            <SetMark logo={card.setLogo} symbol={card.setSymbol} label={card.setLabel} code={card.setCode} />
          </div>
          <strong className="card-name">{card.name}</strong>
          <p className="subtitle collection-entry-set">{card.setLabel || card.setName || 'Set desconocido'}</p>
        </div>
      </button>
      <div className="collection-entry-footer">
        <button className="action-btn danger collection-entry-remove" type="button" onClick={() => onRemove(collectionId, card.id)}>Quitar carta</button>
      </div>
    </article>
  );
}

function ProgressMeter({ value, total, label = 'Progreso' }) {
  const safeTotal = Math.max(Number(total) || 0, 0);
  const safeValue = Math.min(Math.max(Number(value) || 0, 0), safeTotal || Number(value) || 0);
  const percent = safeTotal ? Math.round((safeValue / safeTotal) * 100) : 0;

  return (
    <div className="progress-meter" aria-label={`${label}: ${percent}%`}>
      <div className="progress-meter-top">
        <strong>{label}</strong>
        <span>{`${percent}%`}</span>
      </div>
      <div className="progress-meter-track" aria-hidden="true">
        <span className="progress-meter-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-meter-caption">{`${safeValue.toLocaleString()} de ${safeTotal.toLocaleString()} cartas`}</div>
    </div>
  );
}

const MemoExplorerCard = memo(ExplorerCard);
const MemoPosterCard = memo(PosterCard);
const MemoCollectionEntry = memo(CollectionEntry);

export const AuthBar = memo(function AuthBar({ user }) {
  return (
    <section className={`auth-bar ${user ? 'auth-bar-user' : 'auth-bar-guest'}`}>
      <div className="auth-copy">
        {user ? (
          <>
            {user.picture
              ? <img className="auth-avatar" src={user.picture} alt={`Avatar de ${user.name || user.email || 'Usuario'}`} referrerPolicy="no-referrer" />
              : <span className="auth-avatar auth-avatar-fallback" aria-hidden="true">{(user.name || user.email || 'U').trim().charAt(0).toUpperCase()}</span>}
            <strong className="auth-name">{user.name || user.email || 'Usuario'}</strong>
          </>
        ) : 'Inicia sesion con Google'}
      </div>
      <div className="auth-controls">
        {user ? (
          <button className="auth-logout-btn" type="button" aria-label="Cerrar sesion" title="Cerrar sesion" onClick={() => void signOut()}>
            <span className="auth-logout-glyph" aria-hidden="true">x</span>
          </button>
        ) : <GoogleButtonMount user={user} />}
      </div>
    </section>
  );
});

export const LandingScreen = memo(function LandingScreen({ homeMode, homeCaption, navigateTo }) {
  return (
    <section className="landing-shell">
      <section className="landing-hero" aria-labelledby="landing-hero-title">
        <div className="landing-hero-content">
          <span className="landing-hero-badge">
            <span className="landing-hero-badge-dot" aria-hidden="true" />
            Entrenador en linea
          </span>
          <h1 id="landing-hero-title" className="landing-hero-title">
            Atrapalas. Coleccionalas. <span className="landing-hero-title-accent">Dominalas.</span>
          </h1>
          <p className="landing-hero-lead">
            Tu centro de mando para el Pokemon TCG: rastrea cartas raras, arma tu Pokedex personal y mide tu progreso como un coleccionista competitivo.
          </p>
          <div className="landing-hero-actions">
            <button className="action-btn primary landing-hero-cta" type="button" onClick={() => navigateTo('/explorer')}>
              Iniciar caza
            </button>
            <button className="action-btn landing-hero-cta-ghost" type="button" onClick={() => navigateTo('/library')}>
              Ver expansiones
            </button>
          </div>
          <dl className="landing-hero-stats" aria-label="Archivo disponible">
            <div className="landing-hero-stat">
              <dt>Expansiones</dt>
              <dd>150+</dd>
            </div>
            <div className="landing-hero-stat">
              <dt>Cartas</dt>
              <dd>18k</dd>
            </div>
            <div className="landing-hero-stat">
              <dt>Rarezas</dt>
              <dd>40+</dd>
            </div>
          </dl>
        </div>
        <div className="landing-hero-art" aria-hidden="true">
          <span className="landing-hero-ring landing-hero-ring-outer" />
          <span className="landing-hero-ring landing-hero-ring-inner" />
          <span className="landing-hero-pokeball">
            <span className="landing-hero-pokeball-top" />
            <span className="landing-hero-pokeball-belt" />
            <span className="landing-hero-pokeball-button" />
          </span>
          <span className="landing-hero-spark landing-hero-spark-1" />
          <span className="landing-hero-spark landing-hero-spark-2" />
          <span className="landing-hero-spark landing-hero-spark-3" />
          <span className="landing-hero-spark landing-hero-spark-4" />
        </div>
      </section>

      <section className="mode-shell landing-mode-shell">
        <div className="mode-shell-head">
          <div>
            <p className="eyebrow">Elige tu modo de juego</p>
            <h2>Tres rutas, un mismo objetivo: completar tu coleccion definitiva</h2>
          </div>
          <div className="mode-caption">{homeCaption}</div>
        </div>
        <div className="mode-grid mode-grid-hero" aria-label="Modos principales">
          <button className={`mode-card mode-card-hero mode-card-explorer ${homeMode === 'explorer' ? 'active' : ''}`} type="button" aria-pressed={homeMode === 'explorer'} onClick={() => navigateTo('/explorer')}>
            <span className="mode-card-tag">Modo Scout</span>
            <span className="mode-card-art mode-card-art-explorer" aria-hidden="true" />
            <strong>Explorador de cartas</strong>
            <span className="mode-card-copy">Rastrea cartas por nombre, artista, rareza o tipo con resultados instantaneos. Tu radar personal de cazador.</span>
            <span className="mode-card-chips">
              <span className="mode-card-chip">Filtros en vivo</span>
              <span className="mode-card-chip">Busqueda profunda</span>
            </span>
            <span className="mode-card-go">Iniciar busqueda <span aria-hidden="true">&rarr;</span></span>
          </button>
          <button className={`mode-card mode-card-hero mode-card-library ${homeMode === 'library' ? 'active' : ''}`} type="button" aria-pressed={homeMode === 'library'} onClick={() => navigateTo('/library')}>
            <span className="mode-card-tag">Modo Pokedex</span>
            <span className="mode-card-art mode-card-art-library" aria-hidden="true" />
            <strong>Biblioteca de expansiones</strong>
            <span className="mode-card-copy">Recorre cada serie como si hojearas tu album favorito y abre cualquier set para ver su galeria completa.</span>
            <span className="mode-card-chips">
              <span className="mode-card-chip">Series completas</span>
              <span className="mode-card-chip">Era por era</span>
            </span>
            <span className="mode-card-go">Explorar sets <span aria-hidden="true">&rarr;</span></span>
          </button>
          <button className={`mode-card mode-card-hero mode-card-collections ${homeMode === 'collections' ? 'active' : ''}`} type="button" aria-pressed={homeMode === 'collections'} onClick={() => navigateTo('/mis-colecciones')}>
            <span className="mode-card-tag">Modo Maestro</span>
            <span className="mode-card-art mode-card-art-collections" aria-hidden="true" />
            <strong>Mis colecciones</strong>
            <span className="mode-card-copy">Guarda tus filtros favoritos, marca cartas obtenidas y mira tu progreso escalar como un rank ladder.</span>
            <span className="mode-card-chips">
              <span className="mode-card-chip">Tracking rapido</span>
              <span className="mode-card-chip">Progreso %</span>
            </span>
            <span className="mode-card-go">Ver progreso <span aria-hidden="true">&rarr;</span></span>
          </button>
        </div>
      </section>

      <section className="landing-quests" aria-label="Retos del entrenador">
        <article className="landing-quest">
          <span className="landing-quest-rank">S</span>
          <div className="landing-quest-body">
            <p className="landing-quest-kicker">Reto diario</p>
            <strong>Caza una Illustration Rare</strong>
            <span>Usa el Modo Scout y filtra por rareza para encontrar una carta ilustrada nueva antes de cerrar sesion.</span>
          </div>
        </article>
        <article className="landing-quest">
          <span className="landing-quest-rank">A</span>
          <div className="landing-quest-body">
            <p className="landing-quest-kicker">Logro desbloqueable</p>
            <strong>Crea tu primera coleccion</strong>
            <span>Convierte una busqueda en coleccion personalizada y bautizala con tu nombre de entrenador.</span>
          </div>
        </article>
        <article className="landing-quest">
          <span className="landing-quest-rank">B</span>
          <div className="landing-quest-body">
            <p className="landing-quest-kicker">Ruta recomendada</p>
            <strong>Explora una era completa</strong>
            <span>Arranca en la biblioteca, escoge una serie y abre sus sets mas buscados por la comunidad.</span>
          </div>
        </article>
      </section>
    </section>
  );
});

export const ExplorerScreen = memo(function ExplorerScreen({
  navigateTo,
  explorerFilters,
  setExplorerFilters,
  expansionFilterOptions,
  handleRunExplorerSearch,
  user,
  explorerHasActiveFilters,
  explorerResult,
  handleCreateCollection,
  handleClearFilters,
  explorerStatus,
  isExplorerLoading,
  explorerCardsWithSet,
  schedulePrefetchLargeImage,
  openCardModal,
  buildExplorerQuery,
  explorerSort,
  setExplorerSort,
  explorerActiveFilterChips,
  handleRemoveExplorerFilter,
  handleApplyExplorerPreset,
  hasPendingExplorerChanges
}) {
  return (
    <section className="explorer" id="explorer-panel">
      <div className="explorer-head">
        <div>
          <span className="hud-tag hud-tag-warm"><span className="hud-tag-dot" aria-hidden="true" />Modo Scout</span>
          <h2>Activa tu radar de cazador y encuentra tu proxima carta favorita</h2>
          <p className="explorer-copy">Combina filtros para aterrizar rapido en una carta concreta o curiosear entre artistas, rarezas y expansiones con resultados al instante.</p>
        </div>
        <button className="action-btn" id="explorer-home" type="button" onClick={() => navigateTo('/')}>Volver al inicio</button>
      </div>

      <div className="explorer-toolbar">
        <div className="explorer-presets" aria-label="Presets de busqueda">
          <button className="action-btn" type="button" onClick={() => handleApplyExplorerPreset({ cardQuery: 'Pikachu' })}>Pikachu</button>
          <button className="action-btn" type="button" onClick={() => handleApplyExplorerPreset({ rarity: 'Illustration Rare' })}>Illustration Rare</button>
          <button className="action-btn" type="button" onClick={() => handleApplyExplorerPreset({ cardKind: 'Trainer' })}>Entrenadores</button>
          <button className="action-btn" type="button" onClick={() => handleApplyExplorerPreset({ element: 'Lightning', rarity: 'Rare' })}>Rayo competitivo</button>
        </div>
        <label className="explorer-sort-control">
          Ordenar resultados
          <select id="explorer-sort" value={explorerSort} onChange={(event) => setExplorerSort(event.target.value)}>
            <option value="set-desc">Sets mas nuevos</option>
            <option value="name-asc">Nombre A-Z</option>
            <option value="number-asc">Numero ascendente</option>
            <option value="rarity-asc">Rareza</option>
          </select>
        </label>
      </div>

      <div className="explorer-filters-card">
        <div className="explorer-grid">
        <label>Nombre o texto de carta<input id="card-query" type="search" placeholder="Charizard, Pikachu, Profesor..." value={explorerFilters.cardQuery} onChange={(event) => setExplorerFilters((current) => ({ ...current, cardQuery: event.target.value }))} /></label>
        <label>Expansion<select value={explorerFilters.expansion} onChange={(event) => setExplorerFilters((current) => ({ ...current, expansion: event.target.value }))}><option value="">Cualquier expansion</option>{expansionFilterOptions.map((set) => <option key={set.id} value={set.id}>{`${set.displayName} (${set.code})`}</option>)}</select></label>
        <label>Artista<input id="artist-filter" type="search" placeholder="Ken Sugimori, 5ban Graphics..." value={explorerFilters.artist} onChange={(event) => setExplorerFilters((current) => ({ ...current, artist: event.target.value }))} /></label>
        <label>Clase de carta<select id="kind-filter" value={explorerFilters.cardKind} onChange={(event) => setExplorerFilters((current) => ({ ...current, cardKind: event.target.value }))}>{CARD_KIND_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}</select></label>
        <label>Tipo elemental<select id="element-filter" value={explorerFilters.element} onChange={(event) => setExplorerFilters((current) => ({ ...current, element: event.target.value }))}>{ELEMENT_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}</select></label>
        <label>Rareza<input id="rarity-filter" type="search" placeholder="Rare Holo, Common, Illustration Rare..." value={explorerFilters.rarity} onChange={(event) => setExplorerFilters((current) => ({ ...current, rarity: event.target.value }))} /></label>
        </div>
      </div>

      <div className="explorer-actions explorer-actions-card">
        <button className="action-btn primary" type="button" onClick={handleRunExplorerSearch}>Buscar cartas</button>
        <button className="action-btn accent" id="create-collection" type="button" disabled={!user || !explorerHasActiveFilters || explorerResult.totalCount === 0 || hasPendingExplorerChanges} onClick={() => void handleCreateCollection()}>Crear Coleccion</button>
        <button className="action-btn" type="button" onClick={handleClearFilters}>Limpiar filtros</button>
        {hasPendingExplorerChanges ? <span className="explorer-pending-note">Tienes cambios pendientes. Pulsa "Buscar cartas" para aplicarlos.</span> : null}
      </div>

      {explorerActiveFilterChips.length ? (
        <div className="filter-chip-row" aria-label="Filtros activos">
          {explorerActiveFilterChips.map((chip) => (
            <button key={chip.key} className="filter-chip" type="button" onClick={() => handleRemoveExplorerFilter(chip.key)}>
              <span>{`${chip.label}: ${chip.value}`}</span>
              <span aria-hidden="true">x</span>
            </button>
          ))}
        </div>
      ) : null}

      {explorerStatus ? <div>{explorerStatus}</div> : null}
      <div id="explorer-results">
        {isExplorerLoading ? (
          <ExplorerSkeleton />
        ) : explorerHasActiveFilters && explorerResult.cards.length ? (
          <>
            <div className="filter-summary"><span>{explorerCardsWithSet.length.toLocaleString()} cartas en esta pagina</span><span>{explorerResult.totalCount.toLocaleString()} coincidencias totales</span><span>{explorerSort === 'set-desc' ? 'Orden: Sets mas nuevos' : explorerSort === 'name-asc' ? 'Orden: Nombre A-Z' : explorerSort === 'number-asc' ? 'Orden: Numero ascendente' : 'Orden: Rareza'}</span></div>
            <ol className="card-list">
              {explorerCardsWithSet.map((card, index) => <MemoExplorerCard key={card.id} card={card} eager={index < 12} onHover={schedulePrefetchLargeImage} onOpen={(setId, cardId) => openCardModal(setId, cardId, 'explorer')} />)}
            </ol>
          </>
        ) : <div className="empty">{explorerHasActiveFilters ? 'No hay cartas que coincidan con los filtros actuales en esta pagina.' : 'Todavia no hiciste una busqueda en vivo.'}</div>}
      </div>
      {explorerHasActiveFilters && (
        <div className="pager">
          <div id="explorer-page-label">{`Pagina ${explorerResult.page.toLocaleString()} de ${explorerResult.pageCount.toLocaleString()}`}</div>
          <div className="view-toggle">
            <button className="action-btn" id="explorer-prev" type="button" disabled={explorerResult.page <= 1} onClick={() => navigateTo('/explorer', { query: buildExplorerQuery(explorerFilters, explorerResult.page - 1, explorerSort) })}>Anterior</button>
            <button className="action-btn" id="explorer-next" type="button" disabled={explorerResult.page >= explorerResult.pageCount} onClick={() => navigateTo('/explorer', { query: buildExplorerQuery(explorerFilters, explorerResult.page + 1, explorerSort) })}>Siguiente</button>
          </div>
        </div>
      )}
    </section>
  );
});

export const LibraryScreen = memo(function LibraryScreen({ setsStatus, navigateTo, seriesEntries, filteredSeriesEntries, seriesPage, setSeriesPage, currentSeriesEntry, seriesQuery, setSeriesQuery }) {
  return (
    <section className="library-shell" id="library-shell">
      <div className="library-head">
        <div>
          <span className="hud-tag hud-tag-cool"><span className="hud-tag-dot" aria-hidden="true" />Modo Pokedex</span>
          <h2>Recorre las eras, detecta tus sets favoritos y abre cada expansion con un toque</h2>
          <p className="explorer-copy">La biblioteca es tu mapa visual: cada pagina te muestra una serie completa y cada logo te lleva al detalle del set para seguir explorando cartas.</p>
        </div>
        <div className="library-head-actions">
          <div id="status">{setsStatus}</div>
          <button className="action-btn" id="library-home" type="button" onClick={() => navigateTo('/')}>Volver al inicio</button>
        </div>
      </div>
        <div className="library-tools">
          <label className="library-search-control">
            Buscar serie o set
            <input id="library-search" type="search" placeholder="Scarlet and Violet, Celebrations, Sword and Shield..." value={seriesQuery} onChange={(event) => setSeriesQuery(event.target.value)} />
          </label>
          <div className="library-jump-list" aria-label="Saltos rapidos por serie">
            {filteredSeriesEntries.slice(0, 10).map(([seriesName], index) => (
              <button key={seriesName} className={`action-btn ${currentSeriesEntry?.[0] === seriesName ? 'active' : ''}`} type="button" onClick={() => setSeriesPage(index + 1)}>{seriesName}</button>
            ))}
          </div>
        </div>
        <div className="series-pager" hidden={filteredSeriesEntries.length <= 1}>
          <button className="action-btn" type="button" disabled={seriesPage <= 1} onClick={() => setSeriesPage((page) => Math.max(1, page - 1))}>Serie anterior</button>
          <div className="series-page-label">{`Serie ${Math.min(seriesPage, Math.max(filteredSeriesEntries.length, 1)).toLocaleString()} de ${Math.max(filteredSeriesEntries.length, 1).toLocaleString()}`}</div>
          <button className="action-btn" type="button" disabled={seriesPage >= filteredSeriesEntries.length} onClick={() => setSeriesPage((page) => Math.min(filteredSeriesEntries.length, page + 1))}>Serie siguiente</button>
        </div>
      <section aria-live="polite">
        {currentSeriesEntry ? (() => {
          const [seriesName, groupSets] = currentSeriesEntry;
          return (
            <section className="series-block" id={seriesAnchorId(seriesName)}>
              <div className="series-head">
                <div>
                  <p className="series-kicker">Serie</p>
                  <h2>{seriesName}</h2>
                </div>
                <div className="series-count">{`${groupSets.length.toLocaleString()} set${groupSets.length === 1 ? '' : 's'}`}</div>
              </div>
              <div className="set-grid compact-grid">
                {groupSets.map((set) => (
                  <button key={set.id} className="expansion-card" type="button" aria-label={`Abrir ${set.displayName}`} onClick={() => navigateTo(expansionPath(set))}>
                    <SetArtwork set={set} />
                    <span className="sr-only">{set.displayName}</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })() : filteredSeriesEntries.length ? <div className="empty">No hay una serie disponible para esta pagina.</div> : seriesEntries.length ? <div className="empty">No encontramos series o sets con esa busqueda.</div> : setsStatus.includes('No se pudieron cargar') ? <div className="error">{setsStatus}</div> : <LibrarySkeleton />}
      </section>
    </section>
  );
});

export const ExpansionScreen = memo(function ExpansionScreen({
  navigateTo,
  user,
  filteredDetailCards,
  handleCreateCollectionFromDetail,
  currentSet,
  activeSetCards,
  detailQuery,
  setDetailQuery,
  startUiTransition,
  detailKind,
  setDetailKind,
  detailSort,
  setDetailSort,
  loadingSetId,
  isPending,
  schedulePrefetchLargeImage,
  openCardModal
}) {
  return (
    <section className="expansion-detail" id="expansion-detail">
      <div className="detail-nav">
        <button className="action-btn" type="button" onClick={() => navigateTo('/library')}>Volver a expansiones</button>
        <button className="action-btn accent" id="detail-create-collection" type="button" disabled={!user || !filteredDetailCards.length} onClick={() => void handleCreateCollectionFromDetail()}>Crear Coleccion</button>
      </div>

      <article className="detail-hero detail-region-ready" id="expansion-summary">
        <div className="detail-hero-main">
          <div className="detail-logo-wrap">
            <SetArtwork set={currentSet} className="detail-logo" />
          </div>
          <div>
            <span className="hud-tag hud-tag-cool"><span className="hud-tag-dot" aria-hidden="true" />{currentSet.series}</span>
            <h2>{currentSet.displayName}</h2>
            <p className="subtitle">{`Expansion ${currentSet.category} dentro de la serie ${currentSet.series}. Abre la galeria completa y cazala carta por carta.`}</p>
          </div>
        </div>
        <div className="detail-facts">
          <article className="detail-fact"><span>Serie</span><strong>{currentSet.series}</strong></article>
          <article className="detail-fact"><span>Lanzamiento</span><strong>{currentSet.releaseDate}</strong></article>
          <article className="detail-fact"><span>Impresas</span><strong>{String(currentSet.printedTotal)}</strong></article>
          <article className="detail-fact"><span>Total</span><strong>{String(currentSet.total)}</strong></article>
          <article className="detail-fact"><span>Codigo</span><strong>{currentSet.code}</strong></article>
          <article className="detail-fact"><span>Cartas cargadas</span><strong>{activeSetCards.length.toLocaleString()}</strong></article>
        </div>
      </article>

      <div className="detail-filters">
        <label>Buscar cartas<input id="detail-search" type="search" placeholder="Charizard, Pikachu, Rare, Entrenador..." value={detailQuery} onChange={(event) => startUiTransition(() => setDetailQuery(event.target.value))} /></label>
        <label>Clase de carta<select id="detail-kind-filter" value={detailKind} onChange={(event) => setDetailKind(event.target.value)}>{CARD_KIND_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}</select></label>
        <label>Ordenar cartas<select id="detail-sort-filter" value={detailSort} onChange={(event) => setDetailSort(event.target.value)}><option value="number-asc">Numero ascendente</option><option value="number-desc">Numero descendente</option><option value="name-asc">Nombre A-Z</option></select></label>
      </div>

      <div className="detail-status">
        {loadingSetId === currentSet.id && !activeSetCards.length
          ? 'Cargando cartas para esta expansion...'
          : filteredDetailCards.length
            ? `Mostrando ${filteredDetailCards.length.toLocaleString()} de ${activeSetCards.length.toLocaleString()} cartas. Haz clic en cualquier carta para abrir su detalle.`
            : activeSetCards.length
              ? 'Ninguna carta coincide con los filtros actuales.'
              : 'No se pudieron cargar las cartas de esta expansion.'}
        {isPending ? ' Actualizando vista...' : ''}
      </div>

      <div>
        {loadingSetId === currentSet.id && !activeSetCards.length ? (
          <ExpansionSkeleton currentSet={currentSet} />
        ) : filteredDetailCards.length ? (
          <ol className="poster-grid detail-region-ready" id="expansion-cards">
            {filteredDetailCards.map((card, index) => <MemoPosterCard key={card.id} card={card} setId={currentSet.id} eager={index < 12} onHover={schedulePrefetchLargeImage} onOpen={(setId, cardId) => openCardModal(setId, cardId, 'expansion')} />)}
          </ol>
        ) : <div className="empty">Prueba otro nombre, tipo o criterio de orden.</div>}
      </div>
    </section>
  );
});

export const CollectionsScreen = memo(function CollectionsScreen({ user, collectionsStatus, isCollectionsLoading, navigateTo, collectionsWithMetrics, handleDeleteCollection, openMissingView }) {
  return (
    <section className="collections-shell" id="collections-shell">
      <div className="library-head collections-head">
        <div>
          <span className="hud-tag hud-tag-rose"><span className="hud-tag-dot" aria-hidden="true" />Modo Maestro</span>
          <h2>Tu archivo personal para seguir que cartas tienes y cuales aun buscas</h2>
          <p className="explorer-copy">Cada coleccion nace desde un filtro del explorador y queda guardada para revisar progreso, faltantes y duplicados de interes.</p>
        </div>
        <div className="library-head-actions">
          <div id="collections-status">{collectionsStatus}</div>
          <button className="action-btn" type="button" onClick={() => navigateTo('/')}>Volver al inicio</button>
        </div>
      </div>
      <div id="collections-list">
        {!user ? (
          <div className="empty auth-gate"><strong>Mis Colecciones es personal por usuario.</strong><span>Conectate con Google para guardar tu progreso y separar tus listas del resto.</span><GoogleButtonMount user={user} label="Acceder con Google" /></div>
        ) : isCollectionsLoading ? (
          <CollectionsSkeleton />
        ) : collectionsWithMetrics.length ? (
            <div className="collections-grid">
            {collectionsWithMetrics.map(({ collection, ownedCount, missingCount, filterBits, cardsCount, completionPercent }) => (
              <article key={collection.id} className="collection-card">
                <div className="collection-card-main">
                  <span className="hud-tag hud-tag-warm"><span className="hud-tag-dot" aria-hidden="true" />Coleccion guardada</span>
                  <h3>{collection.name}</h3>
                  <p className="subtitle">{filterBits.length ? filterBits.join(' - ') : 'Coleccion creada desde una busqueda filtrada del explorador.'}</p>
                </div>
                <ProgressMeter value={ownedCount} total={cardsCount} label="Completado" />
                <div className="collection-metrics"><span>{`${cardsCount.toLocaleString()} cartas`}</span><span>{`${ownedCount.toLocaleString()} tengo`}</span><span>{`${missingCount.toLocaleString()} me faltan`}</span></div>
                <div className="collection-cta-row"><span className="collection-cta-copy">{completionPercent >= 100 ? 'Coleccion completa.' : `Tu siguiente objetivo: ${missingCount.toLocaleString()} faltantes.`}</span>{missingCount > 0 ? <button className="action-btn" type="button" onClick={() => openMissingView(collection.id)}>Ver faltantes</button> : null}</div>
                <div className="collection-card-actions">
                  <button className="action-btn primary" type="button" onClick={() => navigateTo(collectionPath(collection.id))}>Ver detalle</button>
                  <button className="action-btn danger" type="button" onClick={() => void handleDeleteCollection(collection.id)}>Eliminar coleccion</button>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="empty">Todavia no guardaste colecciones desde el explorador.</div>}
      </div>
    </section>
  );
});

export const CollectionDetailScreen = memo(function CollectionDetailScreen({
  activeCollection,
  navigateTo,
  isCollectionsLoading,
  handleRenameCollection,
  handleDeleteCollection,
  topCollectionTotals,
  activeCollectionFilterBits,
  collectionOwnershipFilter,
  setCollectionOwnershipFilter,
  visibleCollectionCards,
  handleRemoveCollectionCard,
  handleToggleCollectionCard,
  showMissingOnly
}) {
  return (
    <section className="collection-detail">
      <div className="detail-nav collection-detail-nav">
        <button className="action-btn" id="collection-back" type="button" onClick={() => navigateTo('/mis-colecciones')}>Volver a Mis Colecciones</button>
        <div className="collection-detail-actions">
          <button className="action-btn" id="collection-rename" type="button" onClick={() => void handleRenameCollection()}>Renombrar</button>
          <button className="action-btn danger" id="collection-delete" type="button" onClick={() => void handleDeleteCollection(activeCollection.id, true)}>Eliminar coleccion</button>
        </div>
      </div>

      <article className="detail-hero collection-hero" id="collection-summary">
        <div className="detail-hero-main">
          <div>
            <span className="hud-tag hud-tag-rose"><span className="hud-tag-dot" aria-hidden="true" />Coleccion personal</span>
            <h2>{activeCollection.name}</h2>
            <p className="subtitle">Listado guardado desde el explorador para seguir tus cartas obtenidas y las que aun buscas.</p>
          </div>
        </div>
        <div className="detail-facts">
          <article className="detail-fact"><span>Cartas</span><strong>{topCollectionTotals.total.toLocaleString()}</strong></article>
          <article className="detail-fact"><span>Tengo</span><strong>{topCollectionTotals.ownedCount.toLocaleString()}</strong></article>
          <article className="detail-fact"><span>Me faltan</span><strong>{topCollectionTotals.missingCount.toLocaleString()}</strong></article>
          <article className="detail-fact"><span>Coincidencias</span><strong>{Number(activeCollection.totalCount || topCollectionTotals.total).toLocaleString()}</strong></article>
        </div>
        <ProgressMeter value={topCollectionTotals.ownedCount} total={topCollectionTotals.total} label="Progreso de la coleccion" />
        {activeCollectionFilterBits.length > 0 && (
          <div className="collection-filter-chips">
            {activeCollectionFilterBits.map(([key, value]) => <span key={key}>{`${key}: ${value}`}</span>)}
          </div>
        )}
        {topCollectionTotals.missingCount > 0 ? <div className="collection-focus-banner">{showMissingOnly ? 'Estas viendo solo tus faltantes.' : `Te faltan ${topCollectionTotals.missingCount.toLocaleString()} cartas para completar esta coleccion.`}</div> : null}
      </article>

      <div className="collection-ownership-filters">
        <button className={`action-btn ${collectionOwnershipFilter === 'all' ? 'active' : ''}`} id="collection-filter-all" type="button" aria-pressed={collectionOwnershipFilter === 'all'} onClick={() => setCollectionOwnershipFilter('all')}>Todas</button>
        <button className={`action-btn ${collectionOwnershipFilter === 'owned' ? 'active' : ''}`} id="collection-filter-owned" type="button" aria-pressed={collectionOwnershipFilter === 'owned'} onClick={() => setCollectionOwnershipFilter('owned')}>Las tengo</button>
        <button className={`action-btn ${collectionOwnershipFilter === 'missing' ? 'active' : ''}`} id="collection-filter-missing" type="button" aria-pressed={collectionOwnershipFilter === 'missing'} onClick={() => setCollectionOwnershipFilter('missing')}>No las tengo</button>
      </div>

      <div className="detail-status">
        {topCollectionTotals.total
          ? `Mostrando ${visibleCollectionCards.length.toLocaleString()} de ${topCollectionTotals.total.toLocaleString()} cartas. Ya marcaste ${topCollectionTotals.ownedCount.toLocaleString()} como obtenidas.`
          : 'Esta coleccion no tiene cartas guardadas.'}
      </div>

      <div>
        {isCollectionsLoading ? (
          <CollectionDetailSkeleton />
        ) : visibleCollectionCards.length ? (
          <div className="collection-card-list" id="collection-cards">
            {visibleCollectionCards.map((card) => <MemoCollectionEntry key={card.id} collectionId={activeCollection.id} card={card} onRemove={handleRemoveCollectionCard} onToggleOwned={handleToggleCollectionCard} />)}
          </div>
        ) : <div className="empty">No hay cartas que coincidan con este filtro dentro de la coleccion.</div>}
      </div>
    </section>
  );
});

export const NotFoundScreen = memo(function NotFoundScreen({ navigateTo }) {
  return (
    <section className="mode-shell not-found-shell" id="not-found-shell">
      <div className="not-found-copy">
        <span className="hud-tag hud-tag-rose"><span className="hud-tag-dot" aria-hidden="true" />Ruta 404</span>
        <h2>Esta ruta no existe dentro del archivo Pokemon TCG</h2>
        <p className="subtitle">Puede que el enlace este incompleto, sea antiguo o que la expansion ya no coincida con una ruta valida.</p>
        <div className="hero-actions">
          <button className="action-btn primary" type="button" onClick={() => navigateTo('/')}>Volver al inicio</button>
          <button className="action-btn" type="button" onClick={() => navigateTo('/library')}>Ir a expansiones</button>
        </div>
      </div>
    </section>
  );
});

export const CardModal = memo(function CardModal({
  modalCard,
  closeModal,
  modalImageButtonRef,
  toggleZoom,
  updateZoomOrigin,
  handleZoomWheel,
  modalImageRef,
  currentSet,
  modalCollectionSelection,
  setModalCollectionSelection,
  user,
  modalCollectionsLoading,
  collections,
  modalSelectedCollection,
  modalCardAlreadyAdded,
  handleAddModalCardToCollection,
  modalCollectionSubmitLabel,
  modalCollectionStatus,
  modalCardCollections,
  modalPrevCard,
  modalNextCard,
  openSiblingCard
}) {
  const modalSet = modalCard
    ? (currentSet || {
        displayName: modalCard.setName || 'Set desconocido',
        code: modalCard.setCode || '',
        logo: modalCard.setLogo || '',
        symbol: modalCard.setSymbol || ''
      })
    : null;
  const modalCollectionsCount = modalCardCollections.length;

  return (
    <Modal open={Boolean(modalCard)} onBackdropClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
      {modalCard && (
        <article className="modal-card" id="card-modal">
          <div className="modal-top">
            <div>
              <span className="hud-tag hud-tag-warm"><span className="hud-tag-dot" aria-hidden="true" />Detalle de carta</span>
              <h2>{modalCard.name}</h2>
            </div>
            <button className="modal-close" id="modal-close" type="button" onClick={closeModal}>Cerrar</button>
          </div>
          <div className="modal-grid">
            <div className="modal-image-wrap">
              <button ref={modalImageButtonRef} className="modal-image-button" type="button" aria-label="Acercar carta" onClick={toggleZoom} onPointerMove={updateZoomOrigin} onWheel={handleZoomWheel}>
                <img ref={modalImageRef} className="modal-image" src={modalCard.imageLarge || modalCard.imageSmall} alt={`Imagen completa de ${modalCard.name}`} />
              </button>
              {(modalPrevCard || modalNextCard) ? (
                <div className="modal-nav-row">
                  <button className="action-btn" type="button" disabled={!modalPrevCard} onClick={() => modalPrevCard && openSiblingCard(modalPrevCard)}>Anterior</button>
                  <button className="action-btn" type="button" disabled={!modalNextCard} onClick={() => modalNextCard && openSiblingCard(modalNextCard)}>Siguiente</button>
                </div>
              ) : null}
            </div>
            <div>
              <div className="modal-meta" id="modal-meta">
                <div className="modal-set-panel modal-panel-feature"><strong>Expansion</strong><div className="modal-set-panel-body">{modalSet ? <SetArtwork set={modalSet} className="modal-set-image" /> : null}</div></div>
                <div className="modal-fact"><strong>Artista</strong><span>{modalCard.artist || 'Artista no disponible'}</span></div>
              </div>
              {modalCollectionsCount ? <div className="collection-filter-chips modal-ownership-chips">{modalCardCollections.map((collection) => <span key={collection.id}>{collection.name}</span>)}</div> : <div className="modal-ownership-panel"><span>Aun no esta guardada en ninguna coleccion.</span></div>}
              <div className="modal-links" id="modal-links">
                {(modalCard.imageLarge || modalCard.imageSmall) && <a href={modalCard.imageLarge || modalCard.imageSmall} target="_blank" rel="noreferrer">Abrir imagen completa</a>}
                {modalCard.tcgplayerUrl && <a className="secondary" href={modalCard.tcgplayerUrl} target="_blank" rel="noreferrer">Ver en TCGplayer</a>}
                {modalCard.cardmarketUrl && <a className="secondary" href={modalCard.cardmarketUrl} target="_blank" rel="noreferrer">Ver en Cardmarket</a>}
              </div>
              <div className="modal-collection-tools">
                <label htmlFor="modal-collection-select">
                  Agregar a una coleccion
                  <select id="modal-collection-select" value={modalCollectionSelection} disabled={!user || modalCollectionsLoading || !collections.length} onChange={(event) => setModalCollectionSelection(event.target.value)}>
                    {!collections.length ? <option value="">No tienes colecciones</option> : collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
                  </select>
                </label>
                <button className="action-btn accent" id="modal-collection-submit" type="button" disabled={!user || !modalSelectedCollection || modalCardAlreadyAdded || modalCollectionsLoading} onClick={() => void handleAddModalCardToCollection()}>{modalCollectionSubmitLabel}</button>
                <p className="subtitle modal-collection-status" id="modal-collection-status">{modalCollectionStatus || (!user ? 'Inicia sesion para guardar esta carta en una coleccion existente.' : modalCardAlreadyAdded ? `La carta ya esta en "${modalSelectedCollection?.name}".` : modalSelectedCollection ? `Coleccion seleccionada: "${modalSelectedCollection.name}".` : 'Selecciona una coleccion para guardar esta carta.')}</p>
              </div>
            </div>
          </div>
        </article>
      )}
    </Modal>
  );
});

export function NamePromptModal({ prompt, onResolve }) {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    setValue(prompt?.defaultValue || '');
    setIsSubmitting(false);
    setSubmitError('');
  }, [prompt]);

  if (!prompt) return null;

  return (
    <div className="modal" onClick={(event) => { if (event.target === event.currentTarget) onResolve(null); }}>
      <div className="modal-frame prompt-modal-frame">
        <article className="modal-card prompt-modal-card" id="collection-name-modal">
          <form className="prompt-form" onSubmit={async (event) => {
            event.preventDefault();
            setSubmitError('');
            setIsSubmitting(true);
            try {
              await onResolve(value.trim());
            } catch {
              setSubmitError('No se pudo completar la accion. Revisa tu conexion y vuelve a intentar.');
              setIsSubmitting(false);
            }
          }}>
            <div className="modal-top">
              <div>
                <span className="hud-tag hud-tag-warm"><span className="hud-tag-dot" aria-hidden="true" />{prompt.kicker}</span>
                <h2>{prompt.title}</h2>
              </div>
              <button className="modal-close" type="button" onClick={() => onResolve(null)}>Cerrar</button>
            </div>
            <p className="subtitle prompt-copy">{prompt.copy}</p>
            <label>
              Nombre de la coleccion
              <input id="collection-name-input" name="collectionName" type="text" maxLength="80" placeholder="Mis favoritas de Scarlet and Violet" value={value} onChange={(event) => setValue(event.target.value)} disabled={isSubmitting} />
            </label>
            {isSubmitting && (
              <div className="prompt-loader" aria-live="polite">
                <span className="prompt-loader-orb" aria-hidden="true" />
                <span className="prompt-loader-copy">{prompt.loadingLabel || 'Guardando cambios'}</span>
              </div>
            )}
            {submitError ? <p className="subtitle prompt-error">{submitError}</p> : null}
            <div className="prompt-actions">
              <button className="action-btn" type="button" onClick={() => onResolve(null)} disabled={isSubmitting}>Cancelar</button>
              <button className="action-btn accent" id="collection-name-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? `${prompt.loadingLabel || 'Guardando'}...` : prompt.submitLabel}</button>
            </div>
          </form>
        </article>
      </div>
    </div>
  );
}
