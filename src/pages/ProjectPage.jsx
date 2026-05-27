import { useRef } from 'react';
import { getParallaxOffset, useMainScroll } from '../hooks/useScrollParallax';

const PLACEHOLDER_BOXES = [
  { id: 1, label: 'Placeholder 01', speeds: [0.08, 0.14, 0.2] },
  { id: 2, label: 'Placeholder 02', speeds: [0.1, 0.18, 0.26] },
  { id: 3, label: 'Placeholder 03', speeds: [0.12, 0.2, 0.28] },
  { id: 4, label: 'Placeholder 04', speeds: [0.09, 0.16, 0.24] },
  { id: 5, label: 'Placeholder 05', speeds: [0.11, 0.19, 0.27] },
];

function ParallaxBox({ box, scrollY }) {
  const rootRef = useRef(null);
  const [slow, mid, fast] = box.speeds.map((speed) =>
    scrollY >= 0 && rootRef.current ? getParallaxOffset(rootRef.current, speed) : 0,
  );

  return (
    <article ref={rootRef} className="c-project-box">
      <div
        className="c-project-box__orb c-project-box__orb--slow"
        style={{ transform: `translate3d(-12%, ${slow}px, 0)` }}
        aria-hidden="true"
      />
      <div
        className="c-project-box__orb c-project-box__orb--mid"
        style={{ transform: `translate3d(68%, ${mid}px, 0)` }}
        aria-hidden="true"
      />
      <div
        className="c-project-box__orb c-project-box__orb--fast"
        style={{ transform: `translate3d(28%, ${fast}px, 0)` }}
        aria-hidden="true"
      />
      <div className="c-project-box__panel" style={{ transform: `translate3d(0, ${mid * 0.35}px, 0)` }}>
        <span className="c-project-box__label">{box.label}</span>
      </div>
    </article>
  );
}

export default function ProjectPage() {
  const heroRef = useRef(null);
  const scrollY = useMainScroll();

  const titleOffset = heroRef.current ? getParallaxOffset(heroRef.current, 0.04) : 0;
  const subtitleOffset = heroRef.current ? getParallaxOffset(heroRef.current, 0.07) : 0;
  const bubbleOffset = heroRef.current ? getParallaxOffset(heroRef.current, 0.12) : 0;

  return (
    <section className="c-project-page" aria-label="The Project">
      <header ref={heroRef} className="c-project-hero">
        <div
          className="c-project-hero__bubble c-project-hero__bubble--one"
          style={{ transform: `translate3d(0, ${bubbleOffset}px, 0)` }}
          aria-hidden="true"
        />
        <div
          className="c-project-hero__bubble c-project-hero__bubble--two"
          style={{ transform: `translate3d(0, ${bubbleOffset * 1.4}px, 0)` }}
          aria-hidden="true"
        />
        <h1 className="c-project-hero__title" style={{ transform: `translate3d(0, ${titleOffset}px, 0)` }}>
          Studio XYZ
        </h1>
        <p className="c-project-hero__subtitle" style={{ transform: `translate3d(0, ${subtitleOffset}px, 0)` }}>
          Built on Apechain
        </p>
      </header>

      <div className="c-project-boxes">
        {PLACEHOLDER_BOXES.map((box) => (
          <ParallaxBox key={box.id} box={box} scrollY={scrollY} />
        ))}
      </div>
    </section>
  );
}
