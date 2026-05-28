import { memo } from 'react';
import { collectionPath } from '../app-routing.js';
import { CollectionsSkeleton } from './Skeletons.jsx';
import { ProgressMeter } from './ProgressMeter.jsx';
import { GoogleButtonMount } from './GoogleButtonMount.jsx';

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
