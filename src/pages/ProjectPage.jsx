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

      <section ref={collageRef} className="c-project-collage" aria-label="Project highlights">
        <div className="c-project-collage__bg" aria-hidden="true" />
        <h2 className="c-project-collage__kicker">Carefully crafted</h2>
        <p className="c-project-collage__headline">Awe-inspiring experiences</p>

        <div className="c-project-collage__circles" aria-hidden="false">
          <Circle
            src={CIRCLE_IMAGES[0].src}
            alt={CIRCLE_IMAGES[0].alt}
            className={CIRCLE_IMAGES[0].className}
            anchorRef={collageRef}
            speed={0.08}
            scrollY={scrollY}
          />
          <Circle
            src={CIRCLE_IMAGES[1].src}
            alt={CIRCLE_IMAGES[1].alt}
            className={CIRCLE_IMAGES[1].className}
            anchorRef={collageRef}
            speed={0.12}
            scrollY={scrollY}
          />
          <Circle
            src={CIRCLE_IMAGES[2].src}
            alt={CIRCLE_IMAGES[2].alt}
            className={CIRCLE_IMAGES[2].className}
            anchorRef={collageRef}
            speed={0.16}
            scrollY={scrollY}
          />
          <Circle
            src={CIRCLE_IMAGES[3].src}
            alt={CIRCLE_IMAGES[3].alt}
            className={CIRCLE_IMAGES[3].className}
            anchorRef={collageRef}
            speed={0.1}
            scrollY={scrollY}
          />
          <Circle
            src={CIRCLE_IMAGES[4].src}
            alt={CIRCLE_IMAGES[4].alt}
            className={CIRCLE_IMAGES[4].className}
            anchorRef={collageRef}
            speed={0.14}
            scrollY={scrollY}
          />
        </div>
      </section>
    </section>
  );
}
