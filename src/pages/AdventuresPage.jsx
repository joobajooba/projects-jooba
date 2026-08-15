import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import collection from '../data/collection.json';

const HIGHLIGHT_PATTERN = /(\$DERP|\bImp\b|\b4444\b|\bfree\b)/gi;
const IMPLINGZ_CONTRACT = '0x81d2d1f0e92285cdd22aa3cbc6956b6e1724d029';
const ROBINHOOD_CHAIN_ID = '0x1237';
const BLOCKSCOUT_API = 'https://robinhoodchain.blockscout.com/api/v2';
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

function normalizeImageUrl(imageUrl) {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('ipfs://')) {
    return `https://dweb.link/ipfs/${imageUrl.slice('ipfs://'.length)}`;
  }
  return imageUrl;
}

async function fetchOwnedImplingz(walletAccount) {
  const url = new URL(`${BLOCKSCOUT_API}/tokens/${IMPLINGZ_CONTRACT}/instances`);
  url.searchParams.set('holder_address_hash', walletAccount);

  const instances = [];
  let page = 0;

  while (page < 50) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Could not load IMPLINGz from Blockscout.');
    }

    const data = await response.json();
    instances.push(...(data.items ?? []));

    if (!data.next_page_params) break;

    Object.entries(data.next_page_params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
    page += 1;
  }

  const uniqueInstances = new Map();

  instances.forEach((instance) => {
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
  const connectedAddress = walletAccount
    ? `${walletAccount.slice(0, 6)}…${walletAccount.slice(-4)}`
    : '';

  useEffect(() => {
    setSelectedImplingz([null, null, null]);
    setOwnedImplingz([]);
    setSelectingSlot(null);
    setImplingzError('');
  }, [walletAccount]);

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
    setSelectingSlot(null);
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
            <button
              key={index}
              type="button"
              className={`adventure-party__slot${
                impling ? ' adventure-party__slot--selected' : ''
              }`}
              aria-label={
                impling
                  ? `Change ${impling.name} in slot ${index + 1}`
                  : `Select an Imp for slot ${index + 1}`
              }
              disabled={!walletAccount}
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
          <span className="adventure-chat__status">Not started</span>
        </div>

        <div className="adventure-chat__window" aria-live="polite">
          <div className="adventure-chat__empty">
            <span className="adventure-chat__prompt" aria-hidden="true">
              &gt;_
            </span>
            <h3>The wilds are waiting</h3>
            <p>Select at least one Imp and connect your wallet to begin the adventure.</p>
          </div>
        </div>

        <div className="adventure-chat__controls">
          <input
            type="text"
            aria-label="Adventure response"
            placeholder="Your response will appear here..."
            disabled
          />
          <button type="button" disabled>
            Send
          </button>
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
