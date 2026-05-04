import { useEffect, useState } from 'react';
import WalletTopBarButton from './components/WalletTopBarButton';

const NAV = [
  { href: '#discover', label: 'Discover' },
  { href: '#about', label: 'About' },
  { href: '#community', label: 'Community' },
];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('pp-menu-open', menuOpen);
    return () => document.body.classList.remove('pp-menu-open');
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="pp-layout">
      <header className="pp-header">
        <div className="pp-header-inner">
          <a className="pp-logo" href="#top">
            Jooba
          </a>
          <nav className="pp-nav" aria-label="Primary">
            <ul>
              {NAV.map(({ href, label }) => (
                <li key={href}>
                  <a href={href}>{label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="pp-header-actions">
            <WalletTopBarButton connectLabel="Connect wallet" />
            <button
              type="button"
              className="pp-menu-btn"
              aria-expanded={menuOpen}
              aria-controls="pp-mobile-drawer"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <>
          <button type="button" className="pp-drawer-backdrop" aria-label="Close menu" onClick={closeMenu} />
          <div id="pp-mobile-drawer" className="pp-drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <ul className="pp-drawer-list">
              {NAV.map(({ href, label }) => (
                <li key={href}>
                  <a href={href} onClick={closeMenu}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      <main id="top">
        <section className="pp-hero" aria-labelledby="pp-hero-title">
          <div className="pp-hero-blobs" aria-hidden />
          <div className="pp-hero-inner">
            <p className="pp-eyebrow">Welcome to Jooba</p>
            <h1 id="pp-hero-title" className="pp-hero-title">
              A web3-born brand built on creativity &amp; community
            </h1>
            <p className="pp-hero-lead">
              We believe in the power of play and imagination—bring your wallet, explore what is next,
              and stay tuned as the story unfolds.
            </p>
            <div className="pp-hero-cta-row">
              <a className="pp-btn pp-btn--primary" href="#discover">
                Discover
              </a>
              <a className="pp-btn pp-btn--ghost" href="#about">
                Learn more
              </a>
            </div>
          </div>
        </section>

        <section id="discover" className="pp-section pp-section--tint">
          <div className="pp-section-inner">
            <p className="pp-section-label">Discover</p>
            <h2 className="pp-section-title">Start your journey today</h2>
            <p className="pp-section-copy">
              Content, drops, and community first—Jooba is a landing page you can grow. Plug in lore,
              a storefront, or holder tools whenever you ship the next chapter.
            </p>
            <a className="pp-btn pp-btn--primary pp-btn--inline" href="#community">
              Join the conversation
            </a>
          </div>
        </section>

        <section id="about" className="pp-section">
          <div className="pp-section-inner pp-split">
            <div>
              <p className="pp-section-label">About</p>
              <h2 className="pp-section-title">Good vibes, real ownership</h2>
              <p className="pp-section-copy">
                A warm hero, short story beats, chunky CTAs, and a sticky header so connecting a wallet is
                always one tap away—a structure that works for playful IP launches and NFT-adjacent
                brands alike.
              </p>
            </div>
            <div className="pp-stats">
              <div className="pp-stat-card">
                <span className="pp-stat-value">01</span>
                <span className="pp-stat-label">Connect</span>
              </div>
              <div className="pp-stat-card">
                <span className="pp-stat-value">02</span>
                <span className="pp-stat-label">Explore</span>
              </div>
              <div className="pp-stat-card">
                <span className="pp-stat-value">03</span>
                <span className="pp-stat-label">Build</span>
              </div>
            </div>
          </div>
        </section>

        <section className="pp-band">
          <div className="pp-band-inner">
            <p className="pp-band-tag">Wallet</p>
            <h2 className="pp-band-title">Hook up your wallet to unlock holder experiences</h2>
            <p className="pp-band-copy">
              Use the Connect control in the header—RainbowKit handles the modal; your Jooba menus and
              profile flow stay intact.
            </p>
          </div>
        </section>

        <section id="community" className="pp-section pp-section--cloud">
          <div className="pp-section-inner pp-community">
            <p className="pp-section-label">Community</p>
            <h2 className="pp-section-title">X marks the spot when the horizon shines</h2>
            <p className="pp-section-copy pp-community-copy">
              Inspire, participate, and create with people who care about the same things you do—check
              back for links to chat, drops, and media when you ship them.
            </p>
            <div className="pp-cards">
              <article className="pp-card">
                <h3 className="pp-card-title">Coming soon</h3>
                <p className="pp-card-copy">Drop your Discord or social URLs here.</p>
              </article>
              <article className="pp-card">
                <h3 className="pp-card-title">Updates</h3>
                <p className="pp-card-copy">Wire a CMS or markdown feed for announcements.</p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="pp-footer">
        <div className="pp-footer-inner">
          <span className="pp-footer-brand">Jooba</span>
          <p className="pp-footer-note">Inspired by marketing layouts like pudgypenguins.com—not affiliated.</p>
        </div>
      </footer>
    </div>
  );
}
