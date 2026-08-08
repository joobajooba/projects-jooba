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

const ROADMAP_CONTENT = (
  <div className="info-content-wrapper">
    <div className="info-content-section">
      <h3 className="info-content-title">01 | IMPLINGz Mint</h3>
      <p className="info-content-body">
        The adventure begins.
        <br /><br />
        IMPLINGz launched with a free mint on OpenSea on 07/08/2026. The first step of the journey is complete. The Implingz have found their adventurers — now it’s time to discover where they’ll lead them.
      </p>
    </div>

    <div className="info-content-section">
      <h3 className="info-content-title">02 | Starting the Adventure</h3>
      <p className="info-content-body">
        Your Impling is your guide.
        <br /><br />
        The next chapter introduces a tool that lets holders take their IMPLINGz on adventures. Choose your path, explore the unknown and see what you can uncover along the way. Inspired by classic D&D campaigns, every journey has the potential for something unexpected. Who knows what you’ll find...?
      </p>
    </div>

    <div className="info-content-section">
      <h3 className="info-content-title">03 | The Dungeon</h3>
      <p className="info-content-body">
        So... you think you've got what it takes?
        <br /><br />
        The adventure goes deeper.
        <br /><br />
        We'll see.
      </p>
    </div>
  </div>
);

const BOXES = [
  {
    title: 'Introduction',
    content: INTRO_CONTENT,
  },
  {
    title: 'Roadmap',
    content: ROADMAP_CONTENT,
  },
];

function InfoBox({ title, content }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`faq-item${open ? ' faq-item--open' : ''}`}>
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
