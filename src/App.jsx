import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';

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
      <p>
        Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> (see{' '}
        <code>.env.example</code>).
      </p>
    );
  }

  if (status === 'checking') {
    return <p>Connecting…</p>;
  }

  if (status === 'error') {
    return <p>Supabase reachable but the session check failed (check URL, key, and project status).</p>;
  }

  return <p>Supabase client is configured. Replace this screen with your app.</p>;
}
