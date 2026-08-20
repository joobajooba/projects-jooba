import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { usePublicClient, useSignMessage, useWalletClient } from 'wagmi';
import collection from '../data/collection.json';
import { derpTreasureChatMessage, dripStatusMessage, useAdventureRuntime } from '../lib/adventureRuntime';
import { useAdventuresServerAccess } from '../lib/adventuresAccess';
import { decorateAccount, XP_DUNGEON_DISCARDED, XP_DUNGEON_FOUND, XP_DUNGEON_MINTED } from '../lib/adventurerProgress';
import {
  buildAdventureStartMessage,
  discardFoundDungeon,
  fetchAdventureBoard,
  markDungeonMinted,
  requestAdventureChallenge,
  requestDungeonMint,
  resolveAdventurePrompt,
  startAdventureSession,
} from '../lib/adventuresApi';
import { fetchCommunityProfiles } from '../lib/communityProfiles';
import {
  hashesPerTickForParty,
  resolveImplingTier,
  TIER_HASH_RATES,
} from '../lib/hashMining';
import {
  DUNGEON_KEEP_ABI,
  DUNGEON_KEEP_ADDRESS,
  keepOpenSeaCollectionUrl,
  keepOpenSeaItemUrl,
  keepPreviewUrl,
  tokenIdFromMintReceipt,
} from '../lib/dungeonKeep';
import { ADVENTURE_ENCOUNTERS } from '../lib/adventureEncounters';
import { AdventureInformation } from '../lib/adventureInformation';

const IMPLINGZ_CONTRACT = '0x81d2d1f0e92285cdd22aa3cbc6956b6e1724d029';
const OWNER_OF_SELECTOR = '0x6352211e';
const COLLECTION_BY_ID = new Map(collection.map((impling) => [String(impling.id), impling]));

const ADVENTURE_VIEWS = [
  { id: 'information', label: 'Information' },
  { id: 'start', label: 'Start Adventure' },
  { id: 'board', label: 'Adventure Board' },
];

const DND_ENCOUNTERS = ADVENTURE_ENCOUNTERS;

const IDLE_NARRATIONS = [
  'Wind moves through the black pines, carrying the smell of rain and old stone.',
  'Your torchlight catches distant eyes before they vanish into the undergrowth.',
  'The path narrows between moss-covered ruins that predate every map you carry.',
  'Somewhere beneath your feet, water echoes through a buried chamber.',
  'Your Impz pause as a flock of pale birds erupts from the canopy ahead.',
  'A cold mist rolls across the trail and curls around the party’s boots.',
  'Faded carvings along the roadside point toward a kingdom erased from memory.',
  'The wilds fall silent for a moment, as though something nearby is listening.',
  'Loose stones tumble down a distant slope, but no traveller appears.',
  'Moonlight breaks through the clouds and reveals old tracks crossing your path.',
];

const IMPLING_IDLE_QUOTES = [
  'Roll first. Panic later.',
  'I definitely checked for traps.',
  'If it bites, we bite back.',
  'That chest looks mostly safe.',
  'I call dibs on shiny loot.',
  'My plan only has one flaw.',
  'Stealth is just quiet screaming.',
  'Feeling lucky. Probably.',
  'Ask the goblin nicely? Boring.',
  'Keep up, tall one.',
  'I packed snacks and bad ideas.',
  'Nat 20 energy today.',
];

const ADVENTURE_LIVES = 3;
const LIVES_STORAGE_KEY = 'implingz-adventure-lives';

function readLivesStore() {
  try {
    return JSON.parse(window.localStorage.getItem(LIVES_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeStoredLives(sessionId, remaining) {
  if (!sessionId) return;
  const store = readLivesStore();
  store[sessionId] = remaining;
  window.localStorage.setItem(LIVES_STORAGE_KEY, JSON.stringify(store));
}

function clearStoredLives(sessionId) {
  if (!sessionId) return;
  const store = readLivesStore();
  delete store[sessionId];
  window.localStorage.setItem(LIVES_STORAGE_KEY, JSON.stringify(store));
}

function livesFromSession(session) {
  const server = Number(session?.lives);
  const stored = session?.id ? Number(readLivesStore()[session.id]) : NaN;
  const candidates = [server, stored].filter((value) => Number.isFinite(value) && value >= 0);
  if (!candidates.length) return ADVENTURE_LIVES;
  return Math.min(ADVENTURE_LIVES, ...candidates);
}

const ENCOUNTER_DELAY_MIN = 60_000;
const ENCOUNTER_DELAY_MAX = 180_000;
const IDLE_DELAY_MIN = 18_000;
const IDLE_DELAY_MAX = 24_000;
const IMP_SPEECH_DELAY_MIN = 10_000;
const IMP_SPEECH_DELAY_MAX = 30_000;
const IMP_SPEECH_THINKING_DELAY = 5_000;

function randomDelay(minimum, maximum) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function randomIndex(length, excludedIndex = null) {
  if (length <= 1) return 0;

  let index = Math.floor(Math.random() * length);
  while (index === excludedIndex) {
    index = Math.floor(Math.random() * length);
  }
  return index;
}

function getInitialImplingQuoteIndex(tokenId, slotIndex) {
  return (Number(tokenId) + slotIndex * 3) % IMPLING_IDLE_QUOTES.length;
}

function getUniqueQuoteIndex(excludedIndexes, preferredIndex = null) {
  const availableIndexes = IMPLING_IDLE_QUOTES.map((_, index) => index).filter(
    (index) => !excludedIndexes.has(index)
  );

  if (preferredIndex !== null && availableIndexes.includes(preferredIndex)) {
    return preferredIndex;
  }

  return availableIndexes[Math.floor(Math.random() * availableIndexes.length)];
}

function normalizeImageUrl(imageUrl) {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('ipfs://')) {
    return `https://dweb.link/ipfs/${imageUrl.slice('ipfs://'.length)}`;
  }
  return imageUrl;
}

async function fetchOwnedImplingz(walletAccount) {
  const response = await fetch(`/api/implingz?owner=${encodeURIComponent(walletAccount)}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Could not load IMPLINGz.');
  }

  const uniqueInstances = new Map();

  (data.items ?? []).forEach((instance) => {
    const tokenId = String(instance.id);
    const localImpling = COLLECTION_BY_ID.get(tokenId);

    uniqueInstances.set(tokenId, {
      id: tokenId,
      name: localImpling?.name ?? instance.metadata?.name ?? `IMPLINGZ #${tokenId}`,
      image:
        localImpling?.image ??
        normalizeImageUrl(instance.image_url || instance.metadata?.image || ''),
      tier:
        resolveImplingTier(localImpling) ||
        resolveImplingTier({
          attributes: instance.metadata?.attributes,
          tier: instance.metadata?.attributes?.Tier,
        }) ||
        'Tier 1',
      attributes: localImpling?.attributes ?? instance.metadata?.attributes,
    });
  });

  return [...uniqueInstances.values()].sort((a, b) => Number(a.id) - Number(b.id));
}

async function verifyImplingOwnership(publicClient, walletAccount, tokenId) {
  const encodedTokenId = BigInt(tokenId).toString(16).padStart(64, '0');
  const { data } = await publicClient.call({
    to: IMPLINGZ_CONTRACT,
    data: `${OWNER_OF_SELECTOR}${encodedTokenId}`,
  });

  if (!data) throw new Error('The IMPLINGZ contract did not return an owner.');

  const owner = `0x${data.slice(-40)}`.toLowerCase();
  return owner === walletAccount.toLowerCase();
}

function AdventureSlot({
  slotIndex = 0,
  run = null,
  busyTokenIds = new Set(),
  collapsed = false,
  onToggleCollapse,
  showStackHeader = false,
}) {
  const { walletAccount, walletName } = useOutletContext();
  const publicClient = usePublicClient({ chainId: 4663 });
  const { data: walletClient } = useWalletClient({ chainId: 4663 });
  const { signMessageAsync } = useSignMessage();
  const {
    adventurer,
    setAdventurer,
    setDripMessage,
    runtimeError,
    setRuntimeError,
    setMiningPaused,
    beginAdventure,
    stopAdventure,
    resumeAfterWalkAway,
    replaceSession,
    refreshSessionFromServer,
    removeRun,
  } = useAdventureRuntime();

  const session = run?.session ?? null;
  const party = run?.party ?? [];
  const hashesChecked = run?.hashesChecked ?? 0;
  const dungeonImageUrl = run?.dungeonImageUrl ?? '';
  const lastDrip = run?.lastDrip ?? null;

  const [selectedImplingz, setSelectedImplingz] = useState([null, null, null]);
  const [selectingSlot, setSelectingSlot] = useState(null);
  const [ownedImplingz, setOwnedImplingz] = useState([]);
  const [implingzLoading, setImplingzLoading] = useState(false);
  const [implingzError, setImplingzError] = useState('');
  const [verifyingTokenId, setVerifyingTokenId] = useState('');
  const [adventureMessages, setAdventureMessages] = useState([]);
  const [encounterIndex, setEncounterIndex] = useState(null);
  const [startError, setStartError] = useState('');
  const [starting, setStarting] = useState(false);
  const [resolvingChoice, setResolvingChoice] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [mintStatus, setMintStatus] = useState('');
  const [mintedKeepUrl, setMintedKeepUrl] = useState('');
  const [mintedCollectionUrl, setMintedCollectionUrl] = useState('');
  const [lives, setLives] = useState(() => livesFromSession(session));
  const [viewKeepOpen, setViewKeepOpen] = useState(false);
  const [keepMetadata, setKeepMetadata] = useState(null);
  const [nextKeepTokenId, setNextKeepTokenId] = useState(null);
  const [impSpeechStates, setImpSpeechStates] = useState([
    { quoteIndex: null, thinking: false },
    { quoteIndex: null, thinking: false },
    { quoteIndex: null, thinking: false },
  ]);
  const chatEndRef = useRef(null);
  const nextEncounterTimerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const lastIdleNarrationRef = useRef(null);
  const resumedSessionRef = useRef('');
  const usedEncounterIndexesRef = useRef(new Set());
  const impSpeechTimersRef = useRef([
    { wait: null, change: null },
    { wait: null, change: null },
    { wait: null, change: null },
  ]);
  const connectedAddress = walletAccount
    ? `${walletAccount.slice(0, 6)}…${walletAccount.slice(-4)}`
    : '';
  const selectedParty = selectedImplingz.filter(Boolean);
  const activeParty = party.length ? party : selectedParty;
  const partyHashRate = hashesPerTickForParty(activeParty);
  const adventureStarted = Boolean(session);
  const currentEncounter = encounterIndex === null ? null : DND_ENCOUNTERS[encounterIndex];
  const combinedError = startError || (slotIndex === 0 ? runtimeError : '');
  const adventureLabel = `Adventure ${slotIndex + 1}`;
  const partyNames = activeParty.map((impling) => `#${impling.id}`).join(', ');

  useEffect(() => {
    if (!session?.id) return;
    setMiningPaused(session.id, Boolean(currentEncounter) && session.status === 'running');
  }, [currentEncounter, session?.id, session?.status, setMiningPaused]);

  useEffect(() => {
    clearAdventureTimers();
    setSelectedImplingz([null, null, null]);
    setOwnedImplingz([]);
    setSelectingSlot(null);
    setImplingzError('');
    setAdventureMessages([]);
    setEncounterIndex(null);
    setLives(livesFromSession(session));
    setStartError('');
    setMintStatus('');
    setMintedKeepUrl('');
    setViewKeepOpen(false);
    setKeepMetadata(null);
    resumedSessionRef.current = '';
    usedEncounterIndexesRef.current = new Set();
    if (session?.id) setMiningPaused(session.id, false);
  }, [walletAccount, session?.id, setMiningPaused]);

  useEffect(() => {
    if (!session?.id || !party.length) return;
    const nextSlots = [null, null, null];
    party.slice(0, 3).forEach((impling, index) => {
      nextSlots[index] = impling;
    });
    setSelectedImplingz(nextSlots);
  }, [session?.id, party]);

  useEffect(() => {
    if (!adventureStarted || !session?.id) return;
    if (resumedSessionRef.current === session.id) return;
    resumedSessionRef.current = session.id;
    usedEncounterIndexesRef.current = new Set();

    setAdventureMessages([
      {
        type: 'system',
        text:
          session.status === 'found'
            ? `${adventureLabel} already uncovered a keep. View the dungeon, mint it, or flee.`
            : `${adventureLabel} still running${partyNames ? ` with IMPLINGz ${partyNames}` : ''}. Mining continues while you browse other pages.`,
      },
    ]);
    setEncounterIndex(null);
    setLives(livesFromSession(session));
    if (session.status === 'running') {
      scheduleNextEncounter();
    }
  }, [adventureStarted, session?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [adventureMessages, encounterIndex]);

  useEffect(() => {
    const treasure = derpTreasureChatMessage(lastDrip);
    if (!treasure) return;
    setAdventureMessages((messages) => {
      if (messages.some((message) => message.type === 'derp' && message.dripId === treasure.dripId)) {
        return messages;
      }
      return [...messages, treasure];
    });
  }, [lastDrip]);

  useEffect(() => {
    if (!adventureStarted || encounterIndex !== null || session?.status !== 'running') {
      return undefined;
    }

    function scheduleIdleNarration() {
      idleTimerRef.current = window.setTimeout(() => {
        const narrationIndex = randomIndex(
          IDLE_NARRATIONS.length,
          lastIdleNarrationRef.current
        );
        lastIdleNarrationRef.current = narrationIndex;
        setAdventureMessages((messages) => [
          ...messages,
          {
            type: 'idle',
            text: IDLE_NARRATIONS[narrationIndex],
          },
        ]);
        scheduleIdleNarration();
      }, randomDelay(IDLE_DELAY_MIN, IDLE_DELAY_MAX));
    }

    scheduleIdleNarration();

    return () => {
      window.clearTimeout(idleTimerRef.current);
    };
  }, [adventureStarted, encounterIndex, session?.status]);

  useEffect(() => {
    clearImpSpeechTimers();
    const usedQuoteIndexes = new Set();
    const initialSpeechStates = selectedImplingz.map((impling, slotIndex) => {
      if (!impling) return { quoteIndex: null, thinking: false };

      const quoteIndex = getUniqueQuoteIndex(
        usedQuoteIndexes,
        getInitialImplingQuoteIndex(impling.id, slotIndex)
      );
      usedQuoteIndexes.add(quoteIndex);

      return { quoteIndex, thinking: false };
    });
    setImpSpeechStates(initialSpeechStates);

    selectedImplingz.forEach((impling, slotIndex) => {
      if (impling) scheduleImpSpeechChange(slotIndex);
    });

    return clearImpSpeechTimers;
  }, [selectedImplingz]);

  useEffect(
    () => () => {
      clearAdventureTimers();
    },
    []
  );

  useEffect(() => {
    if (session?.status === 'found') {
      setEncounterIndex(null);
      setAdventureMessages((messages) => {
        if (messages.some((message) => message.text?.includes('uncovered a lost keep'))) {
          return messages;
        }
        return [
          ...messages,
          {
            type: 'system',
            text: `${adventureLabel} uncovered a lost keep. Choose to view the dungeon, mint it, or flee.`,
          },
          {
            type: 'xp',
            text: `+${XP_DUNGEON_FOUND} XP`,
          },
        ];
      });
      return;
    }
    setViewKeepOpen(false);
  }, [session?.status]);

  useEffect(() => {
    if (!viewKeepOpen || !publicClient || !DUNGEON_KEEP_ADDRESS) {
      if (!viewKeepOpen) setNextKeepTokenId(null);
      return undefined;
    }

    let cancelled = false;
    publicClient
      .readContract({
        address: DUNGEON_KEEP_ADDRESS,
        abi: DUNGEON_KEEP_ABI,
        functionName: 'totalSupply',
      })
      .then((supply) => {
        if (!cancelled) setNextKeepTokenId(Number(supply) + 1);
      })
      .catch(() => {
        if (!cancelled) setNextKeepTokenId(null);
      });

    return () => {
      cancelled = true;
    };
  }, [viewKeepOpen, publicClient, session?.dungeon_seed]);

  useEffect(() => {
    if (!viewKeepOpen || !session?.dungeon_seed) {
      setKeepMetadata(null);
      return undefined;
    }

    const controller = new AbortController();
    fetch(keepPreviewUrl(session.dungeon_seed, { format: 'json', tokenId: nextKeepTokenId }), {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        setKeepMetadata(data || { attributes: [] });
      })
      .catch(() => {
        setKeepMetadata({ attributes: [] });
      });

    return () => controller.abort();
  }, [viewKeepOpen, session?.dungeon_seed, nextKeepTokenId]);

  async function openImplingSelector(slotIndexToOpen) {
    if (!walletAccount || adventureStarted) return;

    setSelectingSlot(slotIndexToOpen);
    setImplingzLoading(true);
    setImplingzError('');

    try {
      setOwnedImplingz(await fetchOwnedImplingz(walletAccount));
    } catch (error) {
      setImplingzError(error?.message || 'Could not load your IMPLINGz.');
    } finally {
      setImplingzLoading(false);
    }
  }

  async function selectImpling(impling) {
    if (!publicClient || selectingSlot === null) return;

    setVerifyingTokenId(impling.id);
    setImplingzError('');

    try {
      const stillOwned = await verifyImplingOwnership(
        publicClient,
        walletAccount,
        impling.id
      );

      if (!stillOwned) {
        throw new Error(`IMPLINGZ #${impling.id} is no longer held by this wallet.`);
      }

      const tier = resolveImplingTier(impling) || 'Tier 1';
      const selected = { ...impling, tier };

      setSelectedImplingz((current) =>
        current.map((entry, index) => (index === selectingSlot ? selected : entry))
      );
      setImpSpeechStates((states) => {
        const usedQuoteIndexes = new Set(
          states
            .filter((_, index) => index !== selectingSlot)
            .map((state) => state.quoteIndex)
            .filter((quoteIndex) => quoteIndex !== null)
        );
        const quoteIndex = getUniqueQuoteIndex(
          usedQuoteIndexes,
          getInitialImplingQuoteIndex(impling.id, selectingSlot)
        );

        return states.map((state, index) =>
          index === selectingSlot ? { quoteIndex, thinking: false } : state
        );
      });
      setSelectingSlot(null);
    } catch (error) {
      setImplingzError(error?.message || 'Could not verify ownership of this IMPLINGZ.');
    } finally {
      setVerifyingTokenId('');
    }
  }

  function clearSelectingSlot() {
    if (selectingSlot === null) return;
    setSelectedImplingz((current) =>
      current.map((selected, index) => (index === selectingSlot ? null : selected))
    );
    setImpSpeechStates((states) =>
      states.map((state, index) =>
        index === selectingSlot ? { quoteIndex: null, thinking: false } : state
      )
    );
    setSelectingSlot(null);
  }

  function clearAdventureTimers() {
    window.clearTimeout(nextEncounterTimerRef.current);
    window.clearTimeout(idleTimerRef.current);
  }

  function clearImpSpeechTimers() {
    impSpeechTimersRef.current.forEach((timers) => {
      window.clearTimeout(timers.wait);
      window.clearTimeout(timers.change);
    });
  }

  function scheduleImpSpeechChange(slotIndex) {
    const timers = impSpeechTimersRef.current[slotIndex];

    timers.wait = window.setTimeout(() => {
      setImpSpeechStates((states) =>
        states.map((state, index) =>
          index === slotIndex ? { ...state, thinking: true } : state
        )
      );

      timers.change = window.setTimeout(() => {
        setImpSpeechStates((states) => {
          const excludedQuoteIndexes = new Set(
            states
              .filter((_, index) => index !== slotIndex)
              .map((state) => state.quoteIndex)
              .filter((quoteIndex) => quoteIndex !== null)
          );
          excludedQuoteIndexes.add(states[slotIndex].quoteIndex);
          const nextQuoteIndex = getUniqueQuoteIndex(excludedQuoteIndexes);

          return states.map((state, index) =>
            index === slotIndex
              ? {
                  quoteIndex: nextQuoteIndex,
                  thinking: false,
                }
              : state
          );
        });
        scheduleImpSpeechChange(slotIndex);
      }, IMP_SPEECH_THINKING_DELAY);
    }, randomDelay(IMP_SPEECH_DELAY_MIN, IMP_SPEECH_DELAY_MAX));
  }

  function pickUnusedEncounterIndex(excludedIndex = null) {
    const used = usedEncounterIndexesRef.current;
    const available = DND_ENCOUNTERS.map((_, index) => index).filter(
      (index) => index !== excludedIndex && !used.has(index)
    );
    const pool =
      available.length > 0
        ? available
        : DND_ENCOUNTERS.map((_, index) => index).filter((index) => index !== excludedIndex);
    if (available.length === 0) {
      used.clear();
      if (excludedIndex !== null) used.add(excludedIndex);
    }
    const nextIndex = pool[Math.floor(Math.random() * pool.length)];
    used.add(nextIndex);
    return nextIndex;
  }

  function scheduleNextEncounter(excludedIndex = null) {
    window.clearTimeout(nextEncounterTimerRef.current);
    setEncounterIndex(null);

    nextEncounterTimerRef.current = window.setTimeout(() => {
      const nextIndex = pickUnusedEncounterIndex(excludedIndex);
      setEncounterIndex(nextIndex);
      setAdventureMessages((messages) => [
        ...messages,
        {
          type: 'encounter',
          text: DND_ENCOUNTERS[nextIndex].prompt,
        },
      ]);
    }, randomDelay(ENCOUNTER_DELAY_MIN, ENCOUNTER_DELAY_MAX));
  }

  async function startAdventure() {
    if (selectedParty.length === 0 || !walletAccount || starting || adventureStarted) return;
    if (adventurer.active_adventures >= adventurer.slots) return;
    if (selectedParty.some((impling) => busyTokenIds.has(String(impling.id)))) {
      setStartError('That IMPLINGZ is already on another adventure.');
      return;
    }

    setStarting(true);
    setStartError('');
    setRuntimeError('');
    setDripMessage('');
    setMintStatus('');
    setMintedKeepUrl('');

    try {
      const enrichedParty = selectedParty.map((impling) => ({
        ...impling,
        tier: resolveImplingTier(impling) || 'Tier 1',
      }));
      const partyTokenIds = enrichedParty.map((impling) => String(impling.id));
      const { nonce } = await requestAdventureChallenge(walletAccount);
      const signature = await signMessageAsync({
        message: buildAdventureStartMessage({
          walletAddress: walletAccount,
          partyTokenIds,
          nonce,
        }),
      });
      const data = await startAdventureSession({
        walletAddress: walletAccount,
        partyTokenIds,
        nonce,
        signature,
      });

      const partyNames = enrichedParty.map((impling) => `#${impling.id}`).join(', ');
      beginAdventure({
        account: data.account,
        session: data.session,
        partyMembers: enrichedParty,
      });
      resumedSessionRef.current = data.session.id;
      usedEncounterIndexesRef.current = new Set();
      setEncounterIndex(null);
      setLives(ADVENTURE_LIVES);
      writeStoredLives(data.session.id, ADVENTURE_LIVES);
      setAdventureMessages([
        {
          type: 'narrator',
          text: `${adventureLabel} for the lost dungeons has commenced.`,
        },
        {
          type: 'system',
          text: `IMPLINGZ ${partyNames} enter the wilds at ${hashesPerTickForParty(enrichedParty)} hashes/tick. Mining keeps running if you leave this page.`,
        },
      ]);
      scheduleNextEncounter();
    } catch (error) {
      setStartError(error?.shortMessage || error?.message || 'Could not start the adventure.');
    } finally {
      setStarting(false);
    }
  }

  async function handleStopAdventure() {
    if (!adventureStarted || stopping || !session?.id) return;
    setStopping(true);
    setStartError('');
    try {
      await stopAdventure(session.id);
      clearAdventureTimers();
      setEncounterIndex(null);
      setLives(ADVENTURE_LIVES);
      clearStoredLives(session.id);
      setAdventureMessages([]);
      setMintStatus(`${adventureLabel} stopped. Mining ended and the slot is free again.`);
      resumedSessionRef.current = '';
    } catch (error) {
      setStartError(error?.message || 'Could not stop the adventure.');
    } finally {
      setStopping(false);
    }
  }

  async function chooseAdventureOption(option) {
    if (!adventureStarted || encounterIndex === null || !session?.id || resolvingChoice) return;

    const completedEncounterIndex = encounterIndex;
    setResolvingChoice(true);
    setStartError('');
    try {
      const result = await resolveAdventurePrompt(session.id, {
        encounterIndex,
        optionKey: option.key,
      });
      const rollResult = result.succeeded ? 'Success' : 'Failure';
      const remainingLives = Math.max(
        0,
        Number(result.lives ?? (result.succeeded ? lives : lives - 1))
      );
      const defeated =
        Boolean(result.defeated) ||
        remainingLives <= 0 ||
        result.session?.status === 'abandoned';
      setLives(defeated ? 0 : remainingLives);
      if (session?.id) {
        writeStoredLives(session.id, defeated ? 0 : remainingLives);
      }
      setAdventurer(decorateAccount(result.account));
      if (result.session && !defeated) {
        replaceSession({
          account: result.account,
          session: result.session,
          drip: result.drip,
        });
      } else if (result.drip) {
        setDripMessage(dripStatusMessage(result.drip));
      }
      const treasure = derpTreasureChatMessage(result.drip);
      setAdventureMessages((messages) => [
        ...messages,
        {
          type: 'choice',
          text: `${option.key} | ${option.label}`,
        },
        {
          type: result.succeeded ? 'roll-success' : 'roll-failure',
          text: `You rolled ${result.roll} on the D20 against DC ${result.dc} — ${rollResult}.`,
        },
        ...(result.succeeded
          ? []
          : [
              {
                type: 'system',
                text: defeated
                  ? 'You lost your last life. The adventure is over — start again.'
                  : `You lost a life. ${remainingLives} ${
                      remainingLives === 1 ? 'life' : 'lives'
                    } remaining.`,
              },
            ]),
        ...(Number(result.xpAwarded) > 0
          ? [{ type: 'xp', text: `+${result.xpAwarded} XP` }]
          : []),
        {
          type: 'narrator',
          text: result.succeeded ? option.success : option.failure,
        },
        ...(treasure ? [treasure] : []),
      ]);
      if (defeated) {
        setRuntimeError('You lost all 3 lives. The adventure has ended. Start again.');
        clearAdventureTimers();
        setEncounterIndex(null);
        if (result.session && !['running', 'found'].includes(result.session.status)) {
          clearStoredLives(session.id);
          removeRun(session.id);
        } else {
          await stopAdventure(session.id);
          clearStoredLives(session.id);
        }
        return;
      }
      if (result.session?.status === 'found') {
        setEncounterIndex(null);
      } else {
        scheduleNextEncounter(completedEncounterIndex);
      }
    } catch (error) {
      try {
        const latest = await refreshSessionFromServer(session.id);
        if (latest?.status === 'found') {
          setEncounterIndex(null);
          setStartError('');
          return;
        }
        if (!latest) {
          setEncounterIndex(null);
          setStartError('This adventure is no longer exploring.');
          return;
        }
      } catch {
        // Keep the original choice error if the session cannot be refreshed.
      }
      setStartError(error?.message || 'The encounter could not be resolved.');
    } finally {
      setResolvingChoice(false);
    }
  }

  function viewFoundDungeon() {
    setViewKeepOpen(true);
    setAdventureMessages((messages) => {
      if (messages.at(-1)?.text === 'A | View dungeon') return messages;
      return [
        ...messages,
        {
          type: 'choice',
          text: 'A | View dungeon',
        },
      ];
    });
  }

  async function handleDiscardDungeon() {
    if (!session?.id) return;
    setStartError('');
    try {
      const nextNonce = Number(session.winning_nonce ?? 0) + 1;
      const data = await discardFoundDungeon(session.id);
      resumeAfterWalkAway({
        account: data.account,
        session: data.session,
        nextNonce: Number(data.nextNonce ?? nextNonce),
      });
      setViewKeepOpen(false);
      setMintStatus('');
      setAdventureMessages((messages) => [
        ...messages,
        {
          type: 'system',
          text: 'You fled. The preview is gone and uses no supply slot. Mining continues.',
        },
        ...(Number(data.xpAwarded ?? XP_DUNGEON_DISCARDED) > 0
          ? [{ type: 'xp', text: `+${data.xpAwarded ?? XP_DUNGEON_DISCARDED} XP` }]
          : []),
      ]);
      if (encounterIndex === null) {
        scheduleNextEncounter();
      }
    } catch (error) {
      setStartError(error?.message || 'Could not discard this dungeon.');
    }
  }

  async function handleMintDungeon() {
    if (!session?.id) return;
    setMintStatus('Preparing mint voucher…');
    try {
      const data = await requestDungeonMint(session.id);
      const contractAddress =
        data.contractAddress || DUNGEON_KEEP_ADDRESS || '';

      if (!contractAddress || !data.signature || !walletClient) {
        setMintStatus(
          'Keep found. The free-mint contract is not live yet, so this preview is held on your session until minting opens. Gas will be ETH.'
        );
        return;
      }

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: DUNGEON_KEEP_ABI,
        functionName: 'mint',
        args: [BigInt(data.voucher.seed), BigInt(data.voucher.deadline), data.signature],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const tokenId = tokenIdFromMintReceipt(receipt);
      if (tokenId) {
        const minted = await markDungeonMinted(session.id, tokenId);
        const openSeaUrl =
          minted.openSeaItemUrl || keepOpenSeaItemUrl(contractAddress, tokenId);
        const collectionUrl =
          minted.openSeaCollectionUrl || keepOpenSeaCollectionUrl(contractAddress);
        replaceSession({ account: minted.account, session: minted.session });
        removeRun(session.id);
        setViewKeepOpen(false);
        setMintedKeepUrl(openSeaUrl);
        setMintedCollectionUrl(collectionUrl);
        setMintStatus('');
        setAdventureMessages((messages) => [
          ...messages,
          {
            type: 'mint',
            text: `Keep #${tokenId} minted. OpenSea will add it to Imp Keeps.`,
          },
          {
            type: 'xp',
            text: `+${XP_DUNGEON_MINTED} XP`,
          },
        ]);
      } else {
        setMintStatus(`Mint submitted. Transaction ${hash.slice(0, 10)}…`);
        setViewKeepOpen(false);
        removeRun(session.id);
        setAdventureMessages((messages) => [
          ...messages,
          {
            type: 'mint',
            text: `Mint submitted. Transaction ${hash.slice(0, 10)}…`,
          },
        ]);
      }
      clearAdventureTimers();
      setEncounterIndex(null);
      resumedSessionRef.current = '';
    } catch (error) {
      setMintStatus(error?.shortMessage || error?.message || 'Mint failed.');
    }
  }

  return (
    <section
      className={`adventure-panel${collapsed ? ' adventure-panel--collapsed' : ''}`}
      aria-labelledby={`start-adventure-title-${slotIndex}`}
    >
      <div className="adventure-card__toolbar">
        <button
          type="button"
          className="adventure-card__collapse"
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expand ${adventureLabel}` : `Collapse ${adventureLabel}`}
          onClick={onToggleCollapse}
        >
          {collapsed ? '+' : '−'}
        </button>
        <div>
          <p className="adventure-panel__eyebrow">{adventureLabel}</p>
          <h2 id={`start-adventure-title-${slotIndex}`}>
            {adventureStarted
              ? session?.status === 'found'
                ? 'Keep found'
                : partyNames
                  ? `Party ${partyNames}`
                  : 'In the wilds'
              : 'Select Impz'}
          </h2>
        </div>
        <span className="adventure-party__limit">
          {adventureStarted
            ? session?.status === 'found'
              ? 'Mint ready'
              : currentEncounter
                ? 'Halted'
                : 'Mining'
            : 'Ready to start'}
        </span>
      </div>

      {collapsed ? null : (
      <>
      <div className="adventure-party">
        <div className="adventure-panel__heading">
          <div>
            <p className="adventure-panel__eyebrow">Your party</p>
            <h2>Select Impz</h2>
          </div>
          {showStackHeader ? (
          <span className="adventure-party__limit">
            Lv {adventurer.level} · {adventurer.active_adventures}/{adventurer.slots} adventures
          </span>
          ) : null}
        </div>

        <p className="adventure-party__help">
            {walletAccount
            ? adventureStarted
              ? `${adventureLabel} is using these Impz. Start another adventure below with unused Impz if you have a free slot.`
              : 'Choose up to three Impz that are not already on another adventure.'
            : 'Use the wallet icon in the top-right, then choose up to three Impz to join the adventure.'}
        </p>
        {mintedKeepUrl ? (
          <p className="adventure-party__help">
            <a href={mintedKeepUrl} target="_blank" rel="noopener noreferrer">
              View this keep on OpenSea
            </a>
            {mintedCollectionUrl ? (
              <>
                {' · '}
                <a href={mintedCollectionUrl} target="_blank" rel="noopener noreferrer">
                  Imp Keeps collection
                </a>
              </>
            ) : null}
          </p>
        ) : null}

        <div className="adventure-party__slots" aria-label="Selected Impz">
          {selectedImplingz.map((impling, index) => {
            const tier = impling ? resolveImplingTier(impling) || 'Tier 1' : '';
            const tickRate = tier ? TIER_HASH_RATES[tier] : 0;

            return (
            <div key={index} className="adventure-party__member">
              <div className="adventure-party__dialogue">
                <div
                  className={`adventure-party__speech${
                    impling ? '' : ' adventure-party__speech--empty'
                  }`}
                  aria-live="polite"
                >
                  {impling ? (
                    impSpeechStates[index]?.thinking ? (
                      <span
                        className="adventure-party__speech-loading"
                        aria-label={`${impling.name} is thinking`}
                      >
                        <span />
                        <span />
                        <span />
                      </span>
                    ) : (
                      IMPLING_IDLE_QUOTES[impSpeechStates[index]?.quoteIndex] ??
                      IMPLING_IDLE_QUOTES[getInitialImplingQuoteIndex(impling.id, index)]
                    )
                  ) : (
                    'Psst… pick an Imp.'
                  )}
                </div>
                {impling ? (
                  <p className="adventure-party__hash-rate">
                    {tickRate}/tick · {tier}
                  </p>
                ) : (
                  <p className="adventure-party__hash-rate adventure-party__hash-rate--empty">
                    —
                  </p>
                )}
              </div>
              <button
                type="button"
                className={`adventure-party__slot${
                  impling ? ' adventure-party__slot--selected' : ''
                }`}
                aria-label={
                  impling
                    ? `Change ${impling.name} in slot ${index + 1}`
                    : `Select an Imp for slot ${index + 1}`
                }
                disabled={!walletAccount || adventureStarted}
                onClick={() => openImplingSelector(index)}
              >
                {impling ? (
                  <>
                    <img src={impling.image} alt="" />
                    <span className="adventure-party__slot-name">#{impling.id}</span>
                    <span className="adventure-party__slot-tier">
                      {tier}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="adventure-party__slot-plus" aria-hidden="true">
                      +
                    </span>
                    <span>Slot {index + 1}</span>
                  </>
                )}
              </button>
            </div>
            );
          })}
        </div>

        <div
          className={`adventure-party__wallet-status${
            walletAccount ? ' adventure-party__wallet-status--connected' : ''
          }`}
        >
          {walletAccount ? `${walletName}: ${connectedAddress}` : 'Wallet not connected'}
        </div>
        {combinedError ? <p className="adventure-party__error">{combinedError}</p> : null}
      </div>

      <div className="adventure-main">
      <div className="adventure-chat">
        <div className="adventure-panel__heading adventure-chat__heading">
          <div>
            <p className="adventure-panel__eyebrow">{adventureLabel}</p>
            <h2>D&amp;D Adventure</h2>
          </div>
          <div className="adventure-chat__heading-actions">
            <div className="adventure-chat__start-group">
              <div
                className="adventure-chat__lives"
                aria-label={`${lives} of ${ADVENTURE_LIVES} lives remaining`}
                title={`${lives} of ${ADVENTURE_LIVES} lives remaining`}
              >
                {Array.from({ length: ADVENTURE_LIVES }, (_, index) => (
                  <span
                    key={index}
                    className={`adventure-chat__life${
                      index < lives ? '' : ' adventure-chat__life--lost'
                    }`}
                    aria-hidden="true"
                  >
                    ♥
                  </span>
                ))}
              </div>
            {adventureStarted ? (
              <button
                type="button"
                className="adventure-chat__start"
                disabled={stopping}
                onClick={handleStopAdventure}
              >
                {stopping ? 'Stopping…' : 'Stop Adventure'}
              </button>
            ) : (
              <button
                type="button"
                className="adventure-chat__start"
                disabled={
                  selectedParty.length === 0 ||
                  starting ||
                  adventurer.active_adventures >= adventurer.slots
                }
                onClick={startAdventure}
              >
                {starting
                  ? 'Signing…'
                  : adventurer.active_adventures >= adventurer.slots
                    ? 'No free slots'
                    : 'Start Adventure'}
              </button>
            )}
            </div>
            <span
              className={`adventure-chat__status${
                adventureStarted ? ' adventure-chat__status--started' : ''
              }`}
            >
              {adventureStarted
                ? session?.status === 'found'
                  ? 'Keep found'
                  : currentEncounter
                    ? 'Halted'
                    : 'Mining…'
                : 'Not started'}
            </span>
          </div>
        </div>

        <div
          className={`adventure-chat__window${
            adventureStarted ? ' adventure-chat__window--active' : ''
          }`}
          aria-live="polite"
        >
          {adventureStarted || adventureMessages.length > 0 ? (
            <div className="adventure-chat__messages">
              {adventureMessages.map((message, index) => (
                <div
                  key={`${message.type}-${index}`}
                  className={`adventure-chat__message adventure-chat__message--${message.type}`}
                >
                  <span className="adventure-chat__message-label">
                    {message.type === 'choice'
                      ? 'You'
                      : message.type.startsWith('roll')
                        ? 'D20'
                        : message.type === 'xp'
                          ? 'XP'
                          : message.type === 'derp'
                            ? '$DERP'
                            : message.type === 'mint'
                              ? 'Mint'
                              : message.type === 'system'
                                ? 'Party'
                                : 'Dungeon Master'}
                  </span>
                  <p>{message.text}</p>
                </div>
              ))}
              {adventureStarted && !currentEncounter && session?.status === 'running' ? (
                <div className="adventure-chat__typing" aria-label="Dungeon Master is thinking">
                  <span />
                  <span />
                  <span />
                  <p>Dungeon Master is thinking…</p>
                </div>
              ) : null}
              <div ref={chatEndRef} />
            </div>
          ) : (
            <div className="adventure-chat__empty">
              <span className="adventure-chat__prompt" aria-hidden="true">
                &gt;_
              </span>
              <h3>The wilds are waiting</h3>
              <p>Select at least one Imp, then start the adventure. Failed D20 rolls cost a life.</p>
            </div>
          )}
        </div>

        <div className="adventure-chat__controls">
          {session?.status === 'found' ? (
            <>
              <p className="adventure-chat__halted">
                Hash finding halted. A lost keep stands before you.
              </p>
              <p className="adventure-chat__decision-label">Make your decision.</p>
              <div className="adventure-chat__options adventure-chat__options--keep" aria-label="Choose what to do with the keep">
                <button type="button" onClick={viewFoundDungeon}>
                  <span>A</span>
                  View dungeon
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdventureMessages((messages) => [
                      ...messages,
                      { type: 'choice', text: 'B | Mint dungeon' },
                    ]);
                    handleMintDungeon();
                  }}
                >
                  <span>B</span>
                  Mint dungeon
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdventureMessages((messages) => [
                      ...messages,
                      { type: 'choice', text: 'C | Flee' },
                    ]);
                    handleDiscardDungeon();
                  }}
                >
                  <span>C</span>
                  Flee
                </button>
              </div>
              {mintStatus ? <p className="dungeon-found-modal__status">{mintStatus}</p> : null}
            </>
          ) : currentEncounter ? (
            <>
              <p className="adventure-chat__halted">
                Hash finding halted, make a decision.
              </p>
              <p className="adventure-chat__decision-label">
                {resolvingChoice ? 'Resolving your choice…' : 'Make your decision.'}
              </p>
              <div className="adventure-chat__options" aria-label="Choose your response">
                {currentEncounter.options.map((option) => (
                  <button
                    key={`${encounterIndex}-${option.key}`}
                    type="button"
                    disabled={resolvingChoice}
                    onClick={() => chooseAdventureOption(option)}
                  >
                    <span>{option.key}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          ) : adventureStarted ? (
            <div className="adventure-chat__controls-waiting">
              The next encounter will emerge as your party explores the wilds.
            </div>
          ) : (
            <p className="adventure-chat__controls-help">
              Adventure choices will appear here after you start.
            </p>
          )}
        </div>
      </div>

      {adventureStarted && session?.status === 'running' ? (
        <aside className="adventure-mining" aria-label="Hash mining">
          <p className="adventure-panel__eyebrow">Hash mining</p>
          <h2>Adventuring</h2>
          <p>
            {hashesChecked.toLocaleString()} hashes checked · {partyHashRate}/tick total
          </p>
          <p className="adventure-party__help">
            {currentEncounter
              ? 'Hash finding is paused until you choose an option.'
              : 'Mining continues if you leave Adventures. A choice appears when a dungeon is found.'}
          </p>
        </aside>
      ) : null}
      </div>
      </>
      )}

      {session?.status === 'found' && viewKeepOpen ? (
        <div
          className="dungeon-found-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dungeon-found-title"
        >
          <div className="dungeon-found-modal__panel">
            <div className="dungeon-found-modal__header">
              <div>
                <p className="adventure-panel__eyebrow">{adventureLabel}</p>
                <h2 id="dungeon-found-title">{adventureLabel} found this hash</h2>
              </div>
              <button
                type="button"
                className="dungeon-found-modal__close"
                aria-label="Close dungeon preview"
                onClick={() => setViewKeepOpen(false)}
              >
                ×
              </button>
            </div>
            <p>
              {partyNames ? `Party ${partyNames}. ` : ''}
              Inspect the preview, then mint it as an NFT or flee. Minting is free aside from ETH
              gas.
            </p>
            {session?.dungeon_seed ? (
              <img
                className="dungeon-found-modal__map"
                src={keepPreviewUrl(session.dungeon_seed, { tokenId: nextKeepTokenId })}
                alt="Procedurally generated lost keep"
              />
            ) : (
              <p className="adventure-party__help">Loading dungeon preview…</p>
            )}
            {keepMetadata?.attributes?.length ? (
              <ul className="dungeon-found-modal__traits">
                {keepMetadata.attributes.map((trait) => (
                  <li key={trait.trait_type}>
                    <span>{trait.trait_type}</span>
                    <strong>{trait.value}</strong>
                  </li>
                ))}
              </ul>
            ) : keepMetadata ? null : (
              <p className="adventure-party__help">Reading keep metadata…</p>
            )}
            <div className="dungeon-found-modal__actions">
              <button type="button" onClick={handleMintDungeon}>
                Mint dungeon
              </button>
              <button type="button" onClick={handleDiscardDungeon}>
                Flee
              </button>
            </div>
            {mintStatus ? <p className="dungeon-found-modal__status">{mintStatus}</p> : null}
            <p className="dungeon-found-modal__status">
              Flee discards this keep only. The adventure keeps mining until you stop it.
              Close this preview to return to the adventure choices.
              If this browser lost the session key, confirm a wallet signature to continue.
            </p>
          </div>
        </div>
      ) : null}

      {selectingSlot !== null && (
        <div
          className="impling-selector"
          role="dialog"
          aria-modal="true"
          aria-labelledby="impling-selector-title"
        >
          <div className="impling-selector__panel">
            <div className="impling-selector__header">
              <div>
                <p className="adventure-panel__eyebrow">Slot {selectingSlot + 1}</p>
                <h2 id="impling-selector-title">Choose an IMPLINGZ</h2>
              </div>
              <button
                type="button"
                className="impling-selector__close"
                aria-label="Close Impling selector"
                onClick={() => setSelectingSlot(null)}
              >
                ×
              </button>
            </div>

            <p className="impling-selector__help">
              Only IMPLINGz currently held by {connectedAddress} are shown.
            </p>

            <div className="impling-selector__content">
              {implingzLoading && <p className="impling-selector__message">Loading IMPLINGz…</p>}

              {!implingzLoading && implingzError && (
                <p className="impling-selector__message impling-selector__message--error" role="alert">
                  {implingzError}
                </p>
              )}

              {!implingzLoading && !implingzError && ownedImplingz.length === 0 && (
                <p className="impling-selector__message">
                  No IMPLINGz were found in this wallet.
                </p>
              )}

              {!implingzLoading && ownedImplingz.length > 0 && (
                <div className="impling-selector__grid">
                  {ownedImplingz.map((impling) => {
                    const selectedElsewhere = selectedImplingz.some(
                      (selected, index) =>
                        index !== selectingSlot && selected?.id === impling.id
                    );
                    const usedOnOtherAdventure =
                      busyTokenIds.has(String(impling.id)) &&
                      !selectedImplingz.some((selected) => selected?.id === impling.id);
                    const selectedHere = selectedImplingz[selectingSlot]?.id === impling.id;

                    return (
                      <button
                        key={impling.id}
                        type="button"
                        className={`impling-selector__card${
                          selectedHere ? ' impling-selector__card--selected' : ''
                        }`}
                        disabled={
                          selectedElsewhere ||
                          usedOnOtherAdventure ||
                          Boolean(verifyingTokenId)
                        }
                        onClick={() => selectImpling(impling)}
                      >
                        <img src={impling.image} alt={impling.name} />
                        <span className="impling-selector__card-name">{impling.name}</span>
                        <span className="impling-selector__card-tier">
                          {verifyingTokenId === impling.id
                            ? 'Verifying…'
                            : selectedElsewhere
                              ? 'Already selected'
                              : usedOnOtherAdventure
                                ? 'On another adventure'
                                : impling.tier || 'Owned'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedImplingz[selectingSlot] && (
              <button
                type="button"
                className="impling-selector__clear"
                onClick={clearSelectingSlot}
              >
                Clear slot
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function StartAdventurePanel() {
  const { adventurer, adventures, foundAdventure, busyTokenIds, dripMessage, runtimeError } =
    useAdventureRuntime();
  const [collapsed, setCollapsed] = useState({});
  const canStartAnother = adventurer.active_adventures < adventurer.slots;

  return (
    <div className="adventure-stack">
      <p className="adventure-stack__meta">
        Lv {adventurer.level} · {adventurer.active_adventures}/{adventurer.slots} adventures.
        Extra concurrent adventures unlock through level 5. Max level is 10.
      </p>
      {foundAdventure ? (
        <p className="adventure-stack__found">
          {`Adventure ${
            adventures.findIndex((run) => run.session.id === foundAdventure.session.id) + 1
          } found this hash`}
          {foundAdventure.party?.length
            ? ` with IMPLINGz ${foundAdventure.party.map((impling) => `#${impling.id}`).join(', ')}`
            : ''}
          . View the dungeon, mint it, or flee.
        </p>
      ) : null}
      {dripMessage ? <p className="adventure-party__drip">{dripMessage}</p> : null}
      {runtimeError ? <p className="adventure-party__error">{runtimeError}</p> : null}

      {adventures.map((run, index) => (
        <AdventureSlot
          key={run.session.id}
          slotIndex={index}
          run={run}
          busyTokenIds={busyTokenIds}
          collapsed={Boolean(collapsed[run.session.id])}
          onToggleCollapse={() =>
            setCollapsed((current) => ({
              ...current,
              [run.session.id]: !current[run.session.id],
            }))
          }
        />
      ))}

      {canStartAnother ? (
        <AdventureSlot
          key="draft"
          slotIndex={adventures.length}
          run={null}
          busyTokenIds={busyTokenIds}
          collapsed={Boolean(collapsed.draft)}
          showStackHeader={adventures.length === 0}
          onToggleCollapse={() =>
            setCollapsed((current) => ({
              ...current,
              draft: !current.draft,
            }))
          }
        />
      ) : adventures.length === 0 ? (
        <p className="adventure-stack__meta">
          No free adventure slots. Level up to run more concurrent adventures, up to 5 at level 5.
        </p>
      ) : null}
    </div>
  );
}

function shortenAddress(address = '') {
  if (!address) return '—';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatBoardTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDungeonFound(event) {
  if (event?.dungeon_seed) {
    const seed = String(event.dungeon_seed);
    return seed.startsWith('0x') ? `${seed.slice(0, 10)}…` : seed.slice(0, 10);
  }
  if (event?.status === 'found' || event?.status === 'minted') return 'Yes';
  return '—';
}

function AdventureBoard() {
  const [events, setEvents] = useState([]);
  const [profilesByWallet, setProfilesByWallet] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchAdventureBoard({ signal: controller.signal }),
      fetchCommunityProfiles({ signal: controller.signal }).catch(() => []),
    ])
      .then(([boardEvents, profiles]) => {
        setEvents(boardEvents);
        setProfilesByWallet(
          Object.fromEntries(
            (profiles ?? []).map((profile) => [
              String(profile.wallet_address || '').toLowerCase(),
              profile,
            ])
          )
        );
      })
      .catch(() => {
        setEvents([]);
        setProfilesByWallet({});
      });
    return () => controller.abort();
  }, []);

  return (
    <section className="adventure-board" aria-labelledby="adventure-board-title">
      <div className="adventure-board__header">
        <div>
          <p className="adventure-panel__eyebrow">All connected wallets</p>
          <h2 id="adventure-board-title">Live Adventure Feed</h2>
        </div>
        <span className="adventure-board__live">
          <span aria-hidden="true" />
          Live
        </span>
      </div>

      <div className="adventure-board__feed" aria-live="polite">
        {events.length === 0 ? (
          <div className="adventure-board__empty">
            <span className="adventure-board__empty-mark" aria-hidden="true">
              …
            </span>
            <h3>Waiting for adventure activity</h3>
            <p>
              Signed adventure starts, prompt wins, found keeps, and mints from connected wallets
              appear here.
            </p>
          </div>
        ) : (
          <div className="adventure-board__table-wrap">
            <table className="adventure-board__table">
              <thead>
                <tr>
                  <th scope="col">Profile pic</th>
                  <th scope="col">Name</th>
                  <th scope="col">Wallet address</th>
                  <th scope="col">Dungeon found</th>
                  <th scope="col">XP earned</th>
                  <th scope="col">Time found</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const wallet = String(event.wallet_address || '').toLowerCase();
                  const profile = profilesByWallet[wallet];
                  const avatar = COLLECTION_BY_ID.get(String(profile?.avatar_token_id ?? ''));

                  return (
                    <tr key={event.id}>
                      <td>
                        <div className="adventure-board__avatar">
                          {avatar ? (
                            <img src={avatar.image} alt={avatar.name} />
                          ) : (
                            <span aria-hidden="true">?</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <strong>{profile?.nickname || 'Unnamed Adventurer'}</strong>
                      </td>
                      <td>
                        <span className="adventure-board__address">
                          {shortenAddress(event.wallet_address)}
                        </span>
                      </td>
                      <td>{formatDungeonFound(event)}</td>
                      <td className="adventure-board__xp">{event.xp_awarded ?? 0}</td>
                      <td>
                        {formatBoardTime(event.updated_at || event.ended_at || event.started_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default function AdventuresPage() {
  const access = useAdventuresServerAccess();
  const [activeView, setActiveView] = useState('information');

  if (!access.unlocked) {
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
          <p>This page is being built/tested.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="adventures-page">
      <div className="adventures-page__inner">
        <header className="adventures-page__header">
          <p className="adventures-page__eyebrow">Chapter 1</p>
          <h1 className="adventures-page__title">Adventures</h1>
        </header>

        <div className="adventures-tabs" role="tablist" aria-label="Adventure page sections">
          {ADVENTURE_VIEWS.map((view) => (
            <button
              key={view.id}
              type="button"
              role="tab"
              id={`adventures-tab-${view.id}`}
              aria-selected={activeView === view.id}
              aria-controls="adventures-panel"
              className={`adventures-tabs__button${
                activeView === view.id ? ' adventures-tabs__button--active' : ''
              }`}
              onClick={() => setActiveView(view.id)}
            >
              {view.label}
            </button>
          ))}
        </div>

        <div
          className="adventures-view"
          role="tabpanel"
          id="adventures-panel"
          aria-labelledby={`adventures-tab-${activeView}`}
        >
          {activeView === 'information' && <AdventureInformation />}
          {activeView === 'start' && <StartAdventurePanel />}
          {activeView === 'board' && <AdventureBoard />}
        </div>
      </div>
    </div>
  );
}
