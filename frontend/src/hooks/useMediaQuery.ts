import { useCallback, useSyncExternalStore } from 'react';

/**
 * Subscribes to a media query with `useSyncExternalStore`, so the value is
 * correct on the first render (and during SSR) instead of after an effect.
 */
export const useMediaQuery = (query: string) => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onStoreChange);
      return () => list.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};

export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
