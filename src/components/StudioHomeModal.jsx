import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

export default function StudioHomeModal({ open, title, onClose, children }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="studio-home-modal-root">
      <button
        type="button"
        className="studio-home-modal-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="studio-home-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="studio-home-modal-head">
          <h2 id={titleId} className="studio-home-modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="studio-home-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="studio-home-modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
