import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Keeps the viewport at the top when navigating between pages. */
export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
};
