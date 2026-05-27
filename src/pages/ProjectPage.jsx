import { useRef } from 'react';
import { getParallaxOffset, useMainScroll } from '../hooks/useScrollParallax';

const CIRCLE_IMAGES = [
  { src: '/project-circles/circle-1.png', alt: 'Project circle image 1', className: 'c-project-circle--one' },
  { src: '/project-circles/circle-2.png', alt: 'Project circle image 2', className: 'c-project-circle--two' },
  { src: '/project-circles/circle-3.png', alt: 'Project circle image 3', className: 'c-project-circle--three' },
  { src: '/project-circles/circle-4.png', alt: 'Project circle image 4', className: 'c-project-circle--four' },
  { src: '/project-circles/circle-5.png', alt: 'Project circle image 5', className: 'c-project-circle--five' },
];

function Circle({ src, alt, className, anchorRef, speed, scrollY }) {
  const offset = anchorRef.current ? getParallaxOffset(anchorRef.current, speed) : 0;
  const y = scrollY >= 0 ? offset : 0;

  return (
    <figure className={`c-project-circle ${className}`} style={{ transform: `translate3d(0, ${y}px, 0)` }}>
      <img src={src} alt={alt} loading="lazy" />
    </figure>
  );
}

export default function ProjectPage() {
  const heroRef = useRef(null);
  const collageRef = useRef(null);
  const scrollY = useMainScroll();

  const titleOffset = heroRef.current ? getParallaxOffset(heroRef.current, 0.04) : 0;
  const subtitleOffset = heroRef.current ? getParallaxOffset(heroRef.current, 0.07) : 0;

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

      <section ref={collageRef} className="c-project-collage" aria-label="Project highlights">
        <div className="c-project-collage__circles">
          {CIRCLE_IMAGES.map((image, index) => (
            <Circle
              key={image.src}
              src={image.src}
              alt={image.alt}
              className={image.className}
              anchorRef={collageRef}
              speed={[0.08, 0.12, 0.16, 0.1, 0.14][index]}
              scrollY={scrollY}
            />
          ))}
        </div>
      </section>

      <section className="c-project-phase" aria-labelledby="project-phase-title">
        <h2 id="project-phase-title" className="c-project-phase__title">
          Phase 1 - J00B-A Mint
        </h2>
        <p className="c-project-phase__text">
          J00B-A mint is expected to run in July 2026 and will be minted using Apecoin. This collection of NFTs will be
          utilised for our on-chain game, and avatars for Otherside.
        </p>
      </section>
    </section>
  );
}
