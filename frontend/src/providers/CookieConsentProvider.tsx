import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ALLOW_ALL,
  CONSENT_VERSION,
  COOKIE_NAME,
  ConsentContext,
  DENY_ALL,
  MAX_AGE_DAYS,
  STORAGE_KEY,
  type Consent,
  type ConsentContextValue,
} from './cookieConsent';

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

/**
 * Holds the visitor's cookie choice, persists it (localStorage + cookie) and
 * loads optional analytics only after consent — removing it again on revoke.
 */
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

  const save = useCallback((next: Omit<Consent, 'essential'>) => persist({ essential: true, ...next }), [persist]);

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
