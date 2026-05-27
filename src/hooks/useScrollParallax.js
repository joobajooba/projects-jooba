import { useEffect, useState } from 'react';

const MAIN_SELECTOR = '.l-page__main';

export function useMainScroll() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const container = document.querySelector(MAIN_SELECTOR);
    if (!container) return undefined;

    let frame = 0;

    const update = () => {
      setScrollY(container.scrollTop);
      frame = 0;
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return scrollY;
}

export function getParallaxOffset(element, speed) {
  const container = document.querySelector(MAIN_SELECTOR);
  if (!element || !container) return 0;

  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const relativeTop = elementRect.top - containerRect.top;
  const distance = container.clientHeight - relativeTop;

  return -distance * speed;
}
