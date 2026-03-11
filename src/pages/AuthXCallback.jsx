import { useEffect, useState } from 'react';

/**
 * Handles X OAuth callback: exchanges code for token, saves X user to API, then redirects to app.
 * Rendered when pathname is /auth/x/callback (see main.jsx).
 */
export default function AuthXCallback() {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const storedState = sessionStorage.getItem('x_oauth_state');
    const storedVerifier = sessionStorage.getItem('x_oauth_code_verifier');
    const wallet = sessionStorage.getItem('x_oauth_wallet');

    sessionStorage.removeItem('x_oauth_state');
    sessionStorage.removeItem('x_oauth_code_verifier');
    sessionStorage.removeItem('x_oauth_wallet');

    if (!code || !state || state !== storedState || !storedVerifier) {
      setStatus('error');
      setMessage(!code || !storedVerifier ? 'Missing code from X. Try connecting again.' : 'Invalid state. Try connecting again.');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/x/callback`;

    (async () => {
      try {
        const res = await fetch('/api/auth/x-exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            code_verifier: storedVerifier,
            wallet: wallet || '',
            redirect_uri: redirectUri,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus('error');
          setMessage(data?.error || 'Something went wrong. Try again.');
          return;
        }
        setStatus('ok');
        setMessage(data?.username ? `Connected as @${data.username}` : 'X account linked.');
        window.location.replace('/');
      } catch (e) {
        setStatus('error');
        setMessage(e?.message || 'Request failed.');
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        {status === 'loading' && <p className="text-gray-400">Linking X account…</p>}
        {status === 'ok' && <p className="text-green-400">{message}</p>}
        {status === 'error' && (
          <>
            <p className="text-amber-500 mb-4">{message}</p>
            <a href="/" className="text-indigo-400 hover:underline">Return to app</a>
          </>
        )}
      </div>
    </div>
  );
}
