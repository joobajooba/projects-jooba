import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import collection from '../data/collection.json';
import { decorateAccount, emptyAdventurerAccount } from './adventurerProgress';
import {
  abandonAdventure,
  fetchAdventurerAccount,
  reportMiningProgress,
  setAdventureSessionAuth,
  submitWinningHash,
} from './adventuresApi';
import { hashesPerTickForParty, mineHashBatch, resolveImplingTier } from './hashMining';

const AdventureRuntimeContext = createContext(null);

const PARTY_STORAGE_KEY = 'implingz-active-adventure-parties';
const NONCE_STORAGE_KEY = 'implingz-active-adventure-nonces';
const COLLECTION_BY_ID = new Map(collection.map((impling) => [String(impling.id), impling]));

function readJson(key, fallback) {
  try {
    const local = window.localStorage.getItem(key);
    const session = window.sessionStorage.getItem(key);
    if (!local && !session) return fallback;
    return {
      ...(session ? JSON.parse(session) : {}),
      ...(local ? JSON.parse(local) : {}),
    };
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.sessionStorage.removeItem(key);
}

function migratePartyStore(raw) {
  if (!raw) return {};
  if (raw.sessionId && Array.isArray(raw.party)) {
    return { [raw.sessionId]: raw.party };
  }
  return raw;
}

function migrateNonceStore(raw) {
  if (!raw) return {};
  if (raw.sessionId) {
    return { [raw.sessionId]: Number(raw.nonce) || 0 };
  }
  return raw;
}

export function enrichPartyMember(member) {
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

export function partyFromTokenIds(tokenIds = []) {
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

function createRun(session, partyMembers = []) {
  return {
    session,
    party: (partyMembers ?? []).map(enrichPartyMember).filter(Boolean),
    hashesChecked: Number(session?.hashes_checked ?? 0),
    miningNonce: 0,
    dungeonImageUrl: session?.dungeon_seed
      ? `/api/dungeon-preview?seed=${encodeURIComponent(session.dungeon_seed)}&format=png`
      : '',
    miningPaused: false,
  };
}

function previewUrlForSeed(seed) {
  if (!seed) return '';
  return `/api/dungeon-preview?seed=${encodeURIComponent(seed)}&format=png`;
}

export function AdventureRuntimeProvider({ walletAccount, signMessageAsync, children }) {
  const [adventurer, setAdventurer] = useState(() => emptyAdventurerAccount());
  const [adventures, setAdventures] = useState([]);
  const [dripMessage, setDripMessage] = useState('');
  const [runtimeError, setRuntimeError] = useState('');
  const adventuresRef = useRef([]);
  const pausedIdsRef = useRef(new Set());
  const nonceMapRef = useRef({});

  adventuresRef.current = adventures;

  useEffect(() => {
    setAdventureSessionAuth({ walletAddress: walletAccount, signMessageAsync });
  }, [walletAccount, signMessageAsync]);

  const busyTokenIds = useMemo(() => {
    const ids = new Set();
    adventures.forEach((run) => {
      (run.party ?? []).forEach((member) => ids.add(String(member.id)));
      (run.session?.party_token_ids ?? []).forEach((id) => ids.add(String(id)));
    });
    return ids;
  }, [adventures]);

  const foundAdventure = useMemo(
    () => adventures.find((run) => run.session?.status === 'found') ?? null,
    [adventures]
  );

  const persistNonce = useCallback((sessionId, nonce) => {
    nonceMapRef.current = { ...nonceMapRef.current, [sessionId]: nonce };
    writeJson(NONCE_STORAGE_KEY, nonceMapRef.current);
  }, []);

  const persistParties = useCallback((nextAdventures) => {
    const parties = {};
    nextAdventures.forEach((run) => {
      if (run.session?.id) parties[run.session.id] = run.party;
    });
    writeJson(PARTY_STORAGE_KEY, parties);
  }, []);

  const updateRun = useCallback((sessionId, patch) => {
    setAdventures((current) => {
      const next = current.map((run) => {
        if (run.session?.id !== sessionId) return run;
        const updated = typeof patch === 'function' ? patch(run) : { ...run, ...patch };
        return updated;
      });
      persistParties(next);
      return next;
    });
  }, [persistParties]);

  const removeRun = useCallback((sessionId) => {
    setAdventures((current) => {
      const next = current.filter((run) => run.session?.id !== sessionId);
      persistParties(next);
      const nextNonces = { ...nonceMapRef.current };
      delete nextNonces[sessionId];
      nonceMapRef.current = nextNonces;
      writeJson(NONCE_STORAGE_KEY, nextNonces);
      pausedIdsRef.current.delete(sessionId);
      return next;
    });
  }, [persistParties]);

  const clearActiveAdventure = useCallback(() => {
    setAdventures([]);
    setDripMessage('');
    pausedIdsRef.current = new Set();
    nonceMapRef.current = {};
    window.localStorage.removeItem(PARTY_STORAGE_KEY);
    window.localStorage.removeItem(NONCE_STORAGE_KEY);
    window.sessionStorage.removeItem(PARTY_STORAGE_KEY);
    window.sessionStorage.removeItem(NONCE_STORAGE_KEY);
  }, []);

  const setMiningPaused = useCallback((sessionId, paused) => {
    if (!sessionId) return;
    if (paused) pausedIdsRef.current.add(sessionId);
    else pausedIdsRef.current.delete(sessionId);
    updateRun(sessionId, { miningPaused: Boolean(paused) });
  }, [updateRun]);

  const beginAdventure = useCallback(
    ({ account, session: nextSession, partyMembers }) => {
      const run = createRun(nextSession, partyMembers);
      setAdventurer(decorateAccount(account));
      setRuntimeError('');
      setAdventures((current) => {
        const without = current.filter((row) => row.session?.id !== nextSession.id);
        const next = [...without, run];
        persistParties(next);
        return next;
      });
      persistNonce(nextSession.id, 0);
    },
    [persistNonce, persistParties]
  );

  const stopAdventure = useCallback(async (sessionId) => {
    const targetId = sessionId || adventuresRef.current[0]?.session?.id;
    if (!targetId) return { ok: true };
    const run = adventuresRef.current.find((row) => row.session?.id === targetId);
    if (!run || !['running', 'found'].includes(run.session.status)) {
      removeRun(targetId);
      return { ok: true };
    }
    const data = await abandonAdventure(targetId);
    setAdventurer(decorateAccount(data.account));
    removeRun(targetId);
    return data;
  }, [removeRun]);

  const resumeAfterWalkAway = useCallback(
    ({ account, session: nextSession, nextNonce }) => {
      const nonce = Math.max(0, Number(nextNonce) || 0);
      setAdventurer(decorateAccount(account));
      persistNonce(nextSession.id, nonce);
      updateRun(nextSession.id, (run) => ({
        ...run,
        session: nextSession,
        miningNonce: nonce,
        dungeonImageUrl: '',
        miningPaused: false,
      }));
      pausedIdsRef.current.delete(nextSession.id);
    },
    [persistNonce, updateRun]
  );

  const replaceSession = useCallback(
    ({ account, session: nextSession, drip, hashesChecked }) => {
      if (account) setAdventurer(decorateAccount(account));
      if (drip) {
        setDripMessage(`${drip.amount} $DERP is queued from the royalties pot.`);
      }
      if (!nextSession) return;
      if (!['running', 'found'].includes(nextSession.status)) {
        removeRun(nextSession.id);
        return;
      }
      updateRun(nextSession.id, (run) => ({
        ...run,
        session: nextSession,
        hashesChecked: Number(hashesChecked ?? run.hashesChecked),
        dungeonImageUrl: previewUrlForSeed(nextSession.dungeon_seed) || run.dungeonImageUrl,
      }));
    },
    [removeRun, updateRun]
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
        const active = (data.sessions ?? []).filter(
          (row) => row.status === 'running' || row.status === 'found'
        );
        if (!active.length) {
          clearActiveAdventure();
          return;
        }

        const storedParties = migratePartyStore(readJson(PARTY_STORAGE_KEY, {}));
        const storedNonces = migrateNonceStore(readJson(NONCE_STORAGE_KEY, {}));
        nonceMapRef.current = storedNonces;

        const restored = active.map((session) => {
          const storedParty = storedParties?.[session.id];
          const party = Array.isArray(storedParty)
            ? storedParty.map(enrichPartyMember)
            : partyFromTokenIds(session.party_token_ids ?? []);
          const nonce = Number(storedNonces?.[session.id]) || 0;
          return {
            ...createRun(session, party),
            miningNonce: nonce,
          };
        });

        setAdventures(restored);
        persistParties(restored);
        writeJson(NONCE_STORAGE_KEY, storedNonces);
      })
      .catch(() => {
        setAdventurer(emptyAdventurerAccount(walletAccount.toLowerCase()));
      });

    return () => controller.abort();
  }, [walletAccount, clearActiveAdventure, persistParties]);

  const runningKey = adventures
    .filter((run) => run.session?.status === 'running')
    .map((run) => run.session.id)
    .join('|');

  useEffect(() => {
    const runningIds = runningKey ? runningKey.split('|') : [];
    if (!runningIds.length) return undefined;

    let cancelled = false;

    runningIds.forEach((sessionId) => {
      let pendingChecked = 0;

      async function mineLoop() {
        while (!cancelled) {
          while (!cancelled && pausedIdsRef.current.has(sessionId)) {
            await new Promise((resolve) => window.setTimeout(resolve, 120));
          }
          if (cancelled) break;

          const run = adventuresRef.current.find((row) => row.session?.id === sessionId);
          if (!run || run.session.status !== 'running') break;

          const batch = Math.max(1, hashesPerTickForParty(run.party));
          const startNonce = nonceMapRef.current[sessionId] ?? run.miningNonce ?? 0;
          const result = await mineHashBatch({
            sessionId,
            startNonce,
            count: batch,
          });

          if (cancelled) break;

          const nextNonce = result.found ? result.nonce + 1 : result.nonce;
          persistNonce(sessionId, nextNonce);
          pendingChecked += result.checked;
          updateRun(sessionId, (current) => ({
            ...current,
            miningNonce: nextNonce,
            hashesChecked: current.hashesChecked + result.checked,
          }));

          if (result.found) {
            try {
              const submitted = await submitWinningHash(sessionId, {
                nonce: String(result.nonce),
                hash: result.hash,
              });
              if (cancelled) break;
              setAdventurer(decorateAccount(submitted.account));
              if (submitted.drip) {
                setDripMessage(
                  `${submitted.drip.amount} $DERP is queued from the royalties pot.`
                );
              }
              updateRun(sessionId, (current) => ({
                ...current,
                session: submitted.session,
                dungeonImageUrl: previewUrlForSeed(submitted.session.dungeon_seed),
              }));
            } catch (error) {
              if (!cancelled) {
                setRuntimeError(error?.message || 'The winning hash could not be verified.');
              }
            }
            break;
          }

          if (pausedIdsRef.current.has(sessionId)) continue;

          if (pendingChecked >= 2000) {
            reportMiningProgress(sessionId, pendingChecked).catch(() => {});
            pendingChecked = 0;
          }

          await new Promise((resolve) => window.setTimeout(resolve, 16));
        }
      }

      mineLoop();
    });

    return () => {
      cancelled = true;
    };
  }, [runningKey, persistNonce, updateRun]);

  const value = useMemo(
    () => ({
      adventurer,
      setAdventurer,
      adventures,
      foundAdventure,
      busyTokenIds,
      dripMessage,
      setDripMessage,
      runtimeError,
      setRuntimeError,
      adventureActive: adventures.length > 0,
      setMiningPaused,
      beginAdventure,
      stopAdventure,
      resumeAfterWalkAway,
      replaceSession,
      removeRun,
      clearActiveAdventure,
    }),
    [
      adventurer,
      adventures,
      foundAdventure,
      busyTokenIds,
      dripMessage,
      runtimeError,
      setMiningPaused,
      beginAdventure,
      stopAdventure,
      resumeAfterWalkAway,
      replaceSession,
      removeRun,
      clearActiveAdventure,
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
