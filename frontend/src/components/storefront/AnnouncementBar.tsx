import { Megaphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAnnouncement } from '../../hooks/queries/useCatalog';

/** Cycles through all currently active storefront announcements. */
export const AnnouncementBar = () => {
  const { data = [] } = useAnnouncement();
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const visible = data.filter((announcement) => !dismissedIds.includes(announcement.id));
  const active = visible.length ? visible[activeIndex % visible.length] : null;

  useEffect(() => {
    if (paused || visible.length < 2) return;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % visible.length);
    }, 5_000);

    return () => window.clearInterval(timer);
  }, [paused, visible.length]);

  if (!active) return null;

  return (
    <div
      className="bg-ink-900 text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-sm sm:px-6 lg:px-8">
        <Megaphone aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-300" />
        <p key={active.id} role="status" aria-live="polite" className="flex-1 animate-fade-up">
          <span className="font-semibold">{active.title}:</span>{' '}
          <span className="text-ink-300">{active.message}</span>
        </p>
        {visible.length > 1 && (
          <span className="hidden shrink-0 text-xs text-ink-400 sm:inline" aria-label={`${activeIndex + 1} of ${visible.length}`}>
            {activeIndex + 1}/{visible.length}
          </span>
        )}
        <button
          type="button"
          aria-label="Dismiss announcement"
          onClick={() => {
            setDismissedIds((ids) => [...ids, active.id]);
          }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
