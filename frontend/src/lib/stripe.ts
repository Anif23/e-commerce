/**
 * Minimal Stripe.js loader.
 *
 * The full `@stripe/stripe-js` package is not a dependency here — the SDK is
 * pulled from Stripe's CDN once and cached, so nothing is downloaded unless the
 * shopper actually picks the card option.
 */

export interface StripeCardElement {
  mount: (selector: string | HTMLElement) => void;
  destroy: () => void;
  on: (event: string, handler: (event: { error?: { message?: string }; complete?: boolean }) => void) => void;
}

interface StripeElements {
  create: (type: 'card', options?: Record<string, unknown>) => StripeCardElement;
}

export interface StripeInstance {
  elements: (options?: Record<string, unknown>) => StripeElements;
  confirmCardPayment: (
    clientSecret: string,
    data?: Record<string, unknown>,
  ) => Promise<{ paymentIntent?: { id: string; status?: string }; error?: { message?: string } }>;
}

type StripeFactory = (key: string) => StripeInstance;

const SCRIPT_URL = 'https://js.stripe.com/v3/';
let promise: Promise<StripeFactory> | null = null;

export const loadStripeJs = (): Promise<StripeFactory> => {
  if (promise) return promise;

  promise = new Promise<StripeFactory>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);

    if (existing) {
      const factory = (window as unknown as { Stripe?: StripeFactory }).Stripe;
      factory ? resolve(factory) : reject(new Error('Stripe.js failed to initialise'));
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      const factory = (window as unknown as { Stripe?: StripeFactory }).Stripe;
      factory ? resolve(factory) : reject(new Error('Stripe.js failed to initialise'));
    };

    script.onerror = () => {
      promise = null;
      reject(new Error('Could not reach Stripe'));
    };

    document.head.appendChild(script);
  });

  return promise;
};
