import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { usePublicClient, useSignMessage, useWalletClient } from 'wagmi';
import collection from '../data/collection.json';
import { useAdventureRuntime } from '../lib/adventureRuntime';
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
import { DUNGEON_KEEP_ABI, keepOpenSeaItemUrl, tokenIdFromMintReceipt } from '../lib/dungeonKeep';
import { AdventureInformation } from '../lib/adventureInformation';

const IMPLINGZ_CONTRACT = '0x81d2d1f0e92285cdd22aa3cbc6956b6e1724d029';
const OWNER_OF_SELECTOR = '0x6352211e';
const COLLECTION_BY_ID = new Map(collection.map((impling) => [String(impling.id), impling]));

const ADVENTURE_VIEWS = [
  { id: 'information', label: 'Information' },
  { id: 'start', label: 'Start Adventure' },
  { id: 'board', label: 'Adventure Board' },
];

const DND_ENCOUNTERS = [
  {
    prompt: 'A goblin scout steps onto the trail and raises a rusted blade. What do you do?',
    options: [
      {
        key: 'A',
        label: 'Fight it',
        dc: 10,
        success: 'Your Imp strikes first. The goblin flees and drops a scrap of dungeon map.',
        failure: 'The goblin lands a glancing blow before your party drives it back into the brush.',
      },
      {
        key: 'B',
        label: 'Flee into the woods',
        dc: 8,
        success: 'Your party disappears between the trees before the goblin can sound an alarm.',
        failure: 'A snapped branch gives you away. You escape, but the goblin warns the road ahead.',
      },
    ],
  },
  {
    prompt: 'A broken rope bridge hangs over a black ravine. The map points to the far side.',
    options: [
      {
        key: 'A',
        label: 'Leap across',
        dc: 13,
        success: 'You clear the gap and pull the rest of the party safely across.',
        failure: 'The ledge crumbles. You catch the rope and climb back up, shaken but alive.',
      },
      {
        key: 'B',
        label: 'Repair the bridge',
        dc: 9,
        success: 'Your careful knots hold. The party crosses without drawing attention.',
        failure: 'The old rope tears. You lose time searching for another secure anchor.',
      },
    ],
  },
  {
    prompt: 'Ancient runes glow across a sealed stone archway. Something is moving behind it.',
    options: [
      {
        key: 'A',
        label: 'Study the runes',
        dc: 11,
        success: 'The symbols reveal a safe phrase and the archway opens without a sound.',
        failure: 'The runes flare red. A distant bell echoes through the buried halls.',
      },
      {
        key: 'B',
        label: 'Force the door',
        dc: 14,
        success: 'Stone cracks beneath your combined strength, revealing a forgotten passage.',
        failure: 'The door holds and dust rains from the ceiling. Something heard the impact.',
      },
    ],
  },
  {
    prompt: 'A skeletal guardian blocks the final stair, clutching a key carved from obsidian.',
    options: [
      {
        key: 'A',
        label: 'Challenge the guardian',
        dc: 12,
        success: 'The guardian falls apart. The obsidian key remains warm in your hand.',
        failure: 'Its shield turns your attack. Your party retreats and searches for an opening.',
      },
      {
        key: 'B',
        label: 'Distract and steal the key',
        dc: 13,
        success: 'Your feint works. An Imp slips behind the guardian and takes the key.',
        failure: 'The guardian sees through the trick and seals the stair behind its shield.',
      },
    ],
  },
  {
    prompt: 'The obsidian key hums beside an unmarked dungeon gate. How will you enter?',
    options: [
      {
        key: 'A',
        label: 'Turn the key',
        dc: 7,
        success: 'The lost keep answers. Its buried halls begin to form beyond the gate.',
        failure: 'The lock resists. You steady the key and feel another route awaken nearby.',
      },
      {
        key: 'B',
        label: 'Search for traps first',
        dc: 10,
        success: 'You uncover a hidden ward and disable it before opening the dungeon gate.',
        failure: 'No trap is found, but the delay draws restless shapes toward your torchlight.',
      },
    ],
  },
];

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
  showFoundModal = true,
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
    removeRun,
  } = useAdventureRuntime();

  const session = run?.session ?? null;
  const party = run?.party ?? [];
  const hashesChecked = run?.hashesChecked ?? 0;
  const dungeonImageUrl = run?.dungeonImageUrl ?? '';

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
  const [stopping, setStopping] = useState(false);
  const [mintStatus, setMintStatus] = useState('');
  const [mintedKeepUrl, setMintedKeepUrl] = useState('');
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
    setStartError('');
    setMintStatus('');
    setMintedKeepUrl('');
    resumedSessionRef.current = '';
    if (session?.id) setMiningPaused(session.id, false);
  }, [walletAccount, session?.id, setMiningPaused]);

  useEffect(() => {
    if (!adventureStarted || !session?.id) return;

    if (party.length) {
      const nextSlots = [null, null, null];
      party.slice(0, 3).forEach((impling, index) => {
        nextSlots[index] = impling;
      });
      setSelectedImplingz(nextSlots);
    }

    if (resumedSessionRef.current === session.id) return;
    resumedSessionRef.current = session.id;

    setAdventureMessages([
      {
        type: 'system',
        text:
          session.status === 'found'
            ? `${adventureLabel} already uncovered a keep. Inspect it, then mint or walk away.`
            : `${adventureLabel} still running${partyNames ? ` with IMPLINGz ${partyNames}` : ''}. Mining continues while you browse other pages.`,
      },
    ]);
    setEncounterIndex(null);
    if (session.status === 'running') {
      scheduleNextEncounter();
    }
  }, [adventureStarted, session?.id, session?.status, party]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [adventureMessages, encounterIndex]);

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
      setAdventureMessages((messages) => {
        if (messages.some((message) => message.text?.includes('uncovered a lost keep'))) {
          return messages;
        }
        return [
          ...messages,
          {
            type: 'system',
            text: `${adventureLabel} uncovered a lost keep. Inspect it, then mint or walk away.`,
          },
          {
            type: 'xp',
            text: `+${XP_DUNGEON_FOUND} XP`,
          },
        ];
      });
    }
  }, [session?.status]);

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

  function scheduleNextEncounter(excludedIndex = null) {
    window.clearTimeout(nextEncounterTimerRef.current);
    setEncounterIndex(null);

    nextEncounterTimerRef.current = window.setTimeout(() => {
      const nextIndex = randomIndex(DND_ENCOUNTERS.length, excludedIndex);
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
      setEncounterIndex(null);
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
    if (!adventureStarted || encounterIndex === null || !session?.id) return;

    const completedEncounterIndex = encounterIndex;
    try {
      const result = await resolveAdventurePrompt(session.id, {
        encounterIndex,
        optionKey: option.key,
      });
      const rollResult = result.succeeded ? 'Success' : 'Failure';
      setAdventurer(decorateAccount(result.account));
      if (result.drip) {
        setDripMessage(
          result.drip.status === 'skipped_empty_pot'
            ? `A ${result.drip.amount} $DERP drip rolled, but the pot is empty.`
            : `${result.drip.amount} $DERP is queued from the royalties pot.`
        );
      }
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
        ...(Number(result.xpAwarded) > 0
          ? [{ type: 'xp', text: `+${result.xpAwarded} XP` }]
          : []),
        {
          type: 'narrator',
          text: result.succeeded ? option.success : option.failure,
        },
      ]);
      scheduleNextEncounter(completedEncounterIndex);
    } catch (error) {
      setStartError(error?.message || 'The encounter could not be resolved.');
    }
  }

  async function handleDiscardDungeon() {
    if (!session?.id) return;
    try {
      const nextNonce = Number(session.winning_nonce ?? 0) + 1;
      const data = await discardFoundDungeon(session.id);
      resumeAfterWalkAway({
        account: data.account,
        session: data.session,
        nextNonce: Number(data.nextNonce ?? nextNonce),
      });
      setMintStatus('');
      setAdventureMessages((messages) => [
        ...messages,
        {
          type: 'system',
          text: 'You walked away. The preview is gone and uses no supply slot. Mining continues.',
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
        data.contractAddress || import.meta.env.VITE_DUNGEON_KEEP_ADDRESS || '';

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
        const openSeaUrl = keepOpenSeaItemUrl(contractAddress, tokenId);
        replaceSession({ account: minted.account, session: minted.session });
        removeRun(session.id);
        setMintedKeepUrl(openSeaUrl);
        setMintStatus('');
        setAdventureMessages((messages) => [
          ...messages,
          {
            type: 'mint',
            text: `Keep #${tokenId} minted. OpenSea will show the revealed dungeon.`,
          },
          {
            type: 'xp',
            text: `+${XP_DUNGEON_MINTED} XP`,
          },
        ]);
      } else {
        setMintStatus(`Mint submitted. Transaction ${hash.slice(0, 10)}…`);
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
              View / list this keep on OpenSea
            </a>
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
              <p>Select at least one Imp, then start the adventure.</p>
            </div>
          )}
        </div>

        <div className="adventure-chat__controls">
          {currentEncounter ? (
            <>
              <p className="adventure-chat__halted">
                Hash finding halted, make a decision.
              </p>
              <p className="adventure-chat__decision-label">Make your decision.</p>
              <div className="adventure-chat__options" aria-label="Choose your response">
                {currentEncounter.options.map((option) => (
                  <button
                    key={`${encounterIndex}-${option.key}`}
                    type="button"
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
              : 'Mining continues if you leave Adventures. A popup opens when a dungeon is found.'}
          </p>
        </aside>
      ) : null}
      </div>
      </>
      )}

      {session?.status === 'found' && showFoundModal ? (
        <div
          className="dungeon-found-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dungeon-found-title"
        >
          <div className="dungeon-found-modal__panel">
            <p className="adventure-panel__eyebrow">{adventureLabel}</p>
            <h2 id="dungeon-found-title">{adventureLabel} found this hash</h2>
            <p>
              {partyNames ? `Party ${partyNames}. ` : ''}
              Inspect the preview, then mint it as an NFT or walk away forever. Minting is free
              aside from ETH gas.
            </p>
            {dungeonImageUrl ? (
              <img
                className="dungeon-found-modal__map"
                src={dungeonImageUrl}
                alt="Procedurally generated lost keep"
              />
            ) : (
              <p className="adventure-party__help">Loading dungeon preview…</p>
            )}
            <div className="dungeon-found-modal__actions">
              <button type="button" onClick={handleMintDungeon}>
                Mint keep
              </button>
              <button type="button" onClick={handleDiscardDungeon}>
                Walk away
              </button>
            </div>
            {mintStatus ? <p className="dungeon-found-modal__status">{mintStatus}</p> : null}
            <p className="dungeon-found-modal__status">
              Walk away discards this keep only. The adventure keeps mining until you stop it.
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
          . Mint the keep or walk away.
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
          showFoundModal={foundAdventure?.session?.id === run.session.id}
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
