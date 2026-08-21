import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSignMessage } from 'wagmi';
import {
  buildAdventuresAccessMessage,
  fetchAdventuresAccess,
  isAdventuresTesterWallet,
} from '../lib/adventuresAccess';
import { isAdventuresChapter1Open } from '../lib/adventuresChapter';

const AdventuresPage = lazy(() => import('./AdventuresPage'));

function GatePopup({ message, error }) {
  return (
    <div
      className="adventures-gate-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adventures-wip-title"
    >
      <div className="adventures-gate__panel">
        <p className="adventures-gate__eyebrow">Adventures</p>
        <h1 id="adventures-wip-title">Work in progress</h1>
        <p>{message}</p>
        {error ? <p className="adventures-gate__error">{error}</p> : null}
      </div>
    </div>
  );
}

function AdventuresSuspense() {
  return (
    <Suspense fallback={<GatePopup message="Opening Adventures…" />}>
      <AdventuresPage />
    </Suspense>
  );
}

export default function AdventuresGatePage() {
  const { walletAccount } = useOutletContext();
  const { signMessageAsync } = useSignMessage();
  const [chapterOpen, setChapterOpen] = useState(() => isAdventuresChapter1Open());
  const [serverUnlocked, setServerUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const signingRef = useRef(false);
  const walletAllowed = chapterOpen || isAdventuresTesterWallet(walletAccount);
  const allowed = chapterOpen || (serverUnlocked && walletAllowed);

  useEffect(() => {
    const syncChapter = () => setChapterOpen(isAdventuresChapter1Open());
    syncChapter();
    const id = window.setInterval(syncChapter, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (chapterOpen) {
      setServerUnlocked(true);
      setChecking(false);
      return undefined;
    }

    let cancelled = false;
    setChecking(true);

    fetchAdventuresAccess()
      .then((value) => {
        if (!cancelled) setServerUnlocked(value);
      })
      .catch(() => {
        if (!cancelled) setServerUnlocked(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [walletAccount, chapterOpen]);

  useEffect(() => {
    if (chapterOpen || !walletAllowed || serverUnlocked || checking || signingRef.current) {
      return undefined;
    }

    let cancelled = false;
    signingRef.current = true;
    setSigning(true);
    setError('');

    (async () => {
      try {
        const challengeResponse = await fetch('/api/adventures-gate', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'challenge' }),
        });
        const challenge = await challengeResponse.json();
        if (!challengeResponse.ok || !challenge.nonce) {
          throw new Error(challenge.error || 'Could not start access verification.');
        }

        const signature = await signMessageAsync({
          message: buildAdventuresAccessMessage(challenge.nonce),
        });

        const unlockResponse = await fetch('/api/adventures-gate', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'unlock',
            walletAddress: walletAccount,
            nonce: challenge.nonce,
            signature,
          }),
        });
        const unlocked = await unlockResponse.json();
        if (cancelled) return;
        if (!unlockResponse.ok || !unlocked.unlocked) {
          throw new Error(unlocked.error || 'Access was denied.');
        }
        setServerUnlocked(true);
      } catch (requestError) {
        if (!cancelled) {
          setServerUnlocked(false);
          setError(
            requestError?.shortMessage ||
              requestError?.message ||
              'This page is being built/tested and could not verify access.'
          );
        }
      } finally {
        signingRef.current = false;
        if (!cancelled) setSigning(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chapterOpen, walletAllowed, serverUnlocked, checking, signMessageAsync, walletAccount]);

  if (allowed) {
    return <AdventuresSuspense />;
  }

  return (
    <GatePopup
      message={
        signing
          ? 'Confirm the wallet signature to open this test page.'
          : checking
            ? 'Checking access…'
            : 'This page is being built/tested.'
      }
      error={error}
    />
  );
}
