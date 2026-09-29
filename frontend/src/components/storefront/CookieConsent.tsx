import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, Settings2 } from 'lucide-react';

import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Field';
import { Modal } from '../ui/Overlay';
import { useCookieConsent } from '../../providers/cookieConsent';
import { cn } from '../../lib/cn';

type CategoryKey = 'preferences' | 'analytics' | 'marketing';

const CATEGORIES: { key: CategoryKey; title: string; description: string }[] = [
  {
    key: 'preferences',
    title: 'Preferences',
    description: 'Remembers your last used address, recently viewed products and layout choices.',
  },
  {
    key: 'analytics',
    title: 'Analytics',
    description: 'Anonymous statistics about visits and checkout drop-off. Never used to identify you personally.',
  },
  {
    key: 'marketing',
    title: 'Marketing',
    description: 'Measures campaigns so the offers you see are relevant. Off while you browse as a guest by default.',
  },
];

/**
 * Preferences dialog body. It only mounts while the dialog is open, so the
 * checkboxes can be initialised straight from the stored choice — no effect, no
 * extra render pass.
 */
const PreferencesForm = ({
  initial,
  onSave,
}: {
  initial: Record<CategoryKey, boolean>;
  onSave: (next: Record<CategoryKey, boolean>) => void;
}) => {
  const [draft, setDraft] = useState(initial);

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-500">
        Choose what Asnif Store may store in your browser. Essential cookies are always on — without them sign-in, cart
        and checkout cannot work.
      </p>

      <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink-900">Essential</p>
            <p className="mt-0.5 text-xs text-ink-500">
              Session, security, cart and your cookie choice. Cannot be disabled.
            </p>
          </div>
          <span className="mt-0.5 shrink-0 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Always on
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {CATEGORIES.map((category) => (
          <div key={category.key} className="rounded-xl border border-ink-200 p-4">
            <Checkbox
              label={<span className="text-sm font-semibold text-ink-900">{category.title}</span>}
              description={category.description}
              checked={draft[category.key]}
              onChange={(checked) => setDraft((current) => ({ ...current, [category.key]: checked }))}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 pt-4">
        <Button variant="ghost" onClick={() => onSave({ preferences: false, analytics: false, marketing: false })}>
          Reject optional
        </Button>
        <Button variant="secondary" onClick={() => onSave(draft)}>
          Save choices
        </Button>
        <Button onClick={() => onSave({ preferences: true, analytics: true, marketing: true })}>Accept all</Button>
      </div>
    </div>
  );
};

/**
 * Cookie banner + preferences dialog.
 * The banner appears once (per consent version) and the dialog can be reopened
 * from the footer or the cookie policy page.
 */
export const CookieConsent = () => {
  const { consent, hasDecided, acceptAll, rejectOptional, save, dialogOpen, reopen, closeDialog } = useCookieConsent();

  const showBanner = !hasDecided && !dialogOpen;

  return (
    <>
      {/* Banner: fixed to the bottom, never blocks the page behind it. */}
      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 transition-all duration-300 sm:px-6',
          showBanner ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0',
        )}
        aria-hidden={!showBanner}
      >
        <div
          role="dialog"
          aria-label="Cookie consent"
          className="pointer-events-auto mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-lg sm:flex-row sm:items-center sm:gap-6"
        >
          <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 sm:grid">
            <Cookie className="h-5 w-5" />
          </span>

          <div className="flex-1">
            <p className="text-sm font-semibold text-ink-900">We use cookies 🍪</p>
            <p className="mt-1 text-sm text-ink-500">
              Essential cookies keep you signed in and your cart safe. Analytics and marketing cookies are optional and
              run only if you allow them. Read our{' '}
              <Link to="/policies/cookies" className="text-brand-700 underline underline-offset-2">
                Cookie Policy
              </Link>{' '}
              and{' '}
              <Link to="/policies/privacy" className="text-brand-700 underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={reopen}>
              <Settings2 className="h-4 w-4" /> Customise
            </Button>
            <Button variant="secondary" size="sm" onClick={rejectOptional}>
              Reject optional
            </Button>
            <Button size="sm" onClick={acceptAll}>
              Accept all
            </Button>
          </div>
        </div>
      </div>

      <Modal open={dialogOpen} onClose={closeDialog} title="Cookie preferences">
        <PreferencesForm
          initial={{
            preferences: consent?.preferences ?? false,
            analytics: consent?.analytics ?? false,
            marketing: consent?.marketing ?? false,
          }}
          onSave={save}
        />
      </Modal>
    </>
  );
};
