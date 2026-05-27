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

/** Use a stable anchor element (not the moving target) so transforms reset when scrolling back up. */
export function getParallaxOffset(anchorElement, speed) {
  if (!anchorElement) return 0;

  const rect = anchorElement.getBoundingClientRect();
  const scrolledIntoView = window.innerHeight - rect.top;
  const maxTravel = window.innerHeight * 1.25;
  const clamped = Math.max(-maxTravel, Math.min(maxTravel, scrolledIntoView));

  return -clamped * speed;
}
