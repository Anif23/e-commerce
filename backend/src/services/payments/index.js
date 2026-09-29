import { env } from '../../config/env.js';
import { ApiError } from '../../lib/errors.js';
import * as paypalProvider from './paypal.js';
import * as stripeProvider from './stripe.js';
import * as mockProvider from './mock.js';

/**
 * Payment gateway abstraction.
 *
 * Every provider implements the same three functions so checkout never needs to
 * know which gateway it is talking to:
 *   isEnabled()                     -> can this gateway be used right now?
 *   create({ order, amount })       -> start a payment, return a client payload
 *   confirm({ payment, payload })   -> verify + finalise, return a result object
 */

export const PROVIDERS = {
  COD: { id: 'COD', label: 'Cash on delivery', online: false, provider: null },
  PAYPAL: { id: 'PAYPAL', label: 'PayPal', online: true, provider: paypalProvider },
  STRIPE: { id: 'STRIPE', label: 'Card (Stripe)', online: true, provider: stripeProvider },
  MOCK: { id: 'MOCK', label: 'Test payment', online: true, provider: mockProvider },
};

export const isProviderAvailable = (id) => {
  const entry = PROVIDERS[id];
  if (!entry) return false;

  // COD is always available.
  if (!entry.provider) return true;

  // An explicit PAYMENT_MODE=mock forces the simulator (local dev / tests).
  if (env.payments.mode === 'mock') return id === 'MOCK';
  if (env.payments.mode === 'live') return entry.provider.isConfigured() && id !== 'MOCK';

  return entry.provider.isConfigured();
};

export const listPaymentMethods = () =>
  Object.values(PROVIDERS)
    .filter((entry) => isProviderAvailable(entry.id))
    .map(({ id, label, online }) => ({ id, label, online }));

const assertAvailable = (id) => {
  if (!isProviderAvailable(id)) {
    throw ApiError.badRequest(`Payment method ${id} is not available`);
  }
};

/**
 * Starts a payment for an order.
 * @returns {Promise<{ reference: string|null, status: string, payload: object }>}
 */
export const createPayment = async ({ provider, order, amount }) => {
  assertAvailable(provider);

  const entry = PROVIDERS[provider];

  if (!entry.provider) {
    // Cash on delivery: nothing to do with a gateway.
    return { reference: null, status: 'PENDING', payload: {} };
  }

  const result = await entry.provider.create({ order, amount });

  return {
    reference: result.reference ?? null,
    status: result.status ?? 'PENDING',
    payload: result.payload ?? {},
  };
};

/**
 * Confirms a payment. Never throws for a declined payment — it returns
 * `{ status: 'FAILED' }` so the caller can keep the order in a pending state.
 */
export const confirmPayment = async ({ provider, payment, payload = {}, order, amount }) => {
  assertAvailable(provider);

  const entry = PROVIDERS[provider];

  if (!entry.provider) {
    return { status: 'PENDING', reference: null, payerEmail: null };
  }

  return entry.provider.confirm({ payment, payload, order, amount });
};
