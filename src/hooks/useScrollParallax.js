import { useEffect, useRef, useState } from 'react';

export function useMainScroll() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      setScrollY(window.scrollY);
      frame = 0;
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return scrollY;
}

/**
 * Awequatic-style: measure collage position on first layout, then move layers as
 * the section travels upward through the viewport. Scrolling back restores baseline.
 */
export function useCollageParallax(sectionRef, scrollY, ready) {
  const baselineTopRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!ready) return undefined;

    const section = sectionRef.current;
    if (!section) return undefined;

    if (baselineTopRef.current === null) {
      baselineTopRef.current = section.getBoundingClientRect().top;
    }

    const top = section.getBoundingClientRect().top;
    const travel = Math.max(section.offsetHeight * 0.95, window.innerHeight * 0.55);
    const next = Math.max(0, Math.min(1, (baselineTopRef.current - top) / travel));
    setProgress(next);

    return undefined;
  }, [scrollY, ready, sectionRef]);

  useEffect(() => {
    const resetBaseline = () => {
      baselineTopRef.current = null;
    };
    window.addEventListener('resize', resetBaseline);
    return () => window.removeEventListener('resize', resetBaseline);
  }, []);

  return progress;
}

export function getLayerParallaxY(progress, speed, depth, maxShift = 320) {
  const depthBoost = 0.7 + (6 - depth) * 0.14;
  return -progress * maxShift * speed * depthBoost;
}

export function getHeroParallaxY(progress, speed, maxShift = 70) {
  return -progress * maxShift * speed;
}
