const CIRCLE_IMAGES = [
  { src: '/project-circles/circle-1.png', alt: 'Project circle image 1', className: 'c-project-circle--one', depth: 1 },
  { src: '/project-circles/circle-2.png', alt: 'Project circle image 2', className: 'c-project-circle--two', depth: 2 },
  { src: '/project-circles/circle-3.png', alt: 'Project circle image 3', className: 'c-project-circle--three', depth: 3 },
  { src: '/project-circles/circle-4.png', alt: 'Project circle image 4', className: 'c-project-circle--four', depth: 4 },
  { src: '/project-circles/circle-5.png', alt: 'Project circle image 5', className: 'c-project-circle--five', depth: 5 },
  { src: '/project-circles/circle-6.png', alt: 'Project circle image 6', className: 'c-project-circle--six', depth: 2 },
  { src: '/project-circles/circle-7.png', alt: 'Project circle image 7', className: 'c-project-circle--seven', depth: 1 },
  { src: '/project-circles/circle-8.png', alt: 'Project circle image 8', className: 'c-project-circle--eight', depth: 3 },
  { src: '/project-circles/circle-9.png', alt: 'Project circle image 9', className: 'c-project-circle--nine', depth: 2 },
];

const PHASES = [
  {
    title: 'Phase 1',
    subtitle: 'J00B-A Mint',
    imageSrc: '/phase-images/phase-1-side-banner.png',
    imageAlt: 'Phase 1 character lineup artwork',
    textParts: [
      { text: 'J00B-A', highlight: true },
      { text: ' mint is expected to run in July 2026 and will be minted using ' },
      { text: 'Apecoin', highlight: true },
      { text: '. This collection of NFTs will be utilised for our on-chain game, and avatars for Otherside.' },
    ],
  },
  {
    title: 'Phase 2',
    subtitle: 'Proelium Packs',
    textParts: [
      { text: 'Use ' },
      { text: 'Apecoin', highlight: true },
      { text: ' to buy packs to collect and use trading cards from Set-01. These will have further functionality in a later phase!' },
    ],
  },
  {
    title: 'Phase 3',
    subtitle: 'J00B-A Leader Creation',
    textParts: [
      { text: 'Use your ' },
      { text: 'J00B-A', highlight: true },
      { text: ' mints to create a ' },
      { text: '1/1 Leader', highlight: true },
      { text: ' for Proelium that will be a tradeable assets alongside the rest of the card sets. This will be ' },
      { text: 'minted', highlight: true },
      { text: ' on Apechain.' },
    ],
  },
  {
    title: 'Phase 4',
    subtitle: 'Deck Building + Collection',
    textParts: [
      { text: 'Use your cards to build and save ' },
      { text: 'decks', highlight: true },
      { text: ' in Proelium. You can also view your ' },
      { text: 'collection', highlight: true },
      { text: ' here to see what you are missing from each set.' },
    ],
  },
  {
    title: 'Phase 5',
    subtitle: 'Proelium Beta',
    textParts: [
      { text: 'Our first ' },
      { text: 'playtests', highlight: true },
      { text: ' to be conducted for Proelium, a ' },
      { text: 'WL', highlight: true },
      { text: ' will be created at the time to have an organised group of test-users.' },
    ],
  },
  {
    title: 'Phase 6',
    subtitle: 'Proelium Release',
    textParts: [
      { text: 'The official Proelium release, available for ' },
      { text: 'anyone', highlight: true },
      { text: ' to play, with ' },
      { text: 'pre-con', highlight: true },
      { text: ' decks avaialble for those who did not mint or open packs.' },
    ],
  },
];

function Circle({ src, alt, className, depth }) {
  return (
    <figure className={`c-project-circle ${className}`} style={{ zIndex: depth }} data-depth={depth}>
      <img src={src} alt={alt} loading="lazy" />
    </figure>
  );
}

export default function ProjectPage() {
  return (
    <section className="c-project-page" aria-label="The Project">
      <header className="c-project-hero">
        <h1 className="c-project-hero__title">Studio XYZ</h1>
        <p className="c-project-hero__subtitle">Built on Apechain</p>
      </header>

      <section className="c-project-collage" aria-label="Project highlights">
        <div className="c-project-collage__circles">
          {CIRCLE_IMAGES.map((image) => (
            <Circle key={image.src} src={image.src} alt={image.alt} className={image.className} depth={image.depth} />
          ))}
        </div>
      </section>
      <hr className="c-project-section-divider" aria-hidden="true" />

      <section className="c-project-scope" aria-labelledby="project-scope-title">
        <h2 id="project-scope-title" className="c-project-scope__title">
          Proelium
        </h2>
        <h3 className="c-project-scope__subtitle">Introduction</h3>
        <p className="c-project-scope__text">
          Our studio is developing an on-chain trading card game within the ApeChain ecosystem. In Proelium, players can
          collect card sets, battle against others, and create unique 1/1 cards.
        </p>
        <p className="c-project-scope__text">
          As lifelong fans of trading card games, our team has always wanted to build a game of our own, from designing
          gameplay mechanics to creating original artwork. We believe there is no better time to build this experience than
          alongside the continued growth of ApeChain and its community.
        </p>
        <p className="c-project-scope__text">
          Proelium will primarily revolve around mintable card collections, obtained either through the minting of specific
          Archetypes or by opening booster packs to collect cards from each Set. All collectible cards and unique minted
          assets will be fully tradable on OpenSea and viewable both on the OpenSea marketplace and through our official
          platform interface.
        </p>
        <p className="c-project-scope__text">
          However, accessibility is a core part of our vision. To ensure anyone can participate, including players who may
          miss mints or lack the funds to purchase collectible cards, we will provide preconstructed (\"precon\") decks with
          non-limited cards available in infinite supply. These cards are designed purely for gameplay accessibility and
          will not belong to official collectible Sets.
        </p>
        <p className="c-project-scope__text">
          For more information on our development timeline and long-term vision, please see the project phases outlined
          below.
        </p>
      </section>
      <hr className="c-project-section-divider" aria-hidden="true" />

      <div className="c-project-phases">
        {PHASES.map((phase, index) => (
          <section
            key={phase.title + phase.subtitle}
            className={`c-project-phase${index % 2 === 1 ? ' c-project-phase--right' : ' c-project-phase--left'}${phase.imageSrc ? ' c-project-phase--with-image' : ''}`}
            aria-labelledby={`project-phase-title-${index}`}
          >
            <div className="c-project-phase__content">
              <h2 id={`project-phase-title-${index}`} className="c-project-phase__title">
                {phase.title}
              </h2>
              <p className="c-project-phase__subtitle">{phase.subtitle}</p>
              <p className="c-project-phase__text">
                {phase.textParts.map((part, partIndex) =>
                  part.highlight ? (
                    <span key={`${phase.title}-part-${partIndex}`} className="c-project-phase__text-highlight">
                      {part.text}
                    </span>
                  ) : (
                    <span key={`${phase.title}-part-${partIndex}`}>{part.text}</span>
                  ),
                )}
              </p>
            </div>
            {phase.imageSrc ? (
              <figure className="c-project-phase__image-wrap">
                <img className="c-project-phase__image" src={phase.imageSrc} alt={phase.imageAlt ?? ''} loading="lazy" />
              </figure>
            ) : null}
          </section>
        ))}
      </div>
    </section>
  );
}
