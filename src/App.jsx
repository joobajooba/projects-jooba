import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';

function Shell({ children }) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Sidebar" />
      <div className="app-main-col">
        <header className="app-topbar" aria-label="Top bar" />
        <main className="app-content">
          <div className="app-content-inner">{children}</div>
        </main>
        <footer className="app-footer" aria-label="Footer" />
      </div>
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState('checking');

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

  if (status === 'missing_env') {
    return (
      <Shell>
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
      <Shell>
        <div className="app-message">
          <p>Connecting…</p>
        </div>
      </Shell>
    );
  }

  if (status === 'error') {
    return (
      <Shell>
        <div className="app-message">
          <p>
            Supabase reachable but the session check failed (check URL, key, and project status).
          </p>
        </div>
      </Shell>
    );
  }

  return <Shell>{null}</Shell>;
}
