import { memo } from 'react';

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
