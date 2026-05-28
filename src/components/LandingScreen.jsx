import { memo } from 'react';

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
