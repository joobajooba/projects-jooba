import { lazy, Suspense, useEffect, useRef, useState } from 'react';

const AdventuresPage = lazy(() => import('./AdventuresPage'));

export default function AdventuresGatePage() {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const promptedRef = useRef(false);

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

  async function submitPassword(value) {
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/adventures-gate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: value }),
      });
      const data = await response.json();

      if (!response.ok || !data.unlocked) {
        setError(data.error || 'Incorrect password.');
        setPassword('');
        return false;
      }

      setUnlocked(true);
      return true;
    } catch {
      setError('Could not check the password. Try again.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (checking || unlocked || submitting || promptedRef.current) return;

    promptedRef.current = true;
    const value = window.prompt('Work in progress');
    if (value) {
      submitPassword(value);
    }
  }, [checking, unlocked, submitting]);

  async function handleSubmit(event) {
    event.preventDefault();
    await submitPassword(password);
  }

  if (checking) {
    return (
      <div className="adventures-gate">
        <div className="adventures-gate__panel">
          <p className="adventures-gate__eyebrow">Adventures</p>
          <h1>Work in progress</h1>
          <p>Checking access…</p>
        </div>
      </div>
    );
  }

  if (unlocked) {
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
    <div className="adventures-gate">
      <form className="adventures-gate__panel" onSubmit={handleSubmit}>
        <p className="adventures-gate__eyebrow">Adventures</p>
        <h1>Work in progress</h1>
        <p>Enter the access password to open this page.</p>
        <label className="adventures-gate__field">
          <span>Password</span>
          <input
            type="password"
            name="adventures-password"
            autoComplete="off"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
          />
        </label>
        {error ? <p className="adventures-gate__error">{error}</p> : null}
        <button type="submit" disabled={submitting || !password}>
          {submitting ? 'Checking…' : 'Open Adventures'}
        </button>
      </form>
    </div>
  );
}
