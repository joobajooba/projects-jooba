import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import collection from '../data/collection.json';
import { decorateAccount, emptyAdventurerAccount } from './adventurerProgress';
import {
  abandonAdventure,
  fetchAdventurerAccount,
  reportMiningProgress,
  submitWinningHash,
} from './adventuresApi';
import { hashesPerTickForParty, mineHashBatch, resolveImplingTier } from './hashMining';

const AdventureRuntimeContext = createContext(null);

const PARTY_STORAGE_KEY = 'implingz-active-adventure-party';
const NONCE_STORAGE_KEY = 'implingz-active-adventure-nonce';
const COLLECTION_BY_ID = new Map(collection.map((impling) => [String(impling.id), impling]));

function readJson(key, fallback) {
  try {
    const value = window.sessionStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  window.sessionStorage.setItem(key, JSON.stringify(value));
}

function enrichPartyMember(member) {
  if (!member) return null;
  const local = COLLECTION_BY_ID.get(String(member.id));
  const tier =
    resolveImplingTier(member) ||
    resolveImplingTier(local) ||
    resolveImplingTier({ attributes: local?.attributes });

  return {
    id: String(member.id),
    name: member.name || local?.name || `IMPLINGZ #${member.id}`,
    image: member.image || local?.image || '',
    tier: tier || 'Tier 1',
    attributes: local?.attributes ?? member.attributes ?? { Tier: tier || 'Tier 1' },
  };
}

function partyFromTokenIds(tokenIds = []) {
  return tokenIds.map((tokenId) => {
    const local = COLLECTION_BY_ID.get(String(tokenId));
    return enrichPartyMember({
      id: String(tokenId),
      name: local?.name,
      image: local?.image,
      attributes: local?.attributes,
      tier: local?.attributes?.Tier,
    });
  });
}

export function AdventureRuntimeProvider({ walletAccount, children }) {
  const [adventurer, setAdventurer] = useState(() => emptyAdventurerAccount());
  const [session, setSession] = useState(null);
  const [party, setParty] = useState([]);
  const [hashesChecked, setHashesChecked] = useState(0);
  const [miningNonce, setMiningNonce] = useState(0);
  const [dungeonImageUrl, setDungeonImageUrl] = useState('');
  const [dripMessage, setDripMessage] = useState('');
  const [runtimeError, setRuntimeError] = useState('');
  const [miningPaused, setMiningPaused] = useState(false);
  const hashRateRef = useRef(3);
  const miningNonceRef = useRef(0);
  const miningPausedRef = useRef(false);

  const adventureActive = Boolean(
    session && (session.status === 'running' || session.status === 'found')
  );

  hashRateRef.current = Math.max(1, hashesPerTickForParty(party));
  miningNonceRef.current = miningNonce;
  miningPausedRef.current = miningPaused;

  const clearActiveAdventure = useCallback(() => {
    setSession(null);
    setParty([]);
    setHashesChecked(0);
    setMiningNonce(0);
    miningNonceRef.current = 0;
    setDungeonImageUrl('');
    setDripMessage('');
    setMiningPaused(false);
    miningPausedRef.current = false;
    window.sessionStorage.removeItem(PARTY_STORAGE_KEY);
    window.sessionStorage.removeItem(NONCE_STORAGE_KEY);
  }, []);

  const loadDungeonPreview = useCallback(async (seed) => {
    if (!seed) {
      setDungeonImageUrl('');
      return;
    }
    setDungeonImageUrl(
      `/api/dungeon-preview?seed=${encodeURIComponent(seed)}&format=png`
    );
  }, []);

  const beginAdventure = useCallback(
    ({ account, session: nextSession, partyMembers }) => {
      const enrichedParty = (partyMembers ?? []).map(enrichPartyMember).filter(Boolean);
      setAdventurer(decorateAccount(account));
      setSession(nextSession);
      setParty(enrichedParty);
      setHashesChecked(Number(nextSession?.hashes_checked ?? 0));
      setMiningNonce(0);
      miningNonceRef.current = 0;
      setDungeonImageUrl('');
      setDripMessage('');
      setRuntimeError('');
      writeJson(PARTY_STORAGE_KEY, {
        sessionId: nextSession.id,
        party: enrichedParty,
      });
      writeJson(NONCE_STORAGE_KEY, { sessionId: nextSession.id, nonce: 0 });
    },
    []
  );

  const attachFoundState = useCallback(
    async ({ account, session: nextSession, drip }) => {
      setAdventurer(decorateAccount(account));
      setSession(nextSession);
      setHashesChecked(Number(nextSession?.hashes_checked ?? hashesChecked));
      if (drip) {
        setDripMessage(`${drip.amount} $DERP is queued from the royalties pot.`);
      }
      await loadDungeonPreview(nextSession?.dungeon_seed);
    },
    [hashesChecked, loadDungeonPreview]
  );

  const endAdventure = useCallback(
    ({ account, session: nextSession, message } = {}) => {
      if (account) setAdventurer(decorateAccount(account));
      if (nextSession) setSession(nextSession);
      else clearActiveAdventure();
      if (
        !nextSession ||
        !['running', 'found'].includes(nextSession.status)
      ) {
        clearActiveAdventure();
      }
      if (message) setDripMessage('');
      setRuntimeError(message || '');
    },
    [clearActiveAdventure]
  );

  const stopAdventure = useCallback(async () => {
    if (!session?.id) {
      clearActiveAdventure();
      return { ok: true };
    }
    if (!['running', 'found'].includes(session.status)) {
      clearActiveAdventure();
      return { ok: true };
    }
    const data = await abandonAdventure(session.id);
    setAdventurer(decorateAccount(data.account));
    clearActiveAdventure();
    return data;
  }, [clearActiveAdventure, session]);

  const resumeAfterWalkAway = useCallback(
    ({ account, session: nextSession, nextNonce }) => {
      const nonce = Math.max(0, Number(nextNonce) || 0);
      setAdventurer(decorateAccount(account));
      setSession(nextSession);
      setDungeonImageUrl('');
      setMiningNonce(nonce);
      miningNonceRef.current = nonce;
      writeJson(NONCE_STORAGE_KEY, { sessionId: nextSession.id, nonce });
    },
    []
  );

  useEffect(() => {
    if (!walletAccount) {
      setAdventurer(emptyAdventurerAccount());
      clearActiveAdventure();
      return undefined;
    }

    const controller = new AbortController();
    fetchAdventurerAccount(walletAccount, { signal: controller.signal })
      .then((data) => {
        setAdventurer(decorateAccount(data.account));
        const active = (data.sessions ?? []).find(
          (row) => row.status === 'running' || row.status === 'found'
        );
        if (!active) {
          clearActiveAdventure();
          return;
        }

        const storedParty = readJson(PARTY_STORAGE_KEY, null);
        const restoredParty =
          storedParty?.sessionId === active.id && Array.isArray(storedParty.party)
            ? storedParty.party.map(enrichPartyMember)
            : partyFromTokenIds(active.party_token_ids ?? []);

        const storedNonce = readJson(NONCE_STORAGE_KEY, null);
        const nextNonce =
          storedNonce?.sessionId === active.id ? Number(storedNonce.nonce) || 0 : 0;

        setSession(active);
        setParty(restoredParty);
        setHashesChecked(Number(active.hashes_checked ?? 0));
        setMiningNonce(nextNonce);
        miningNonceRef.current = nextNonce;
        writeJson(PARTY_STORAGE_KEY, { sessionId: active.id, party: restoredParty });
        if (active.dungeon_seed) loadDungeonPreview(active.dungeon_seed);
      })
      .catch(() => {
        setAdventurer(emptyAdventurerAccount(walletAccount.toLowerCase()));
      });

    return () => controller.abort();
  }, [walletAccount, clearActiveAdventure, loadDungeonPreview]);

  useEffect(() => {
    if (!session?.id || session.status !== 'running') return undefined;

    let cancelled = false;
    let pendingChecked = 0;

    async function mineLoop() {
      while (!cancelled) {
        while (!cancelled && miningPausedRef.current) {
          await new Promise((resolve) => window.setTimeout(resolve, 120));
        }
        if (cancelled) break;

        const batch = Math.max(1, hashRateRef.current);
        const startNonce = miningNonceRef.current;
        const result = await mineHashBatch({
          sessionId: session.id,
          startNonce,
          count: batch,
        });

        if (cancelled) break;

        // Not found: result.nonce is already the next nonce to try.
        // Found: result.nonce is the winning nonce; mining stops after submit.
        const nextNonce = result.found ? result.nonce + 1 : result.nonce;
        miningNonceRef.current = nextNonce;
        setMiningNonce(nextNonce);
        writeJson(NONCE_STORAGE_KEY, { sessionId: session.id, nonce: nextNonce });

        pendingChecked += result.checked;
        setHashesChecked((current) => current + result.checked);

        if (result.found) {
          try {
            const submitted = await submitWinningHash(session.id, {
              nonce: String(result.nonce),
              hash: result.hash,
            });
            if (cancelled) break;
            setSession(submitted.session);
            setAdventurer(decorateAccount(submitted.account));
            if (submitted.drip) {
              setDripMessage(
                `${submitted.drip.amount} $DERP is queued from the royalties pot.`
              );
            }
            await loadDungeonPreview(submitted.session.dungeon_seed);
          } catch (error) {
            if (!cancelled) {
              setRuntimeError(error?.message || 'The winning hash could not be verified.');
            }
          }
          break;
        }

        if (miningPausedRef.current) continue;

        if (pendingChecked >= 2000) {
          reportMiningProgress(session.id, pendingChecked).catch(() => {});
          pendingChecked = 0;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 16));
      }
    }

    mineLoop();
    return () => {
      cancelled = true;
    };
  }, [session?.id, session?.status, loadDungeonPreview]);

  const value = useMemo(
    () => ({
      adventurer,
      setAdventurer,
      session,
      setSession,
      party,
      hashesChecked,
      dungeonImageUrl,
      dripMessage,
      setDripMessage,
      runtimeError,
      setRuntimeError,
      adventureActive,
      miningPaused,
      setMiningPaused,
      hashRate: hashRateRef.current,
      beginAdventure,
      attachFoundState,
      endAdventure,
      clearActiveAdventure,
      stopAdventure,
      resumeAfterWalkAway,
      loadDungeonPreview,
    }),
    [
      adventurer,
      session,
      party,
      hashesChecked,
      dungeonImageUrl,
      dripMessage,
      runtimeError,
      adventureActive,
      miningPaused,
      beginAdventure,
      attachFoundState,
      endAdventure,
      clearActiveAdventure,
      stopAdventure,
      resumeAfterWalkAway,
      loadDungeonPreview,
    ]
  );

  return (
    <AdventureRuntimeContext.Provider value={value}>
      {children}
    </AdventureRuntimeContext.Provider>
  );
}

export function useAdventureRuntime() {
  const value = useContext(AdventureRuntimeContext);
  if (!value) {
    throw new Error('useAdventureRuntime must be used inside AdventureRuntimeProvider.');
  }
  return value;
}
