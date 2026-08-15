import { useState } from 'react';

const HIGHLIGHT_PATTERN = /(\$DERP|\bImp\b|\b4444\b|\bfree\b)/gi;

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

export default function AdventuresPage() {
  return (
    <div className="adventures-page">
      <div className="adventures-page__inner">
        <header className="adventures-page__header">
          <p className="adventures-page__eyebrow">Chapter 1</p>
          <h1 className="adventures-page__title">Adventures</h1>
          <p className="adventures-page__intro">
            {highlightText(
              'Chapter 1 is one loop: an Imp goes into the wilds, hash mining uncovers a lost dungeon, and that keep is either minted or gone forever.'
            )}
          </p>
        </header>

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
      </div>
    </div>
  );
}
