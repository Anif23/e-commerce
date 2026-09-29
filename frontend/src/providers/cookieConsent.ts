import { createContext, useContext } from 'react';

/**
 * Cookie consent state for Asnif Store.
 *
 * - The choice is stored in localStorage *and* mirrored into a first-party
 *   cookie (`asnif_consent`) so server-side code and any reverse proxy can read it.
 * - Consent is versioned: bump CONSENT_VERSION when a new cookie category is
 *   introduced and the banner is shown again to everyone.
 */

export type CookieCategory = 'essential' | 'preferences' | 'analytics' | 'marketing';

export type Consent = Record<CookieCategory, boolean>;

export const STORAGE_KEY = 'asnif.consent';
export const COOKIE_NAME = 'asnif_consent';
export const CONSENT_VERSION = 1;
export const MAX_AGE_DAYS = 365;

export const DENY_ALL: Consent = { essential: true, preferences: false, analytics: false, marketing: false };
export const ALLOW_ALL: Consent = { essential: true, preferences: true, analytics: true, marketing: true };

export type ConsentContextValue = {
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

export const ConsentContext = createContext<ConsentContextValue | null>(null);

export const useCookieConsent = () => {
  const context = useContext(ConsentContext);
  if (!context) throw new Error('useCookieConsent must be used inside <CookieConsentProvider>');
  return context;
};
