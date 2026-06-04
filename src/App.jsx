import { Fragment, useEffect, useState } from 'react';
import MintingPlatformPage from './pages/MintingPlatformPage';
import ProjectPage from './pages/ProjectPage';
import TeamPage from './pages/TeamPage';
import UsefulLinksPage from './pages/UsefulLinksPage';

const NAV_SECTIONS = [
  {
    title: 'Community',
    items: [
      { id: 'profile', label: 'Profile', icon: 'profile' },
      { id: 'community', label: 'Community', icon: 'community' },
    ],
  },
  {
    title: 'Information',
    items: [
      { id: 'the-project', label: 'The Project', icon: 'project' },
      { id: 'minting-platform', label: 'Minting Platform', icon: 'badge' },
      { id: 'the-team', label: 'The Team', icon: 'team' },
      { id: 'useful-links', label: 'Useful Links', icon: 'link' },
    ],
  },
  {
    title: 'NFT Drops',
    items: [{ id: 'j00b-a', label: 'J00B-A', icon: 'nft' }],
  },
  {
    title: 'Proelium',
    items: [
      { id: 'matchmaking', label: 'Matchmaking', icon: 'matchmaking' },
      { id: 'deck-builder', label: 'Deck Builder', icon: 'deck' },
      { id: 'library', label: 'Library', icon: 'library' },
      { id: 'game-guide', label: 'Game Guide', icon: 'document' },
    ],
  },
];

function getPageFromHash() {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'the-project') return 'the-project';
  if (hash === 'minting-platform') return 'minting-platform';
  if (hash === 'the-team') return 'the-team';
  if (hash === 'useful-links') return 'useful-links';
  return 'home';
}

function NavIcon({ type }) {
  return (
    <svg className="c-sidebar__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {type === 'profile' && (
        <>
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </>
      )}
      {type === 'community' && (
        <>
          <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M17 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M14 14.5a4.75 4.75 0 0 1 6.5 4.5" />
        </>
      )}
      {type === 'project' && (
        <>
          <path d="M4 7.5h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5Z" />
          <path d="M9 7.5V5.5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        </>
      )}
      {type === 'badge' && (
        <>
          <path d="M12 3.5 14.2 5l2.65-.15.9 2.5 2.05 1.65-.75 2.55.75 2.55-2.05 1.65-.9 2.5-2.65-.15L12 20.5l-2.2-1.5-2.65.15-.9-2.5L4.2 15l.75-2.55L4.2 9.9l2.05-1.65.9-2.5L9.8 5 12 3.5Z" />
          <path d="m8.7 12.2 2.1 2.1 4.5-4.6" />
        </>
      )}
      {type === 'team' && (
        <>
          <path d="M8 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path d="M16 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path d="M12 14a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path d="M2.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M10.5 17.5a4.75 4.75 0 0 1 11 1.5" />
        </>
      )}
      {type === 'link' && (
        <>
          <path d="M10.5 13.5 8.6 15.4a3.5 3.5 0 0 1-5-5l2.4-2.4a3.5 3.5 0 0 1 5 5" />
          <path d="M13.5 10.5l1.9-1.9a3.5 3.5 0 0 1 5 5l-2.4 2.4a3.5 3.5 0 0 1-5-5" />
        </>
      )}
      {type === 'matchmaking' && (
        <>
          <path d="M7 5.5 4 12l3 6.5h3.5L8 12l2.5-6.5H7Z" />
          <path d="M17 5.5 14 12l3 6.5h3.5L18 12l2.5-6.5H17Z" />
        </>
      )}
      {type === 'deck' && (
        <>
          <path d="M5 6.5h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" />
          <path d="M8 4.5h11a2 2 0 0 1 2 2v9" />
        </>
      )}
      {type === 'library' && (
        <>
          <path d="M5 5.5h5v13H6.5a1.5 1.5 0 0 1-1.5-1.5V5.5Z" />
          <path d="M10 5.5h5v13h-3.5a1.5 1.5 0 0 1-1.5-1.5V5.5Z" />
          <path d="M15 5.5h4v13h-2.5a1.5 1.5 0 0 1-1.5-1.5V5.5Z" />
        </>
      )}
      {type === 'document' && (
        <>
          <path d="M6.5 3.5h7.25L18.5 8.25V19a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5Z" />
          <path d="M13.5 3.75V8.5h4.75" />
          <path d="M8.5 12h7" />
          <path d="M8.5 15.5h5.25" />
        </>
      )}
      {type === 'nft' && (
        <>
          <path d="M12 3.5 14.8 8.2 20.5 9l-4.2 3.8 1.1 5.2L12 15.8l-5.4 2.2 1.1-5.2L3.5 9l5.7-.7L12 3.5Z" />
        </>
      )}
    </svg>
  );
}

export default function App() {
  const [page, setPage] = useState(getPageFromHash);

  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  return (
    <div className="l-page">
      <aside className="c-sidebar" aria-label="Site navigation">
        <div className="c-sidebar__brand">
          <img className="c-sidebar__logo" src="/logo.png" alt="Jooba logo" />
        </div>
        <nav className="c-sidebar__nav">
          {NAV_SECTIONS.map((section, index) => (
            <Fragment key={section.title}>
              {index > 0 ? <hr className="c-sidebar__divider" aria-hidden="true" /> : null}
              <div className="c-sidebar__section">
                <h2 className="c-sidebar__heading">{section.title}</h2>
                <ul className="c-sidebar__list">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <a
                        className={`c-sidebar__link${page === item.id ? ' is-active' : ''}`}
                        href={`#${item.id}`}
                        title={item.label}
                      >
                        <NavIcon type={item.icon} />
                        <span className="c-sidebar__label">{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </Fragment>
          ))}
        </nav>
      </aside>
      <main className="l-page__main" aria-label="Main content">
        {page === 'the-project' ? (
          <ProjectPage />
        ) : page === 'minting-platform' ? (
          <MintingPlatformPage />
        ) : page === 'the-team' ? (
          <TeamPage />
        ) : page === 'useful-links' ? (
          <UsefulLinksPage />
        ) : null}
      </main>
    </div>
  );
}
