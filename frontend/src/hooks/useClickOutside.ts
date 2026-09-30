import { useEffect, useRef } from 'react';

/** Closes popovers on outside click or Escape. */
export const useClickOutside = <T extends HTMLElement>(active: boolean, onOutside: () => void) => {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;

    const handler = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOutside();
    };

    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [active, onOutside]);

  return ref;
};
