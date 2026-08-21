import { useEffect, useState } from 'react';
import { AdventuresChapterCountdown } from '../components/AdventuresChapterCountdown';

const SLIDE_MS = 3500;
const SHOW_SLIDESHOW = false;

export default function HomePage() {
  const [dmOpen, setDmOpen] = useState(false);
  const [mintClosedOpen, setMintClosedOpen] = useState(false);
  const [slides, setSlides] = useState([]);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (!dmOpen && !mintClosedOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDmOpen(false);
        setMintClosedOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dmOpen, mintClosedOpen]);

  useEffect(() => {
    if (!SHOW_SLIDESHOW) return undefined;

    let cancelled = false;

    fetch('/slideshow/manifest.json')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load slideshow');
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        const images = Array.isArray(data.images) ? data.images : [];
        setSlides(images);
        setSlideIndex(0);
      })
      .catch(() => {
        if (!cancelled) setSlides([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!SHOW_SLIDESHOW || slides.length < 2) return undefined;

    const id = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % slides.length);
    }, SLIDE_MS);

    return () => window.clearInterval(id);
  }, [slides]);

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
            The Team
          </button>
          <button
            type="button"
            className="home-action"
            onClick={() => setMintClosedOpen(true)}
          >
            Mint
          </button>
        </div>

        <AdventuresChapterCountdown />

        {SHOW_SLIDESHOW && slides.length > 0 && (
          <div className="home-slideshow" aria-label="IMPLINGZ preview">
            {slides.map((src, index) => (
              <img
                key={src}
                className={`home-slideshow__image${
                  index === slideIndex ? ' home-slideshow__image--active' : ''
                }`}
                src={src}
                alt=""
                draggable="false"
              />
            ))}
          </div>
        )}
      </div>

      {dmOpen && (
        <div
          className="dm-modal"
          role="dialog"
          aria-modal="true"
          aria-label="The Team"
        >
          <button
            type="button"
            className="dm-modal__backdrop"
            aria-label="Close"
            onClick={() => setDmOpen(false)}
          />
          <div className="dm-modal__panel dm-modal__panel--team">
            <button
              type="button"
              className="dm-modal__close"
              aria-label="Close popup"
              onClick={() => setDmOpen(false)}
            >
              ×
            </button>
            <h2 className="dm-modal__title">The Team</h2>
            <div className="dm-modal__body dm-modal__body--team">
              <div className="dm-modal__member">
                <img
                  className="dm-modal__avatar"
                  src="/dm-creator.png"
                  alt="Collection creator J00BA"
                  draggable="false"
                />
                <p className="dm-modal__credit">Collection Creator | J00BA</p>
              </div>
              <div className="dm-modal__member">
                <img
                  className="dm-modal__avatar"
                  src="/team-jonnyd.png"
                  alt="Community manager jonnyd"
                  draggable="false"
                />
                <p className="dm-modal__credit">Community Manager | jonnyd</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {mintClosedOpen && (
        <div
          className="dm-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Mint Status"
        >
          <button
            type="button"
            className="dm-modal__backdrop"
            aria-label="Close"
            onClick={() => setMintClosedOpen(false)}
          />
          <div className="dm-modal__panel">
            <button
              type="button"
              className="dm-modal__close"
              aria-label="Close popup"
              onClick={() => setMintClosedOpen(false)}
            >
              ×
            </button>
            <h2 className="dm-modal__title">Mint Status</h2>
            <div className="dm-modal__body">
              <p className="dm-modal__credit" style={{ marginTop: '1rem', lineHeight: '1.6' }}>
                Mint is now closed. Thank you everyone who participated.
              </p>
            </div>
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
