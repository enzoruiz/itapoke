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
