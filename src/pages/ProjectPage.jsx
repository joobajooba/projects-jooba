import { useCallback, useRef } from 'react';
import { getCollageParallaxProgress, getHeroParallaxY, getLayerParallaxY, useMainScroll } from '../hooks/useScrollParallax';

const CIRCLE_IMAGES = [
  { src: '/project-circles/circle-1.png', alt: 'Project circle image 1', className: 'c-project-circle--one', speed: 1, depth: 1 },
  { src: '/project-circles/circle-2.png', alt: 'Project circle image 2', className: 'c-project-circle--two', speed: 0.82, depth: 2 },
  {
    src: '/project-circles/circle-3.png',
    alt: 'Project circle image 3',
    className: 'c-project-circle--three',
    speed: 0.68,
    depth: 3,
  },
  { src: '/project-circles/circle-4.png', alt: 'Project circle image 4', className: 'c-project-circle--four', speed: 0.9, depth: 4 },
  { src: '/project-circles/circle-5.png', alt: 'Project circle image 5', className: 'c-project-circle--five', speed: 0.55, depth: 5 },
];

const PHASES = [
  {
    title: 'Phase 1',
    subtitle: 'J00B-A Mint',
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

function Circle({ src, alt, className, progress, speed, depth }) {
  const y = getLayerParallaxY(progress, speed, depth);

  return (
    <figure
      className={`c-project-circle ${className}`}
      style={{ transform: `translate3d(0, ${y}px, 0)`, zIndex: depth }}
      data-depth={depth}
    >
      <img src={src} alt={alt} loading="lazy" />
    </figure>
  );
}

export default function ProjectPage() {
  const heroRef = useRef(null);
  const collageRef = useRef(null);
  const scrollY = useMainScroll();

  const setCollageRef = useCallback((node) => {
    collageRef.current = node;
  }, []);

  const collageProgress = collageRef.current ? getCollageParallaxProgress(collageRef.current, scrollY) : 0;
  const titleOffset = getHeroParallaxY(collageProgress, 0.45);
  const subtitleOffset = getHeroParallaxY(collageProgress, 0.75);
  const waveOffset = getLayerParallaxY(collageProgress, 0.2, 3, 90);

  return (
    <section className="c-project-page" aria-label="The Project">
      <header ref={heroRef} className="c-project-hero">
        <h1 className="c-project-hero__title" style={{ transform: `translate3d(0, ${titleOffset}px, 0)` }}>
          Studio XYZ
        </h1>
        <p className="c-project-hero__subtitle" style={{ transform: `translate3d(0, ${subtitleOffset}px, 0)` }}>
          Built on Apechain
        </p>
      </header>

      <section ref={setCollageRef} className="c-project-collage" aria-label="Project highlights">
        <div className="c-project-collage__circles">
          {CIRCLE_IMAGES.map((image) => (
            <Circle
              key={image.src}
              src={image.src}
              alt={image.alt}
              className={image.className}
              progress={collageProgress}
              speed={image.speed}
              depth={image.depth}
            />
          ))}
        </div>
        <div className="c-project-transition" aria-hidden="true">
          <span className="c-project-transition__wave c-project-transition__wave--one" style={{ transform: `translate3d(0, ${waveOffset}px, 0)` }} />
          <span
            className="c-project-transition__wave c-project-transition__wave--two"
            style={{ transform: `translate3d(0, ${waveOffset * 1.25}px, 0)` }}
          />
          <span
            className="c-project-transition__wave c-project-transition__wave--three"
            style={{ transform: `translate3d(0, ${waveOffset * 1.5}px, 0)` }}
          />
        </div>
      </section>

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
