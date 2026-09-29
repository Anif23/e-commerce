import { useEffect, useRef, useState } from 'react';

/**
 * Adds `is-revealed` when an element scrolls into view.
 * Uses one shared IntersectionObserver per hook call and disconnects on unmount
 * so long lists do not leak observers.
 */
export const useReveal = <T extends HTMLElement = HTMLDivElement>(options = {}) => {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05, ...options },
    );

    observer.observe(node);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, revealed };
};

/** Wrapper hook for lists: reveals once and lets CSS stagger the children. */
export const useStaggerReveal = <T extends HTMLElement = HTMLDivElement>() => useReveal<T>();
