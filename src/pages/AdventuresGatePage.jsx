import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSignMessage } from 'wagmi';
import {
  buildAdventuresAccessMessage,
  fetchAdventuresAccess,
  fetchAdventuresGate,
  isAdventuresTesterWallet,
} from '../lib/adventuresAccess';
import { ADVENTURES_CLOSED, isAdventuresChapter1Open } from '../lib/adventuresChapter';
import { AdventuresChapterCountdown } from '../components/AdventuresChapterCountdown';

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
  const [soldOut, setSoldOut] = useState(false);
  const [serverUnlocked, setServerUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const signingRef = useRef(false);
  const walletAllowed =
    !ADVENTURES_CLOSED && !soldOut && (chapterOpen || isAdventuresTesterWallet(walletAccount));
  const allowed = !soldOut && (chapterOpen || (serverUnlocked && walletAllowed));

  useEffect(() => {
    let cancelled = false;

    function applyGate(gate) {
      setSoldOut(Boolean(gate.soldOut));
      setChapterOpen(Boolean(gate.chapterOpen) && !gate.soldOut);
      if (gate.soldOut) setServerUnlocked(false);
    }

    fetchAdventuresGate()
      .then((gate) => {
        if (!cancelled) applyGate(gate);
      })
      .catch(() => {});

    const id = window.setInterval(() => {
      fetchAdventuresGate()
        .then((gate) => {
          if (!cancelled) applyGate(gate);
        })
        .catch(() => {});
    }, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const syncChapter = () => setChapterOpen(isAdventuresChapter1Open() && !soldOut);
    syncChapter();
    const id = window.setInterval(syncChapter, 1000);
    return () => window.clearInterval(id);
  }, [soldOut]);

  useEffect(() => {
    if (soldOut) {
      setServerUnlocked(false);
      setChecking(false);
      return undefined;
    }

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
  }, [walletAccount, chapterOpen, soldOut]);

  useEffect(() => {
    if (soldOut || chapterOpen || !walletAllowed || serverUnlocked || checking || signingRef.current) {
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
  }, [soldOut, chapterOpen, walletAllowed, serverUnlocked, checking, signMessageAsync, walletAccount]);

  if (soldOut) {
    return (
      <div
        className="adventures-gate-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adventures-wip-title"
      >
        <div className="adventures-gate__panel">
          <p className="adventures-gate__eyebrow">Adventures</p>
          <h1 id="adventures-wip-title">Chapter 1 is complete</h1>
          <p>All 2222 Imp Keeps have been minted. Adventures are closed.</p>
        </div>
      </div>
    );
  }

  if (allowed) {
    return <AdventuresSuspense />;
  }

  if (!ADVENTURES_CLOSED && !chapterOpen && !isAdventuresTesterWallet(walletAccount)) {
    return (
      <div
        className="adventures-gate-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adventures-wip-title"
      >
        <div className="adventures-gate__panel">
          <p className="adventures-gate__eyebrow">Adventures</p>
          <h1 id="adventures-wip-title">Chapter 1 returns shortly</h1>
          <p>Keep minting stays open until all 2222 Imp Keeps are minted.</p>
          <AdventuresChapterCountdown />
        </div>
      </div>
    );
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
