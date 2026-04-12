import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import WalletTopBarButton from './components/WalletTopBarButton';

function IconMonitor() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" strokeLinecap="round" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M10 18h4" strokeLinecap="round" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhaseCaption({ number, suffix, compact }) {
  return (
    <figcaption className={`studio-phase-label${compact ? ' studio-phase-label--compact' : ''}`}>
      <span className="studio-phase-label-phase">Phase</span> {number} | {suffix}
    </figcaption>
  );
}

function IconSquare3Stack3d() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3"
      />
    </svg>
  );
}

function IconDiscord() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function Shell({ children, previewMode, onTogglePreview, activeStudioPage, onSelectStudioPage }) {
  const nextIsMobile = previewMode === 'desktop';
  return (
    <div className="app-shell" data-preview={previewMode}>
      <aside className="app-sidebar" aria-label="Sidebar">
        <div className="app-sidebar-brand">
          <img src="/mayc-outline.png" alt="MAYC outline" />
        </div>
        <nav className="app-sidebar-nav" aria-label="Studio pages">
          <button
            type="button"
            className="app-sidebar-nav-btn"
            onClick={() => onSelectStudioPage('home')}
            title="Home Page"
            aria-label="Home Page"
            aria-current={activeStudioPage === 'home' ? 'page' : undefined}
          >
            <IconHome />
          </button>
          <button
            type="button"
            className="app-sidebar-nav-btn"
            onClick={() => onSelectStudioPage('other')}
            title="Other Pages"
            aria-label="Other Pages"
            aria-current={activeStudioPage === 'other' ? 'page' : undefined}
          >
            <IconSquare3Stack3d />
          </button>
        </nav>
        <button
          type="button"
          className="app-sidebar-toggle"
          onClick={onTogglePreview}
          title={nextIsMobile ? 'Preview mobile width' : 'Use full desktop width'}
          aria-label={nextIsMobile ? 'Switch to mobile layout preview' : 'Switch to desktop layout'}
        >
          {previewMode === 'desktop' ? <IconPhone /> : <IconMonitor />}
        </button>
      </aside>
      <div className="app-main-col">
        <div className="app-main-stage">
          <header className="app-topbar" aria-label="Top bar">
            <span className="app-topbar-title">Studio J00BA</span>
            <div className="app-topbar-inner">
              <WalletTopBarButton />
            </div>
          </header>
          <div className="app-main-body">
            <div className="corner-frames" aria-hidden="true">
              <div className="corner-frame-br" />
              <div className="corner-frame-bl" />
            </div>
            <main className="app-content">
              <div className="app-content-inner">{children}</div>
            </main>
            <div className="overlay-scanlines" aria-hidden="true" />
            <div className="overlay-vignette" aria-hidden="true" />
            <div className="overlay-glow-sweep" aria-hidden="true" />
          </div>
          <footer className="app-footer" aria-label="Footer">
            <div className="app-footer-social">
              <a
                className="app-footer-social-link"
                href="https://discord.gg/Z4nuZYgwHP"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Discord"
              >
                <IconDiscord />
              </a>
              <a
                className="app-footer-social-link"
                href="https://x.com/StudioJ00BA"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
              >
                <IconX />
              </a>
            </div>
            <a
              className="app-footer-apechain"
              href="https://apechain.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Apechain"
            >
              <img src="/apechain-logo.png" alt="" width={120} height={40} decoding="async" />
            </a>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState('checking');
  const [previewMode, setPreviewMode] = useState('desktop');
  const [studioPage, setStudioPage] = useState('home');

  useEffect(() => {
    if (!supabase) {
      setStatus('missing_env');
      return;
    }
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ error }) => {
        if (cancelled) return;
        setStatus(error ? 'error' : 'ok');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const togglePreview = () => {
    setPreviewMode((m) => (m === 'desktop' ? 'mobile' : 'desktop'));
  };

  const shellProps = {
    previewMode,
    onTogglePreview: togglePreview,
    activeStudioPage: studioPage,
    onSelectStudioPage: setStudioPage,
  };

  if (status === 'missing_env') {
    return (
      <Shell {...shellProps}>
        <div className="app-message">
          <p>
            Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> (see{' '}
            <code>.env.example</code>).
          </p>
        </div>
      </Shell>
    );
  }

  if (status === 'checking') {
    return (
      <Shell {...shellProps}>
        <div className="app-message">
          <p>Connecting…</p>
        </div>
      </Shell>
    );
  }

  if (status === 'error') {
    return (
      <Shell {...shellProps}>
        <div className="app-message">
          <p>
            Supabase reachable but the session check failed (check URL, key, and project status).
          </p>
        </div>
      </Shell>
    );
  }

  const studioMain =
    studioPage === 'home' ? (
      <div className="studio-page studio-page--home">
        <header className="studio-home-hero">
          <div className="studio-home-hero-label-row">
            <span className="studio-home-hero-line" aria-hidden="true" />
            <span className="studio-home-hero-label">Coming to Apechain</span>
            <span className="studio-home-hero-line" aria-hidden="true" />
          </div>
          <h1 className="studio-home-hero-title">Studio JOOBA</h1>
        </header>
        <nav className="studio-home-panels" aria-label="Studio sections">
          <button type="button" className="studio-home-panel">
            Information
          </button>
          <button type="button" className="studio-home-panel">
            The Team
          </button>
          <button type="button" className="studio-home-panel">
            Yuga Assets
          </button>
        </nav>
        <div className="studio-phase-row studio-phase-row--horizontal">
          <figure className="studio-phase-card studio-phase-card--compact">
            <div className="studio-phase-thumb studio-phase-thumb--compact">
              <img className="studio-phase-img" src="/phase1-bops.png" alt="Phase 1 Bops" />
            </div>
            <PhaseCaption number={1} suffix="Bops" compact />
          </figure>
          <figure className="studio-phase-card studio-phase-card--compact">
            <div className="studio-phase-thumb studio-phase-thumb--blank studio-phase-thumb--compact" aria-hidden />
            <PhaseCaption number={2} suffix="TBC" compact />
          </figure>
          <figure className="studio-phase-card studio-phase-card--compact">
            <div className="studio-phase-thumb studio-phase-thumb--blank studio-phase-thumb--compact" aria-hidden />
            <PhaseCaption number={3} suffix="TBC" compact />
          </figure>
          <figure className="studio-phase-card studio-phase-card--compact">
            <div className="studio-phase-thumb studio-phase-thumb--blank studio-phase-thumb--compact" aria-hidden />
            <PhaseCaption number={4} suffix="TBC" compact />
          </figure>
        </div>
      </div>
    ) : (
      <div className="studio-page studio-page--other">
        <h1 className="studio-page-title">Other Pages</h1>
        <div className="studio-lorem">
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
            labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
            laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
            mollit anim id est laborum. Curabitur pretium tincidunt lacus.
          </p>
          <p>
            Integer volutpat ligula eu tortor pharetra, sit amet auctor risus facilisis. The quick brown
            fox jumps over the lazy dog — 0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ.
          </p>
        </div>
      </div>
    );

  return <Shell {...shellProps}>{studioMain}</Shell>;
}
