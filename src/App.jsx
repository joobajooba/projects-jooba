const NAV_SECTIONS = [
  {
    title: 'Community',
    items: [
      { id: 'profile', label: 'Profile' },
      { id: 'community', label: 'Community' },
    ],
  },
  {
    title: 'Information',
    items: [
      { id: 'the-project', label: 'The Project' },
      { id: 'j00b-as', label: 'J00B-As' },
      { id: 'the-team', label: 'The Team' },
      { id: 'useful-links', label: 'Useful Links' },
    ],
  },
  {
    title: 'The Game',
    items: [
      { id: 'matchmaking', label: 'Matchmaking' },
      { id: 'deck-builder', label: 'Deck Builder' },
      { id: 'library', label: 'Library' },
    ],
  },
];

export default function App() {
  return (
    <div className="l-page">
      <aside className="c-sidebar" aria-label="Site navigation">
        <nav className="c-sidebar__nav">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="c-sidebar__section">
              <h2 className="c-sidebar__heading">{section.title}</h2>
              <ul className="c-sidebar__list">
                {section.items.map((item) => (
                  <li key={item.id}>
                    <a className="c-sidebar__link" href={`#${item.id}`}>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <main className="l-page__main" aria-label="Main content" />
    </div>
  );
}
