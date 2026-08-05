import { useEffect, useState } from 'react';

export default function HomePage() {
  const [dmOpen, setDmOpen] = useState(false);

  useEffect(() => {
    if (!dmOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDmOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dmOpen]);

  return (
    <div className="home-page">
      <div className="home-titles">
        <img
          className="home-banner"
          src="/implingz-banner.png"
          alt="IMPLINGZ"
          draggable="false"
        />

        <div className="home-actions">
          <button
            type="button"
            className="home-action"
            onClick={() => setDmOpen(true)}
          >
            Dungeon Master
          </button>
          <a
            className="home-action"
            href="https://opensea.io/collection/implingz/overview"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mint
          </a>
        </div>
      </div>

      {dmOpen && (
        <div
          className="dm-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Dungeon Master"
        >
          <button
            type="button"
            className="dm-modal__backdrop"
            aria-label="Close"
            onClick={() => setDmOpen(false)}
          />
          <div className="dm-modal__panel">
            <button
              type="button"
              className="dm-modal__close"
              aria-label="Close popup"
              onClick={() => setDmOpen(false)}
            >
              ×
            </button>
            <h2 className="dm-modal__title">Dungeon Master</h2>
            <div className="dm-modal__body" />
          </div>
        </div>
      )}

      <div className="home-walker" aria-hidden="true">
        <img
          className="home-walker__sprite"
          src="/impling-walk.gif"
          alt=""
          draggable="false"
        />
      </div>
    </div>
  );
}
