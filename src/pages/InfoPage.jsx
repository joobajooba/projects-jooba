import { useState } from 'react';

const INTRO_CONTENT = (
  <div className="info-content-wrapper">
    <div className="info-content-section">
      <h3 className="info-content-title">Introduction</h3>
      <p className="info-content-body">
        IMPLINGz is a fully on-chain generative pixel art NFT collection, with every character hand-drawn by me in Aseprite. This project has been an opportunity to apply everything I've learned over the past year of smart contract development while exploring a completely new art style. Building IMPLINGz has been both a technical challenge and a creative journey, combining on-chain development with hand-crafted pixel art.
      </p>
    </div>
    
    <div className="info-content-section">
      <h3 className="info-content-title">The Plans</h3>
      <p className="info-content-body">
        IMPLINGz is more than just a collection of artwork. Each NFT will soon unlock functionality on this website, allowing holders to make use of their IMPLINGz in new ways as the project evolves. My goal is to continue expanding the collection and webpage with engaging on-chain features while creating additional value for holders, including community-focused royalty initiatives.
      </p>
    </div>
    
    <div className="info-content-section">
      <h3 className="info-content-title">The Team</h3>
      <p className="info-content-body">
        IMPLINGz is currently a solo-developed passion project. Every aspect, from the artwork and smart contracts to the website and future features, is being built by me as I continue learning and improving my skills. I truly appreciate the patience, support, and feedback from the community. Every suggestion helps shape the future of the project, and my goal is to make IMPLINGz a fun, rewarding, and worthwhile experience for everyone involved.
      </p>
    </div>
  </div>
);

const ROADMAP_ITEMS = [
  {
    title: 'Implingz Selection',
    paragraphs: [
      'Holders will be able to choose which Impling they want to take with them on their adventure. Adventures will be hosted directly on this webpage.',
      'By connecting your wallet to the adventure site, you will be able to view the Impling NFTs held in your wallet and select one to accompany you. Your chosen Impling will become your guide as you progress through the adventure. A Rabby or MetaMask wallet is recommended for connecting to the adventure.',
    ],
    image: '/roadmap/roadmap-imp.png',
    imageAlt: 'An Impling wearing 3D glasses and a flaming cap',
  },
  {
    title: 'Start Your Adventure',
    paragraphs: [
      'Your Implingz are searching for the dungeons they lost along the way. Explore the wilds with them, track down hidden keeps, and push to claim what was lost through some mining tech inspired by UncleMac which was used on Mineboys.',
      'Hash mining is a process of searching for a specific matching hash. You use your IMPLINGZ to go adventuring and generate hashes using a changing number called a nonce. Each hash is checked until a matching hash is found. Your IMPLINGZ tier determines the speed at which hashes are generated, giving higher-tier IMPLINGZ a faster hash rate.',
      'When a winning hash is found, the smart contract verifies it, allowing you to use $DERP as gas to claim or acquire whatever reward has been discovered, such as NFTs or other in-game assets.',
    ],
    image: '/roadmap/roadmap-map.png',
    imageAlt: 'A pixel art treasure map scroll',
  },
  {
    title: 'Events',
    paragraphs: [
      'Face random encounters, trials, and surprises as you venture deeper into the dungeon. Every decision could change the course of your adventure, so pay attention and be prepared for whatever stands in your path.',
      'As your adventure progresses, you may encounter different events and challenges. While the hash mining process is taking place, prompts may appear on screen, giving you decisions to make before continuing your journey. Choose carefully, overcome the challenges in front of you, and see how far you and your Impling can go. Will you become the 1 Adventurer among the Implingz?',
    ],
    image: '/roadmap/roadmap-d20.gif',
    imageAlt: 'An animated pixel art D20 die spinning',
  },
  {
    title: 'Claimed Dungeons',
    paragraphs: [
      'The keep is yours, and the dungeon shall be claimed. You and your Impling faced the adventure together, overcame the challenges, and made them proud.',
    ],
    extended: {
      title: 'Extended Version',
      paragraphs: [
        'Make it to the end of your adventure and the dungeon will be yours to claim.',
        'You and your chosen Impling have faced the dangers, overcome the challenges, and earned your place within the dungeon. What happens after you claim it, and what your dungeon can become, will be revealed at a later date. Your adventure is only the beginning.',
      ],
    },
    image: '/roadmap/roadmap-dungeon.png',
    imageAlt: 'A pixel art dungeon with mossy stone platforms',
    imageWide: true,
  },
];

function RoadmapItemContent({ paragraphs, extended, image, imageAlt, imageWide = false }) {
  return (
    <div className="info-roadmap-item">
      <div className="info-roadmap-item__copy">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="info-roadmap-item__body">
            {paragraph}
          </p>
        ))}
        {extended && (
          <div className="info-roadmap-item__extended">
            <h4 className="info-roadmap-item__extended-title">{extended.title}</h4>
            {extended.paragraphs.map((paragraph) => (
              <p key={paragraph} className="info-roadmap-item__body">
                {paragraph}
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
  return (
    <div className="info-roadmap-list">
      {ROADMAP_ITEMS.map((item) => (
        <InfoBox
          key={item.title}
          title={item.title}
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
