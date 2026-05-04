import { useEffect, useRef, useState } from 'react';
import CryptoWalletModal from './components/CryptoWalletModal';
import ModelViewer from './components/ModelViewer';

const NAV_ITEMS = [
  { id: 'crypto-wallet', label: 'Crypto Wallet', type: 'wallet' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'the-team', label: 'The Team' },
  { id: 'bops', label: 'Bops' },
];

const MARQUEE_ITEMS = Array.from({ length: 12 }, (_, index) => index);

const HOME_SECTIONS = [
  { id: 'roadmap', title: 'Roadmap', image: '/section-art/roadmap.png' },
  { id: 'the-team', title: 'Team', image: '/section-art/team.png' },
  { id: 'bops', title: 'Bops', image: '/section-art/bops.png' },
  { id: 'coming-soon', title: 'Coming Soon', image: '/section-art/coming-soon.png' },
];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [twitterModalOpen, setTwitterModalOpen] = useState(false);
  const [teamPanelVisible, setTeamPanelVisible] = useState(false);
  const [bounceActive, setBounceActive] = useState(false);
  const bounceTimeoutRef = useRef(null);
  const lastBounceRef = useRef(0);
  const teamPanelRef = useRef(null);

  useEffect(() => () => {
    window.clearTimeout(bounceTimeoutRef.current);
  }, []);

  useEffect(() => {
    const teamPanel = teamPanelRef.current;

    if (!teamPanel) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTeamPanelVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(teamPanel);

    return () => observer.disconnect();
  }, []);

  const triggerBounceTransition = () => {
    const now = Date.now();

    if (now - lastBounceRef.current < 850) {
      return;
    }

    lastBounceRef.current = now;
    window.clearTimeout(bounceTimeoutRef.current);
    setBounceActive(false);

    window.requestAnimationFrame(() => {
      setBounceActive(true);
      bounceTimeoutRef.current = window.setTimeout(() => setBounceActive(false), 820);
    });
  };

  const openWalletModal = () => {
    setWalletModalOpen(true);
    setSidebarOpen(false);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleSectionNav = () => {
    triggerBounceTransition();
    closeSidebar();
  };

  const handleWheel = (event) => {
    if (event.deltaY > 40) {
      triggerBounceTransition();
    }
  };

  const openTwitterModal = (event) => {
    event.preventDefault();
    setTwitterModalOpen(true);
  };

  return (
    <div className="l-page" onWheel={handleWheel}>
      <div className="c-marquee" aria-label="Coming soon">
        <div className="c-marquee__track" aria-hidden="true">
          {MARQUEE_ITEMS.map((item) => (
            <span key={item} className="c-marquee__item">
              Coming soon
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="c-button c-button--controller"
        onClick={() => setSidebarOpen((isOpen) => !isOpen)}
        aria-controls="site-sidebar"
        aria-expanded={sidebarOpen}
        aria-label="Toggle sidebar"
      >
        <span className="c-icon c-icon--hamburger" aria-hidden="true">
          <span className="c-icon__line" />
          <span className="c-icon__line" />
          <span className="c-icon__line" />
        </span>
      </button>

      <aside id="site-sidebar" className={`c-sidebar${sidebarOpen ? ' c-sidebar--open' : ''}`} aria-label="Site navigation">
        <nav className="c-sidebar__nav">
          {NAV_ITEMS.map((item) => (
            item.type === 'wallet' ? (
              <button key={item.id} type="button" className="c-sidebar__link c-sidebar__link--button u-text-bold" onClick={openWalletModal}>
                {item.label}
              </button>
            ) : (
              <a key={item.id} className="c-sidebar__link u-text-bold" href={`#${item.id}`} onClick={handleSectionNav}>
                {item.label}
              </a>
            )
          ))}
        </nav>
      </aside>

      <main className="l-page__content" aria-label="Main page content">
        <section className="l-page__hero" aria-label="Featured 3D model">
          <ModelViewer src="/models/9419_model.glb" />
        </section>

        <div className="c-section-divider" aria-hidden="true" />

        <section className="c-section-grid" aria-label="Home sections">
          {HOME_SECTIONS.map((section) => (
            <article
              key={section.id}
              id={section.id}
              ref={section.id === 'the-team' ? teamPanelRef : undefined}
              className="c-section-card"
              aria-label={section.title}
            >
              {section.id === 'roadmap' ? (
                <button
                  type="button"
                  className="c-section-card__button"
                  onClick={() => setProfileModalOpen(true)}
                  aria-label="Open J00BA profile"
                >
                  <img className="c-section-card__image" src={section.image} alt="" loading="lazy" />
                </button>
              ) : (
                <img
                  className={`c-section-card__image${section.id === 'the-team' && teamPanelVisible ? ' c-section-card__image--bounce-in' : ''}`}
                  src={section.image}
                  alt=""
                  loading="lazy"
                />
              )}
            </article>
          ))}
        </section>

        <section className="l-page__blank-section" aria-label="Blank section" />
      </main>
      <div className={`c-bounce-transition${bounceActive ? ' c-bounce-transition--active' : ''}`} aria-hidden="true" />
      {profileModalOpen && (
        <div className="c-profile-modal" role="dialog" aria-modal="true" aria-labelledby="j00ba-profile-title">
          <button
            type="button"
            className="c-profile-modal__overlay"
            onClick={() => setProfileModalOpen(false)}
            aria-label="Close J00BA profile"
          />
          <section className="c-profile-modal__panel">
            <button type="button" className="c-profile-modal__close" onClick={() => setProfileModalOpen(false)}>
              X
            </button>
            <img className="c-profile-modal__image" src="/section-art/roadmap.png" alt="J00BA artwork" />
            <dl className="c-profile-modal__details">
              <div className="c-profile-modal__row">
                <dt>Name</dt>
                <dd id="j00ba-profile-title">J00BA</dd>
              </div>
              <div className="c-profile-modal__row">
                <dt>Handle</dt>
                <dd>
                  <a className="c-profile-modal__link" href="https://x.com/j00ba_j00ba" onClick={openTwitterModal}>
                    j00ba_j00ba
                  </a>
                </dd>
              </div>
              <div className="c-profile-modal__row">
                <dt>About me</dt>
                <dd>My name is J00BA and i love JPEGS</dd>
              </div>
            </dl>
          </section>
        </div>
      )}
      {twitterModalOpen && (
        <div className="c-link-modal" role="dialog" aria-modal="true" aria-labelledby="twitter-link-title">
          <button
            type="button"
            className="c-link-modal__overlay"
            onClick={() => setTwitterModalOpen(false)}
            aria-label="Close Twitter link notice"
          />
          <section className="c-link-modal__panel">
            <h2 id="twitter-link-title" className="c-link-modal__title">
              Leaving Jooba
            </h2>
            <p className="c-link-modal__text">This link will take you to my Twitter profile.</p>
            <div className="c-link-modal__actions">
              <a className="c-link-modal__button c-link-modal__button--primary" href="https://x.com/j00ba_j00ba" target="_blank" rel="noreferrer">
                Continue
              </a>
              <button type="button" className="c-link-modal__button" onClick={() => setTwitterModalOpen(false)}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
      <CryptoWalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </div>
  );
}
