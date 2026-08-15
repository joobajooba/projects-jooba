import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import collection from '../data/collection.json';

const HIGHLIGHT_PATTERN = /(\$DERP|\bImp\b|\b4444\b|\bfree\b)/gi;
const IMPLINGZ_CONTRACT = '0x81d2d1f0e92285cdd22aa3cbc6956b6e1724d029';
const ROBINHOOD_CHAIN_ID = '0x1237';
const OWNER_OF_SELECTOR = '0x6352211e';
const COLLECTION_BY_ID = new Map(collection.map((impling) => [String(impling.id), impling]));

function highlightText(text) {
  return text.split(HIGHLIGHT_PATTERN).map((part, index) => {
    if (!part) return null;

    const normalizedPart = part.toLowerCase();
    let modifier = '';

    if (normalizedPart === '$derp') modifier = ' adventures-highlight--derp';
    if (normalizedPart === 'imp') modifier = ' adventures-highlight--imp';
    if (normalizedPart === '4444') modifier = ' adventures-highlight--supply';
    if (normalizedPart === 'free') modifier = ' adventures-highlight--free';

    return modifier ? (
      <span key={`${part}-${index}`} className={`adventures-highlight${modifier}`}>
        {part}
      </span>
    ) : (
      part
    );
  });
}

const LOOP_ITEMS = [
  {
    title: 'Choose your adventurer',
    body: 'Connect a wallet and put at least one Imp on the adventure. Imp Tier sets the hash rate.',
  },
  {
    title: 'Enter the wilds',
    body: 'Crossing lands, clearing obstacles, and events provide the D&D skin. In the background, the client mines nonces in a Mineboys-style search until a winning hash hits.',
  },
  {
    title: 'Uncover a dungeon',
    body: 'The winning hash becomes the dungeon key. It drives the generator already in this repo — seed, tileset, and layout — and reveals a preview that is not on-chain yet.',
  },
  {
    title: 'Make the final choice',
    body: 'Mint the keep or walk away forever. Minting is free apart from $DERP gas, and the same Imp must still be on the adventure.',
  },
];

const FLOW_STEPS = [
  {
    number: '01',
    title: 'Connect + select',
    body: 'Wallet connected and at least one Imp committed.',
    meta: 'Imp Tier → hash rate',
  },
  {
    number: '02',
    title: 'Adventure + mine',
    body: 'Wilds, obstacles, and events run while the client searches nonces.',
    meta: 'Repeat until a winning hash',
  },
  {
    number: '03',
    title: 'Winning hash',
    body: 'The successful hash becomes a unique dungeon key.',
    meta: 'Key → seed, tileset, layout',
  },
  {
    number: '04',
    title: 'Preview dungeon',
    body: 'The generated keep is shown off-chain for the player to inspect.',
    meta: 'No supply used yet',
  },
];

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
      tier: localImpling?.attributes?.Tier ?? '',
    });
  });

  return [...uniqueInstances.values()].sort((a, b) => Number(a.id) - Number(b.id));
}

async function verifyImplingOwnership(provider, walletAccount, tokenId) {
  const chainId = await provider.request({ method: 'eth_chainId' });
  if (chainId?.toLowerCase() !== ROBINHOOD_CHAIN_ID) {
    throw new Error('Switch your wallet to Robinhood Chain and try again.');
  }

  const encodedTokenId = BigInt(tokenId).toString(16).padStart(64, '0');
  const result = await provider.request({
    method: 'eth_call',
    params: [
      {
        to: IMPLINGZ_CONTRACT,
        data: `${OWNER_OF_SELECTOR}${encodedTokenId}`,
      },
      'latest',
    ],
  });

  const owner = `0x${result.slice(-40)}`.toLowerCase();
  return owner === walletAccount.toLowerCase();
}

function AdventureBox({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`faq-item adventures-box${open ? ' faq-item--open' : ''}`}>
      <button
        type="button"
        className="faq-item__trigger"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="faq-item__question">{title}</span>
        <span className="faq-item__icon" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>
      {open && <div className="faq-item__answer adventures-box__content">{children}</div>}
    </section>
  );
}

function LoopContent() {
  return (
    <ol className="adventures-loop">
      {LOOP_ITEMS.map((item, index) => (
        <li key={item.title} className="adventures-loop__item">
          <span className="adventures-loop__number" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div>
            <h3 className="adventures-loop__title">{item.title}</h3>
            <p className="adventures-loop__body">{highlightText(item.body)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function FlowMap() {
  return (
    <div className="adventures-flow">
      <p className="adventures-flow__legend">
        One discovery loop. The keep only enters supply after the player confirms the mint.
      </p>

      <div className="adventures-flow__track">
        {FLOW_STEPS.map((step) => (
          <div key={step.number} className="adventures-flow__stage">
            <article className="adventures-flow__node">
              <span className="adventures-flow__number">{step.number}</span>
              <h3 className="adventures-flow__title">{step.title}</h3>
              <p className="adventures-flow__body">{highlightText(step.body)}</p>
              <span className="adventures-flow__meta">{step.meta}</span>
            </article>
            <span className="adventures-flow__arrow" aria-hidden="true">
              ↓
            </span>
          </div>
        ))}
      </div>

      <div className="adventures-flow__decision" aria-label="Choose what happens to the preview">
        <div className="adventures-flow__decision-label">
          <span>05</span>
          Keep it?
        </div>
        <div className="adventures-flow__branches">
          <article className="adventures-flow__branch adventures-flow__branch--mint">
            <span className="adventures-flow__branch-tag">Mint</span>
            <h3>Claim the keep</h3>
            <p>{highlightText('Free mint + $DERP gas. Imp must still be adventuring.')}</p>
            <strong>{highlightText('Takes the next slot in the 4444 supply.')}</strong>
          </article>

          <article className="adventures-flow__branch adventures-flow__branch--leave">
            <span className="adventures-flow__branch-tag">Walk away</span>
            <h3>Lose the dungeon</h3>
            <p>The preview is deleted and the dungeon is never stored.</p>
            <strong>{highlightText('Uses no slot in the 4444 supply.')}</strong>
          </article>
        </div>
      </div>

      <p className="adventures-flow__finish">
        Chapter 1 ends when keep <strong>4444</strong> is minted — not when the 4444th winning
        hash is found.
      </p>
    </div>
  );
}

function StartAdventurePanel() {
  const { walletAccount, walletName, walletProvider } = useOutletContext();
  const [selectedImplingz, setSelectedImplingz] = useState([null, null, null]);
  const [selectingSlot, setSelectingSlot] = useState(null);
  const [ownedImplingz, setOwnedImplingz] = useState([]);
  const [implingzLoading, setImplingzLoading] = useState(false);
  const [implingzError, setImplingzError] = useState('');
  const [verifyingTokenId, setVerifyingTokenId] = useState('');
  const [adventureStarted, setAdventureStarted] = useState(false);
  const [adventureMessages, setAdventureMessages] = useState([]);
  const [encounterIndex, setEncounterIndex] = useState(null);
  const [impSpeechStates, setImpSpeechStates] = useState([
    { quoteIndex: null, thinking: false },
    { quoteIndex: null, thinking: false },
    { quoteIndex: null, thinking: false },
  ]);
  const chatEndRef = useRef(null);
  const nextEncounterTimerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const lastIdleNarrationRef = useRef(null);
  const impSpeechTimersRef = useRef([
    { wait: null, change: null },
    { wait: null, change: null },
    { wait: null, change: null },
  ]);
  const connectedAddress = walletAccount
    ? `${walletAccount.slice(0, 6)}…${walletAccount.slice(-4)}`
    : '';
  const selectedParty = selectedImplingz.filter(Boolean);
  const currentEncounter = encounterIndex === null ? null : DND_ENCOUNTERS[encounterIndex];

  useEffect(() => {
    clearAdventureTimers();
    setSelectedImplingz([null, null, null]);
    setOwnedImplingz([]);
    setSelectingSlot(null);
    setImplingzError('');
    setAdventureStarted(false);
    setAdventureMessages([]);
    setEncounterIndex(null);
  }, [walletAccount]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [adventureMessages, encounterIndex]);

  useEffect(() => {
    if (!adventureStarted || encounterIndex !== null) return undefined;

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
  }, [adventureStarted, encounterIndex]);

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

  async function openImplingSelector(slotIndex) {
    if (!walletAccount) return;

    setSelectingSlot(slotIndex);
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
    if (!walletProvider || selectingSlot === null) return;

    setVerifyingTokenId(impling.id);
    setImplingzError('');

    try {
      const stillOwned = await verifyImplingOwnership(
        walletProvider,
        walletAccount,
        impling.id
      );

      if (!stillOwned) {
        throw new Error(`IMPLINGZ #${impling.id} is no longer held by this wallet.`);
      }

      setSelectedImplingz((current) =>
        current.map((selected, index) => (index === selectingSlot ? impling : selected))
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

  function startAdventure() {
    if (selectedParty.length === 0) return;

    const partyNames = selectedParty.map((impling) => `#${impling.id}`).join(', ');
    setAdventureStarted(true);
    setEncounterIndex(null);
    setAdventureMessages([
      {
        type: 'narrator',
        text: 'Your adventure for the lost dungeons has commenced.',
      },
      {
        type: 'system',
        text: `IMPLINGZ ${partyNames} enter the wilds. Their search for a forgotten keep begins now.`,
      },
    ]);
    scheduleNextEncounter();
  }

  function chooseAdventureOption(option) {
    if (!adventureStarted || encounterIndex === null) return;

    const roll = Math.floor(Math.random() * 20) + 1;
    const succeeded = roll === 20 || (roll !== 1 && roll >= option.dc);
    const completedEncounterIndex = encounterIndex;
    const rollResult = succeeded ? 'Success' : 'Failure';

    setAdventureMessages((messages) => [
      ...messages,
      {
        type: 'choice',
        text: `${option.key} | ${option.label}`,
      },
      {
        type: succeeded ? 'roll-success' : 'roll-failure',
        text: `You rolled ${roll} on the D20 against DC ${option.dc} — ${rollResult}.`,
      },
      {
        type: 'narrator',
        text: succeeded ? option.success : option.failure,
      },
    ]);
    scheduleNextEncounter(completedEncounterIndex);
  }

  return (
    <section className="adventure-panel" aria-labelledby="start-adventure-title">
      <div className="adventure-party">
        <div className="adventure-panel__heading">
          <div>
            <p className="adventure-panel__eyebrow">Your party</p>
            <h2 id="start-adventure-title">Select Impz</h2>
          </div>
          <span className="adventure-party__limit">Max 3</span>
        </div>

        <p className="adventure-party__help">
          {walletAccount
            ? 'Choose up to three Impz from your connected wallet to join the adventure.'
            : 'Use the wallet icon in the top-right, then choose up to three Impz to join the adventure.'}
        </p>

        <div className="adventure-party__slots" aria-label="Selected Impz">
          {selectedImplingz.map((impling, index) => (
            <div key={index} className="adventure-party__member">
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
          ))}
        </div>

        <div
          className={`adventure-party__wallet-status${
            walletAccount ? ' adventure-party__wallet-status--connected' : ''
          }`}
        >
          {walletAccount ? `${walletName}: ${connectedAddress}` : 'Wallet not connected'}
        </div>
      </div>

      <div className="adventure-chat">
        <div className="adventure-panel__heading adventure-chat__heading">
          <div>
            <p className="adventure-panel__eyebrow">Chapter 1</p>
            <h2>D&amp;D Adventure</h2>
          </div>
          <div className="adventure-chat__heading-actions">
            <button
              type="button"
              className="adventure-chat__start"
              disabled={selectedParty.length === 0 || adventureStarted}
              onClick={startAdventure}
            >
              {adventureStarted ? 'Adventure running' : 'Start Adventure'}
            </button>
            <span
              className={`adventure-chat__status${
                adventureStarted ? ' adventure-chat__status--started' : ''
              }`}
            >
              {adventureStarted ? 'Started' : 'Not started'}
            </span>
          </div>
        </div>

        <div
          className={`adventure-chat__window${
            adventureStarted ? ' adventure-chat__window--active' : ''
          }`}
          aria-live="polite"
        >
          {adventureStarted ? (
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
                        : message.type === 'system'
                          ? 'Party'
                          : 'Dungeon Master'}
                  </span>
                  <p>{message.text}</p>
                </div>
              ))}
              {!currentEncounter && (
                <div className="adventure-chat__typing" aria-label="Dungeon Master is thinking">
                  <span />
                  <span />
                  <span />
                  <p>Dungeon Master is thinking…</p>
                </div>
              )}
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
                    const selectedHere = selectedImplingz[selectingSlot]?.id === impling.id;

                    return (
                      <button
                        key={impling.id}
                        type="button"
                        className={`impling-selector__card${
                          selectedHere ? ' impling-selector__card--selected' : ''
                        }`}
                        disabled={selectedElsewhere || Boolean(verifyingTokenId)}
                        onClick={() => selectImpling(impling)}
                      >
                        <img src={impling.image} alt={impling.name} />
                        <span className="impling-selector__card-name">{impling.name}</span>
                        <span className="impling-selector__card-tier">
                          {verifyingTokenId === impling.id
                            ? 'Verifying…'
                            : selectedElsewhere
                              ? 'Already selected'
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

function AdventureBoard() {
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
        <div className="adventure-board__empty">
          <span className="adventure-board__empty-mark" aria-hidden="true">
            …
          </span>
          <h3>Waiting for adventure activity</h3>
          <p>
            Defeated enemies, discovered locations, found items, and other actions from connected
            wallets will appear here as they happen.
          </p>
        </div>
      </div>
    </section>
  );
}

function InformationView() {
  return (
    <>
      <p className="adventures-page__intro">
        {highlightText(
          'Chapter 1 is one loop: an Imp goes into the wilds, hash mining uncovers a lost dungeon, and that keep is either minted or gone forever.'
        )}
      </p>

      <div className="faqs-list">
        <AdventureBox title="The loop" defaultOpen>
          <LoopContent />
        </AdventureBox>

        <AdventureBox title="Chapter 1 flow map">
          <FlowMap />
        </AdventureBox>

        <AdventureBox title="Supply rules">
          <div className="adventures-rules">
            <p>
              {highlightText(
                'Minting is free; the player only pays $DERP gas, and an Imp must still be on that adventure when the keep is claimed.'
              )}
            </p>
            <p>
              {highlightText(
                'A minted keep takes the next slot in the 4444 supply. A discarded preview is deleted, is not stored, and does not count toward the supply.'
              )}
            </p>
            <p>
              {highlightText(
                'Chapter 1 ends when the 4444th keep is minted, not when the 4444th winning hash is found.'
              )}
            </p>
          </div>
        </AdventureBox>
      </div>
    </>
  );
}

export default function AdventuresPage() {
  const [activeView, setActiveView] = useState('information');

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
          {activeView === 'information' && <InformationView />}
          {activeView === 'start' && <StartAdventurePanel />}
          {activeView === 'board' && <AdventureBoard />}
        </div>
      </div>
    </div>
  );
}
