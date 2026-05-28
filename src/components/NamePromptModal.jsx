import { useEffect, useState } from 'react';

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
