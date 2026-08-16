import { Fragment, useEffect, useState } from 'react';
import { AdventureInformation } from '../lib/adventureInformation';

const HIGHLIGHT_PATTERN = /(\$DERP|\$IMP|\bIMPLINGZ?\b|\bFREE\b)/gi;

function highlightText(text) {
  return text.split(HIGHLIGHT_PATTERN).map((part, index) => {
    if (!part) return null;
    if (/^\$DERP$/i.test(part)) {
      return (
        <span key={`${part}-${index}`} className="info-highlight info-highlight--derp">
          {part}
        </span>
      );
    }
    if (/^\$IMP$/i.test(part)) {
      return (
        <span key={`${part}-${index}`} className="info-highlight info-highlight--imp">
          {part}
        </span>
      );
    }
    if (/^FREE$/i.test(part)) {
      return (
        <span key={`${part}-${index}`} className="info-highlight info-highlight--free">
          {part}
        </span>
      );
    }
    if (/^IMPLINGZ?$/i.test(part)) {
      return (
        <span key={`${part}-${index}`} className="info-highlight info-highlight--impling">
          {part}
        </span>
      );
    }
    return part;
  });
}

const INTRO_CONTENT = (
  <div className="info-content-wrapper">
    <div className="info-content-section">
      <h3 className="info-content-title">Introduction</h3>
      <p className="info-content-body">
        {highlightText(
          "IMPLINGz is a fully on-chain generative pixel art NFT collection, with every character hand-drawn by me in Aseprite. This project has been an opportunity to apply everything I've learned over the past year of smart contract development while exploring a completely new art style. Building IMPLINGz has been both a technical challenge and a creative journey, combining on-chain development with hand-crafted pixel art."
        )}
      </p>
    </div>
    
    <div className="info-content-section">
      <h3 className="info-content-title">The Plans</h3>
      <p className="info-content-body">
        {highlightText(
          'IMPLINGz is more than just a collection of artwork. Each NFT will soon unlock functionality on this website, allowing holders to make use of their IMPLINGz in new ways as the project evolves. My goal is to continue expanding the collection and webpage with engaging on-chain features while creating additional value for holders, including community-focused royalty initiatives. Anything Impling related and the functionality to come will be FREE, I will never charge to use my tools, all that is required is gas fees.'
        )}
      </p>
    </div>
    
    <div className="info-content-section">
      <h3 className="info-content-title">The Team</h3>
      <p className="info-content-body">
        {highlightText(
          'IMPLINGz is currently a solo-developed passion project. Every aspect, from the artwork and smart contracts to the website and future features, is being built by me as I continue learning and improving my skills. I truly appreciate the patience, support, and feedback from the community. Every suggestion helps shape the future of the project, and my goal is to make IMPLINGz a fun, rewarding, and worthwhile experience for everyone involved.'
        )}
      </p>
    </div>
  </div>
);

const DIAGRAM_STAGES = [
  {
    title: 'IMPLINGz Mint',
    icon: '/roadmap/diagram-heart.png',
    side: 'top',
  },
  {
    title: 'Imp Adventures Chapter 1',
    icon: '/roadmap/diagram-map.png',
    side: 'bottom',
  },
  {
    title: 'The Dungeons',
    icon: '/roadmap/diagram-door.png',
    side: 'top',
  },
  {
    title: 'Staking',
    icon: '/roadmap/diagram-book.png',
    side: 'bottom',
  },
  {
    title: 'Improving Rewards Pot',
    icon: '/roadmap/diagram-chest.png',
    side: 'top',
  },
  {
    title: 'In-House Store',
    icon: '/roadmap/diagram-crystal.png',
    side: 'bottom',
  },
  {
    title: 'Product Upgrades',
    icon: '/roadmap/diagram-crown.png',
    side: 'top',
  },
  {
    title: 'Brand',
    icon: '/roadmap/diagram-duck.png',
    side: 'bottom',
  },
];

const ROADMAP_ITEMS = [
  {
    title: 'Implingz Selection',
    paragraphs: [
      'Holders will be able to choose which Impling they want to take with them on their adventure. Adventures will be hosted directly on this webpage.',
      'By connecting your wallet to the adventure site, you will be able to view the Impling NFTs held in your wallet and select one to accompany you. Your chosen Impling will become your guide as you progress through the adventure. A Rabby or MetaMask wallet is recommended for connecting to the adventure.',
    ],
    image: '/roadmap/roadmap-imp.gif',
    imageAlt: 'An animated pixel art Impling walking',
  },
  {
    title: 'Start Your Adventure',
    paragraphs: [
      'Your Implingz are searching for the dungeons they lost along the way. Explore the wilds with them, track down hidden keeps, and push to claim what was lost through some mining tech inspired by UncleMac which was used on Mineboys.',
      'Hash mining is a process of searching for a specific matching hash. You use your IMPLINGZ to go adventuring and generate hashes using a changing number called a nonce. Each hash is checked until a matching hash is found. Your IMPLINGZ tier determines the speed at which hashes are generated, giving higher-tier IMPLINGZ a faster hash rate.',
      'When a winning hash is found, the dungeon contract verifies it. Minting is free; you only pay ETH gas on Robinhood Chain to claim the keep.',
      'Face random encounters, trials, and surprises as you venture deeper into the dungeon. Every decision could change the course of your adventure, so pay attention and be prepared for whatever stands in your path.',
      'As your adventure progresses, you may encounter different events and challenges. While the hash mining process is taking place, prompts may appear on screen, giving you decisions to make before continuing your journey. Choose carefully, overcome the challenges in front of you, and see how far you and your Impling can go. Will you become the 1 Adventurer among the Implingz?',
    ],
    image: '/roadmap/roadmap-d20.gif',
    imageAlt: 'An animated pixel art D20 die spinning',
  },
  {
    title: 'Claimed Dungeons',
    paragraphs: [
      'You and your chosen Impling have faced the dangers, overcome the challenges, and earned your place within the dungeon, claimed with a free mint (ETH gas). OpenSea then reads the live contract and shows the revealed dungeon. List it on OpenSea in ETH if you want to trade.',
      'After keeps are being claimed, later stages can open on this site and on Anvil: staking, a bigger rewards pot, an in-house store, product upgrades, and brand. Those are not live yet.',
    ],
    image: '/roadmap/roadmap-map.gif',
    imageAlt: 'An animated pixel art treasure map scroll',
  },
  {
    title: 'Staking',
    paragraphs: [
      'Your IMPLINGz stay in your wallet. This is not a lockbox that takes the NFT away.',
      'When IMPLINGz is listed on Anvil, the market creates a collection token, $IMP. Holders can trade Imps for $IMP, and they can activate an Imp for a share of that market’s trading fees. Activation costs some $IMP. A higher tier costs more and earns a larger share. If you transfer or sell that Imp, the activation ends.',
      'Staking is optional. You can keep adventuring on j00ba.xyz without ever using Anvil.',
    ],
    image: '/roadmap/diagram-book.png',
    imageAlt: 'A pixel art spell book',
  },
  {
    title: 'Improving Rewards Pot',
    paragraphs: [
      'Adventures can already roll a small $DERP tip from a pot funded by royalties. $DERP is a real Robinhood Chain coin. Pots are active when adventures are running per Chapter.',
      'Later, a second jar can sit beside it for $IMP. I would put some $IMP into that jar so there is a chance of finding $DERP, $IMP, or sometimes both while you are out with your Imp. Drips stay small. They are a treat from the pot, not a paycheck, we aim to ensure pots contain enough when adventures are running.',
    ],
    image: '/roadmap/diagram-chest.png',
    imageAlt: 'A pixel art treasure chest',
  },
  {
    title: 'In-House Store',
    paragraphs: [
      'Once $IMP exists, this website can accept it. Connect your wallet, spend $IMP, and buy things that belong to IMPLINGz: whitelist spots, dungeon upgrades, or other extras I add over time.',
      'The store lives on j00ba.xyz, not on Anvil. You can still buy $IMP on Anvil if you want more, or find a little in the rewards pot. Shop prices will cost more than a lucky drip so the token keeps a job besides trading.',
      'Anything Impling-related on this site stays FREE to use. Spending $IMP in the store is optional. You only ever pay gas to use the tools.',
    ],
    image: '/roadmap/diagram-crystal.png',
    imageAlt: 'A pixel art crystal ball',
  },
  {
    title: 'Product Upgrades',
    paragraphs: [
      'This is the open later chapter: keep upgrades after mint, The Dungeon as a place you return to, seasonal extras, and whatever else fits the world once people are actually playing. Something we can keep improving as we progress.',
      'Impz is something we plan to constantly develop with fun features, meaningful collaborations, and a community that can keep growing!',
    ],
    image: '/roadmap/diagram-crown.png',
    imageAlt: 'A pixel art crown',
  },
  {
    title: 'Brand',
    paragraphs: [
      'IMPLINGz is more than a mint and a game loop. Brand is how the Imps, the keeps, and the people who hold them show up in the world — something you can recognise even when you are not on the site.',
      'That can mean merch, stickers, collabs, little objects, and other drops that promote the community and let holders carry IMPLINGz into real life and into other projects. There is no single finish line. The brand can keep opening new doors as the community grows, with room for ideas we have not thought of yet.',
      'This stage stays playful on purpose. IMPLINGz should feel like a world with infinite possibilities, not a checklist that ends when the last box is ticked.',
    ],
    image: '/roadmap/diagram-duck.png',
    imageAlt: 'A pixel art rubber duck',
  },
];

function RoadmapDiagram() {
  return (
    <div className="info-roadmap-diagram" aria-label="IMPLINGz roadmap diagram">
      <div className="info-roadmap-diagram__track">
        <div className="info-roadmap-diagram__spine" aria-hidden="true" />
        {DIAGRAM_STAGES.map((stage, index) => (
          <Fragment key={stage.title}>
            <article
              className={`info-roadmap-diagram__node info-roadmap-diagram__node--${stage.side}`}
              style={{ '--stage': index + 1 }}
            >
              <img className="info-roadmap-diagram__icon" src={stage.icon} alt="" />
              <span className="info-roadmap-diagram__label">{stage.title}</span>
            </article>
            <span
              className={`info-roadmap-diagram__stem info-roadmap-diagram__stem--${stage.side}`}
              style={{ '--stage': index + 1 }}
              aria-hidden="true"
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function RoadmapItemContent({ paragraphs, extended, image, imageAlt, imageWide = false }) {
  return (
    <div className="info-roadmap-item">
      <div className="info-roadmap-item__copy">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="info-roadmap-item__body">
            {highlightText(paragraph)}
          </p>
        ))}
        {extended && (
          <div className="info-roadmap-item__extended">
            <h4 className="info-roadmap-item__extended-title">{extended.title}</h4>
            {extended.paragraphs.map((paragraph) => (
              <p key={paragraph} className="info-roadmap-item__body">
                {highlightText(paragraph)}
              </p>
            ))}
          </div>
        )}
      </div>
      {image && (
        <div className="info-roadmap-item__media">
          <img
            className={`info-roadmap-item__image${imageWide ? ' info-roadmap-item__image--wide' : ''}`}
            src={image}
            alt={imageAlt}
          />
        </div>
      )}
    </div>
  );
}

function RoadmapContent() {
  const [diagramOpen, setDiagramOpen] = useState(false);

  useEffect(() => {
    if (!diagramOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDiagramOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [diagramOpen]);

  return (
    <div className="info-roadmap-list">
      <div className="faq-item faq-item--nested">
        <button
          type="button"
          className="faq-item__trigger"
          aria-haspopup="dialog"
          aria-expanded={diagramOpen}
          onClick={() => setDiagramOpen(true)}
        >
          <span className="faq-item__question">Diagram</span>
          <span className="faq-item__icon" aria-hidden="true">
            +
          </span>
        </button>
      </div>

      {diagramOpen ? (
        <div
          className="dm-modal info-roadmap-diagram-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="roadmap-diagram-title"
        >
          <button
            type="button"
            className="dm-modal__backdrop"
            aria-label="Close diagram"
            onClick={() => setDiagramOpen(false)}
          />
          <div className="dm-modal__panel dm-modal__panel--diagram">
            <button
              type="button"
              className="dm-modal__close"
              aria-label="Close popup"
              onClick={() => setDiagramOpen(false)}
            >
              ×
            </button>
            <h2 id="roadmap-diagram-title" className="dm-modal__title">
              Diagram
            </h2>
            <RoadmapDiagram />
          </div>
        </div>
      ) : null}

      {ROADMAP_ITEMS.map((item, index) => (
        <InfoBox
          key={item.title}
          title={
            <>
              <strong>Stage {index + 1}</strong> | {item.title}
            </>
          }
          content={
            <RoadmapItemContent
              paragraphs={item.paragraphs}
              extended={item.extended}
              image={item.image}
              imageAlt={item.imageAlt}
              imageWide={item.imageWide}
            />
          }
          nested
        />
      ))}
    </div>
  );
}

const BOXES = [
  {
    title: 'Introduction',
    content: INTRO_CONTENT,
  },
  {
    title: 'Roadmap',
    content: <RoadmapContent />,
  },
  {
    title: 'Adventures',
    content: <AdventureInformation />,
  },
];

function InfoBox({ title, content, nested = false }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`faq-item${open ? ' faq-item--open' : ''}${nested ? ' faq-item--nested' : ''}`}>
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
      {open && <div className="faq-item__answer">{content}</div>}
    </div>
  );
}

export default function InfoPage() {
  return (
    <div className="info-page">
      <div className="info-page__inner">
        <h1 className="info-page__title">Info</h1>
        <div className="faqs-list">
          {BOXES.map((box) => (
            <InfoBox
              key={box.title}
              title={box.title}
              content={box.content}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
