import { lazy, Suspense, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

const AdventuresPage = lazy(() => import('./AdventuresPage'));

const BYPASS_WALLET = '0xfe9d3889b5e36b3216a756e0c752220dbf24dac8';

export default function AdventuresGatePage() {
  const { walletAccount, openWalletMenu } = useOutletContext();
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const walletBypass = String(walletAccount || '').toLowerCase() === BYPASS_WALLET;
  const allowed = unlocked || walletBypass;

  useEffect(() => {
    let cancelled = false;

    fetch('/api/adventures-gate', { credentials: 'same-origin' })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setUnlocked(Boolean(data.unlocked));
      })
      .catch(() => {
        if (!cancelled) setUnlocked(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!password || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/adventures-gate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok || !data.unlocked) {
        setError(data.error || 'Incorrect password.');
        setPassword('');
        return;
      }

      setUnlocked(true);
    } catch {
      setError('Could not check the password. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (allowed) {
    return (
      <Suspense
        fallback={
          <div className="adventures-gate">
            <div className="adventures-gate__panel">
              <p className="adventures-gate__eyebrow">Adventures</p>
              <h1>Work in progress</h1>
              <p>Opening Adventures…</p>
            </div>
          </div>
        }
      >
        <AdventuresPage />
      </Suspense>
    );
  }

  return (
    <div className="adventures-gate-modal" role="dialog" aria-modal="true" aria-labelledby="adventures-wip-title">
      <form className="adventures-gate__panel" onSubmit={handleSubmit}>
        <p className="adventures-gate__eyebrow">Adventures</p>
        <h1 id="adventures-wip-title">Work in progress</h1>
        <p>
          {checking
            ? 'Checking access…'
            : 'This page is still being built. Enter the password, or connect the allowed wallet to bypass.'}
        </p>
        <label className="adventures-gate__field">
          <span>Password</span>
          <input
            type="password"
            name="adventures-password"
            autoComplete="off"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting || checking}
          />
        </label>
        {error ? <p className="adventures-gate__error">{error}</p> : null}
        {walletAccount && !walletBypass ? (
          <p className="adventures-gate__error">This connected wallet cannot bypass the gate.</p>
        ) : null}
        <div className="adventures-gate__actions">
          <button type="submit" disabled={submitting || checking || !password}>
            {submitting ? 'Checking…' : 'Open Adventures'}
          </button>
          <button type="button" onClick={() => openWalletMenu?.()} disabled={checking}>
            {walletAccount ? 'Switch wallet' : 'Connect wallet'}
          </button>
        </div>
      </form>
    </div>
  );
}
