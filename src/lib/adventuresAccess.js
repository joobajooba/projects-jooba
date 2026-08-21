import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

export const ADVENTURES_TESTER_WALLET = '0xfe9d3889b5e36b3216a756e0c752220dbf24dac8';

export const ADVENTURES_TESTER_WALLETS = [
  ADVENTURES_TESTER_WALLET,
  '0xb05b214b21801c18b40be098782f32970d29cea1',
];

export function isAdventuresTesterWallet(address) {
  return ADVENTURES_TESTER_WALLETS.includes(String(address || '').toLowerCase());
}

export function buildAdventuresAccessMessage(nonce) {
  return `IMPLINGz Adventures Access\n${nonce}`;
}

export async function fetchAdventuresAccess() {
  const response = await fetch('/api/adventures-gate', { credentials: 'same-origin' });
  const data = await response.json().catch(() => ({}));
  return Boolean(response.ok && data.unlocked);
}

export function useAdventuresServerAccess() {
  const { walletAccount } = useOutletContext();
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const walletAllowed = isAdventuresTesterWallet(walletAccount);

  useEffect(() => {
    let cancelled = false;

    if (!walletAllowed) {
      setUnlocked(false);
      setReady(true);
      return undefined;
    }

    setReady(false);
    fetchAdventuresAccess()
      .then((value) => {
        if (!cancelled) setUnlocked(value);
      })
      .catch(() => {
        if (!cancelled) setUnlocked(false);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [walletAllowed, walletAccount]);

  return {
    ready,
    unlocked: ready && unlocked && walletAllowed,
  };
}
