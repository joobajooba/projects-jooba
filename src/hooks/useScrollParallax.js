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

function getSectionDocumentTop(sectionEl, scrollY) {
  return sectionEl.getBoundingClientRect().top + scrollY;
}

/**
 * Progress 0 at the section's natural rest position (top of page / scroll back up).
 * Progress increases as the user scrolls down through the section — same idea as Wix/Awequatic layers.
 */
export function getCollageParallaxProgress(sectionEl, scrollY) {
  if (!sectionEl) return 0;

  const viewportHeight = window.innerHeight;
  const sectionHeight = sectionEl.offsetHeight;
  const sectionTop = getSectionDocumentTop(sectionEl, scrollY);

  const restScrollY = Math.max(0, sectionTop - viewportHeight * 0.32);
  const travelDistance = sectionHeight + viewportHeight * 0.55;
  const progress = (scrollY - restScrollY) / travelDistance;

  return Math.max(0, Math.min(1, progress));
}

export function getLayerParallaxY(progress, speed, depth, maxShift = 240) {
  const depthBoost = 0.65 + (6 - depth) * 0.12;
  return -progress * maxShift * speed * depthBoost;
}

export function getHeroParallaxY(sectionEl, scrollY, speed, maxShift = 48) {
  const progress = getCollageParallaxProgress(sectionEl, scrollY);
  return -progress * maxShift * speed;
}
