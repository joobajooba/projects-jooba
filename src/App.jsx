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

const TEAM_MEMBERS = [
  {
    id: 'jooba',
    name: 'J00BA',
    handle: 'j00ba_j00ba',
    about: 'My name is J00BA and i love JPEGS',
    image: '/team-jooba.png',
  },
  {
    id: 'melvolio',
    name: 'Melvolio',
    image: '/team-melvolio.png',
  },
  {
    id: 'okidokie',
    name: 'Okidokie',
    image: '/team-okidokie.png',
  },
];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState(null);
  const [twitterModalOpen, setTwitterModalOpen] = useState(false);
  const [bouncingTeamMemberId, setBouncingTeamMemberId] = useState(null);
  const bounceTimeoutRef = useRef(null);
  const profileTimeoutRef = useRef(null);

  useEffect(() => () => {
    window.clearTimeout(bounceTimeoutRef.current);
    window.clearTimeout(profileTimeoutRef.current);
  }, []);

  const openWalletModal = () => {
    setWalletModalOpen(true);
    setSidebarOpen(false);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const openTwitterModal = (event) => {
    event.preventDefault();
    setTwitterModalOpen(true);
  };

  const openTeamMemberProfile = (member) => {
    window.clearTimeout(bounceTimeoutRef.current);
    window.clearTimeout(profileTimeoutRef.current);
    setSelectedTeamMember(null);
    setBouncingTeamMemberId(null);

    window.requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      const modalDelay = prefersReducedMotion ? 0 : 620;

      setBouncingTeamMemberId(member.id);
      bounceTimeoutRef.current = window.setTimeout(() => setBouncingTeamMemberId(null), 700);
      profileTimeoutRef.current = window.setTimeout(() => setSelectedTeamMember(member), modalDelay);
    });
  };

  return (
    <div className="l-page">
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
              <a key={item.id} className="c-sidebar__link u-text-bold" href={`#${item.id}`} onClick={closeSidebar}>
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
              className="c-section-card"
              aria-label={section.title}
            >
              {section.id === 'the-team' ? (
                <div className="c-team-card" aria-label="Team members">
                  {TEAM_MEMBERS.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className="c-team-card__button"
                      onClick={() => openTeamMemberProfile(member)}
                      aria-label={`Open ${member.name} profile`}
                    >
                      <img
                        className={`c-team-card__image${bouncingTeamMemberId === member.id ? ' c-team-card__image--bounce-in' : ''}`}
                        src={member.image}
                        alt=""
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <img
                  className="c-section-card__image"
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
      {selectedTeamMember && (
        <div className="c-profile-modal" role="dialog" aria-modal="true" aria-labelledby="team-profile-title">
          <button
            type="button"
            className="c-profile-modal__overlay"
            onClick={() => setSelectedTeamMember(null)}
            aria-label={`Close ${selectedTeamMember.name} profile`}
          />
          <section className="c-profile-modal__panel">
            <button type="button" className="c-profile-modal__close" onClick={() => setSelectedTeamMember(null)}>
              X
            </button>
            <img className="c-profile-modal__image" src={selectedTeamMember.image} alt={`${selectedTeamMember.name} artwork`} />
            <dl className="c-profile-modal__details">
              <div className="c-profile-modal__row">
                <dt>Name</dt>
                <dd id="team-profile-title">{selectedTeamMember.name}</dd>
              </div>
              {selectedTeamMember.handle && (
                <div className="c-profile-modal__row">
                  <dt>Handle</dt>
                  <dd>
                    <a className="c-profile-modal__link" href="https://x.com/j00ba_j00ba" onClick={openTwitterModal}>
                      {selectedTeamMember.handle}
                    </a>
                  </dd>
                </div>
              )}
              {selectedTeamMember.about && (
                <div className="c-profile-modal__row">
                  <dt>About me</dt>
                  <dd>{selectedTeamMember.about}</dd>
                </div>
              )}
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
