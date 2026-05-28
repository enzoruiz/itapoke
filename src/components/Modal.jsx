export function Modal({ open, children, onBackdropClick }) {
  if (!open) return null;
  return (
    <div className="modal" onClick={onBackdropClick}>
      <div className="modal-frame">{children}</div>
    </div>
  );
}
