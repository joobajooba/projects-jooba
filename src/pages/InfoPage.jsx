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
    body:
      'Choose the Impling you want at your side. Each holder picks their champion before stepping into a D&D-style adventure built around your IMPLINGz.',
    image: '/roadmap/roadmap-imp.png',
    imageAlt: 'An Impling wearing 3D glasses and a flaming cap',
  },
  {
    title: 'Start Your Adventure',
    body:
      'Your Implingz are searching for the dungeons they lost along the way. Explore the wilds with them, track down hidden keeps, and push to claim what was taken.',
    image: '/roadmap/roadmap-map.png',
    imageAlt: 'A pixel art treasure map scroll',
  },
  {
    title: 'Events',
    body:
      'Face random encounters, trials, and surprises as you go deeper. Overcome each challenge to secure ground—and win back the dungeons piece by piece.',
    image: '/roadmap/roadmap-d20.png',
    imageAlt: 'A pixel art D20 die',
  },
  {
    title: 'Claimed Dungeons',
    body:
      'The keep is yours and the dungeons are back where they belong. Your Impling earned it—and you made them proud.',
    image: '/roadmap/roadmap-dungeon.png',
    imageAlt: 'A pixel art dungeon with mossy stone platforms',
    imageWide: true,
  },
];

function RoadmapItemContent({ body, image, imageAlt, imageWide = false }) {
  return (
    <div className="info-roadmap-item">
      <p className="info-roadmap-item__body">{body}</p>
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
              body={item.body}
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
