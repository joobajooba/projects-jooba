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
  const [curtainActive, setCurtainActive] = useState(false);
  const curtainTimeoutRef = useRef(null);
  const lastCurtainRef = useRef(0);

  useEffect(() => () => {
    window.clearTimeout(curtainTimeoutRef.current);
  }, []);

  const triggerCurtainTransition = () => {
    const now = Date.now();

    if (now - lastCurtainRef.current < 900) {
      return;
    }

    lastCurtainRef.current = now;
    window.clearTimeout(curtainTimeoutRef.current);
    setCurtainActive(false);

    window.requestAnimationFrame(() => {
      setCurtainActive(true);
      curtainTimeoutRef.current = window.setTimeout(() => setCurtainActive(false), 900);
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
    triggerCurtainTransition();
    closeSidebar();
  };

  const handleWheel = (event) => {
    if (event.deltaY > 40) {
      triggerCurtainTransition();
    }
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
            <article key={section.id} id={section.id} className="c-section-card" aria-label={section.title}>
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
                <img className="c-section-card__image" src={section.image} alt="" loading="lazy" />
              )}
            </article>
          ))}
        </section>
      </main>
      <div className={`c-curtain-transition${curtainActive ? ' c-curtain-transition--active' : ''}`} aria-hidden="true">
        <span className="c-curtain-transition__panel c-curtain-transition__panel--top" />
        <span className="c-curtain-transition__panel c-curtain-transition__panel--bottom" />
      </div>
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
              Close
            </button>
            <img className="c-profile-modal__image" src="/section-art/roadmap.png" alt="J00BA artwork" />
            <dl className="c-profile-modal__details">
              <div className="c-profile-modal__row">
                <dt>Name</dt>
                <dd id="j00ba-profile-title">J00BA</dd>
              </div>
              <div className="c-profile-modal__row">
                <dt>Handle</dt>
                <dd>j00ba_j00ba</dd>
              </div>
              <div className="c-profile-modal__row">
                <dt>About me</dt>
                <dd>My name is J00BA and i love JPEGS</dd>
              </div>
            </dl>
          </section>
        </div>
      )}
      <CryptoWalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </div>
  );
}
