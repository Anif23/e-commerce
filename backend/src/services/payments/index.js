import { ApiError } from '../../lib/errors.js';
import * as razorpayProvider from './razorpay.js';
import * as stripeProvider from './stripe.js';

/**
 * Payment gateway abstraction. Online methods are intentionally hidden until
 * their real server credentials are configured; no mock/test gateway is exposed.
 */
export const PROVIDERS = {
  COD: { id: 'COD', label: 'Cash on delivery', online: false, provider: null },
  RAZORPAY: { id: 'RAZORPAY', label: 'Razorpay', online: true, provider: razorpayProvider },
  STRIPE: { id: 'STRIPE', label: 'Card (Stripe)', online: true, provider: stripeProvider },
};

export const isProviderAvailable = (id) => {
  const entry = PROVIDERS[id];
  return Boolean(entry && (!entry.provider || entry.provider.isConfigured()));
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

/** @returns {Promise<{reference: string|null, gatewayOrderId?: string|null, status: string, payload: object}>} */
export const createPayment = async ({ provider, order, amount, storeName }) => {
  assertAvailable(provider);
  const entry = PROVIDERS[provider];

  if (!entry.provider) return { reference: null, status: 'PENDING', payload: {} };

  const result = await entry.provider.create({ order, amount, storeName });
  return {
    reference: result.reference ?? null,
    gatewayOrderId: result.gatewayOrderId ?? null,
    status: result.status ?? 'PENDING',
    payload: result.payload ?? {},
  };
};

/**
 * Confirms a payment with the selected gateway. The caller always supplies the
 * server-side order and amount; client-provided prices are never trusted.
 */
export const confirmPayment = async ({ provider, payment, payload = {}, order, amount }) => {
  assertAvailable(provider);
  const entry = PROVIDERS[provider];

  if (!entry.provider) return { status: 'PENDING', reference: null, payerEmail: null };
  return entry.provider.confirm({ payment, payload, order, amount });
};
