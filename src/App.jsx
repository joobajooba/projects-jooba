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

function Shell({ children, previewMode, onTogglePreview }) {
  const nextIsMobile = previewMode === 'desktop';
  return (
    <div className="app-shell" data-preview={previewMode}>
      <aside className="app-sidebar" aria-label="Sidebar">
        <div className="app-sidebar-brand">
          <img src="/mayc-outline.png" alt="MAYC outline" />
        </div>
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
            <div className="app-topbar-inner">
              <WalletTopBarButton />
            </div>
          </header>
          <main className="app-content">
            <div className="app-content-inner">{children}</div>
          </main>
          <footer className="app-footer" aria-label="Footer" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState('checking');
  const [previewMode, setPreviewMode] = useState('desktop');

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

  const shellProps = { previewMode, onTogglePreview: togglePreview };

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

  return <Shell {...shellProps}>{null}</Shell>;
}
