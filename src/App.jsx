import WalletTopBarButton from './components/WalletTopBarButton';

const MARQUEE_CHUNK = 'Coming soon · ';

export default function App() {
  const repeated = Array.from({ length: 24 }, () => MARQUEE_CHUNK).join('');

  return (
    <div className="pp-layout">
      <div className="pp-marquee" role="region" aria-label="Site status" aria-live="polite">
        <div className="pp-marquee-track">
          <div className="pp-marquee-group">{repeated}</div>
          <div className="pp-marquee-group" aria-hidden>
            {repeated}
          </div>
        </div>
      </div>

      <main id="top">
        <section className="pp-hero" aria-label="Home">
          <div className="pp-hero-bar">
            <div className="pp-hero-wallet">
              <WalletTopBarButton connectLabel="Connect wallet" />
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
                A landing structure with short story beats and chunky CTAs—connect lives up top so it is
                always one tap away. Works well for playful IP launches and NFT-adjacent brands.
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
              Use Connect above—RainbowKit handles the modal; your Jooba menus and profile flow stay
              intact.
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
