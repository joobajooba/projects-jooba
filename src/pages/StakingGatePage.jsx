import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSignMessage } from 'wagmi';
import {
  buildStakingAccessMessage,
  fetchStakingAccess,
  isStakingTesterWallet,
} from '../lib/stakingAccess';

const StakingPage = lazy(() => import('./StakingPage'));

function GatePopup({ message, error }) {
  return (
    <div
      className="adventures-gate-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staking-wip-title"
    >
      <div className="adventures-gate__panel">
        <p className="adventures-gate__eyebrow">Staking</p>
        <h1 id="staking-wip-title">Work in progress</h1>
        <p>{message}</p>
        {error ? <p className="adventures-gate__error">{error}</p> : null}
      </div>
    </div>
  );
}

export default function StakingGatePage() {
  const { walletAccount } = useOutletContext();
  const { signMessageAsync } = useSignMessage();
  const [serverUnlocked, setServerUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const signingRef = useRef(false);
  const walletAllowed = isStakingTesterWallet(walletAccount);
  const allowed = serverUnlocked && walletAllowed;

  useEffect(() => {
    let cancelled = false;

    fetchStakingAccess()
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
  }, [walletAccount]);

  useEffect(() => {
    if (!walletAllowed || serverUnlocked || checking || signingRef.current) return undefined;

    let cancelled = false;
    signingRef.current = true;
    setSigning(true);
    setError('');

    (async () => {
      try {
        const challengeResponse = await fetch('/api/staking-gate', {
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
          message: buildStakingAccessMessage(challenge.nonce),
        });

        const unlockResponse = await fetch('/api/staking-gate', {
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
  }, [walletAllowed, serverUnlocked, checking, signMessageAsync, walletAccount]);

  if (allowed) {
    return (
      <Suspense fallback={<GatePopup message="Opening Staking…" />}>
        <StakingPage />
      </Suspense>
    );
  }

  return (
    <GatePopup
      message={
        signing
          ? 'Confirm the wallet signature to open this test page.'
          : checking
            ? 'Checking access…'
            : walletAccount
              ? 'This page is being built/tested.'
              : 'Connect an allowed wallet to open Staking.'
      }
      error={error}
    />
  );
}
