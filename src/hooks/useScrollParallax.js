import { useEffect, useState } from 'react';

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

export function getCollageParallaxProgress(sectionEl, scrollY) {
  if (!sectionEl) return 0;

  const sectionTopDoc = sectionEl.getBoundingClientRect().top + scrollY;
  const start = sectionTopDoc - window.innerHeight * 0.25;
  const travel = Math.max(sectionEl.offsetHeight * 0.95, window.innerHeight * 0.7);
  const progress = (scrollY - start) / travel;

  return Math.max(0, Math.min(1, progress));
}

export function getLayerParallaxY(progress, speed, depth, maxShift = 380) {
  const depthBoost = 0.72 + (6 - depth) * 0.16;
  return -progress * maxShift * speed * depthBoost;
}

export function getHeroParallaxY(progress, speed, maxShift = 84) {
  return -progress * maxShift * speed;
}
