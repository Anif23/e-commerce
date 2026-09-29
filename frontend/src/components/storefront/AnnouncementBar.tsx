import { Megaphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAnnouncement } from '../../hooks/queries/useCatalog';

/** Site-wide promo banner. Dismissible for the session. */
export const AnnouncementBar = () => {
  const { data } = useAnnouncement();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [data?.id]);

  if (!data || dismissed) return null;

  return (
    <div className="bg-ink-900 text-white animate-fade-in">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-sm sm:px-6 lg:px-8">
        <Megaphone className="h-4 w-4 shrink-0 text-brand-300" />
        <p className="flex-1 truncate">
          <span className="font-semibold">{data.title}:</span> <span className="text-ink-300">{data.message}</span>
        </p>
        <button
          type="button"
          aria-label="Dismiss announcement"
          onClick={() => setDismissed(true)}
          className="rounded p-1 text-ink-400 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
