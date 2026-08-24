import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ADVENTURES_CLOSED, isAdventuresChapter1Open } from './adventuresChapter';

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

export async function fetchAdventuresGate() {
  const response = await fetch('/api/adventures-gate', { credentials: 'same-origin' });
  const data = await response.json().catch(() => ({}));
  return {
    unlocked: Boolean(response.ok && data.unlocked),
    chapterOpen: Boolean(data.chapterOpen),
    soldOut: Boolean(data.soldOut),
    totalSupply: Number(data.totalSupply) || 0,
    maxSupply: Number(data.maxSupply) || 2222,
  };
}

export async function fetchAdventuresAccess() {
  const gate = await fetchAdventuresGate();
  return gate.unlocked && !gate.soldOut;
}

export function useAdventuresServerAccess() {
  const { walletAccount } = useOutletContext();
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [chapterOpen, setChapterOpen] = useState(() => isAdventuresChapter1Open());
  const [soldOut, setSoldOut] = useState(false);
  const walletAllowed =
    !ADVENTURES_CLOSED && !soldOut && (chapterOpen || isAdventuresTesterWallet(walletAccount));

  useEffect(() => {
    const syncChapter = () => setChapterOpen(isAdventuresChapter1Open() && !soldOut);
    syncChapter();
    const id = window.setInterval(syncChapter, 1000);
    return () => window.clearInterval(id);
  }, [soldOut]);

  useEffect(() => {
    let cancelled = false;

    function applyGate(gate) {
      setSoldOut(Boolean(gate.soldOut));
      setChapterOpen(Boolean(gate.chapterOpen) && !gate.soldOut);
      setUnlocked(Boolean(gate.unlocked) && !gate.soldOut);
    }

    if (ADVENTURES_CLOSED) {
      setSoldOut(false);
      setUnlocked(false);
      setReady(true);
      return undefined;
    }

    setReady(false);
    fetchAdventuresGate()
      .then((gate) => {
        if (!cancelled) applyGate(gate);
      })
      .catch(() => {
        if (!cancelled) {
          setUnlocked(false);
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

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
  }, [walletAccount]);

  return {
    ready,
    unlocked: ready && !soldOut && (chapterOpen || (unlocked && walletAllowed)),
    chapterOpen: chapterOpen && !soldOut,
    soldOut,
  };
}
