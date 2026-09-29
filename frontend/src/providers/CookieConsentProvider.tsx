import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Cookie consent for Asnif Store.
 *
 * - The choice is stored in localStorage *and* mirrored into a first-party
 *   cookie (`asnif_consent`) so server-side code and any reverse proxy can read it.
 * - Consent is versioned: bump CONSENT_VERSION when a new cookie category is
 *   introduced and the banner is shown again to everyone.
 * - Optional analytics (Google Analytics / Plausible-style snippet) only loads
 *   after analytics consent is granted, and is removed again if it is revoked.
 */

export type CookieCategory = 'essential' | 'preferences' | 'analytics' | 'marketing';

export type Consent = Record<CookieCategory, boolean>;

const STORAGE_KEY = 'asnif.consent';
const COOKIE_NAME = 'asnif_consent';
const CONSENT_VERSION = 1;
const MAX_AGE_DAYS = 365;

const DENY_ALL: Consent = { essential: true, preferences: false, analytics: false, marketing: false };
const ALLOW_ALL: Consent = { essential: true, preferences: true, analytics: true, marketing: true };

const readStored = (): (Consent & { decidedAt: string; version: number }) | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<Consent> & { decidedAt?: string; version?: number };
    if (parsed.version !== CONSENT_VERSION) return null;

    return {
      essential: true,
      preferences: Boolean(parsed.preferences),
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      decidedAt: parsed.decidedAt ?? new Date().toISOString(),
      version: CONSENT_VERSION,
    };
  } catch {
    return null;
  }
};

const setCookie = (consent: Consent) => {
  const value = encodeURIComponent(
    JSON.stringify({
      version: CONSENT_VERSION,
      essential: true,
      preferences: consent.preferences,
      analytics: consent.analytics,
      marketing: consent.marketing,
    }),
  );

  document.cookie = `${COOKIE_NAME}=${value}; max-age=${MAX_AGE_DAYS * 24 * 60 * 60}; path=/; SameSite=Lax`;
};

type ConsentContextValue = {
  /** null until a decision exists (or the stored decision is from an older policy version). */
  consent: Consent | null;
  hasDecided: boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
  save: (next: Omit<Consent, 'essential'>) => void;
  /** Opens the preferences dialog from the footer / cookie policy page. */
  reopen: () => void;
  closeDialog: () => void;
  dialogOpen: boolean;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<Consent | null>(() => (typeof window === 'undefined' ? null : readStored()));
  const [dialogOpen, setDialogOpen] = useState(false);

  const persist = useCallback((next: Consent) => {
    const record = { ...next, essential: true, version: CONSENT_VERSION, decidedAt: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    setCookie(next);
    setConsent(next);
    setDialogOpen(false);
  }, []);

  const acceptAll = useCallback(() => persist(ALLOW_ALL), [persist]);
  const rejectOptional = useCallback(() => persist(DENY_ALL), [persist]);

  const save = useCallback(
    (next: Omit<Consent, 'essential'>) => persist({ essential: true, ...next }),
    [persist],
  );

  /* Optional analytics only ever runs with consent, and is torn down on revoke. */
  const analyticsId = import.meta.env.VITE_ANALYTICS_ID as string | undefined;
  useEffect(() => {
    if (!analyticsId || !consent?.analytics) return;

    const existing = document.getElementById('asnif-analytics');
    if (existing) return;

    const script = document.createElement('script');
    script.id = 'asnif-analytics';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${analyticsId}`;
    document.head.appendChild(script);

    const dataLayer = (window as unknown as { dataLayer?: unknown[] }).dataLayer ?? [];
    (window as unknown as { dataLayer: unknown[] }).dataLayer = dataLayer;
    dataLayer.push('js', new Date());
    dataLayer.push('config', analyticsId, { anonymize_ip: true });
  }, [analyticsId, consent?.analytics]);

  useEffect(() => {
    if (consent?.analytics) return;
    document.getElementById('asnif-analytics')?.remove();
  }, [consent?.analytics]);

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      hasDecided: consent !== null,
      acceptAll,
      rejectOptional,
      save,
      reopen: () => setDialogOpen(true),
      closeDialog: () => setDialogOpen(false),
      dialogOpen,
    }),
    [acceptAll, consent, dialogOpen, rejectOptional, save],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export const useCookieConsent = () => {
  const context = useContext(ConsentContext);
  if (!context) throw new Error('useCookieConsent must be used inside <CookieConsentProvider>');
  return context;
};

export const CONSENT_COOKIE_NAME = COOKIE_NAME;
