import Stripe from 'stripe';

import { env } from '../../config/env.js';
import { ApiError } from '../../lib/errors.js';

let client = null;

const getClient = () => {
  if (!env.payments.stripeSecretKey) return null;
  if (!client) client = new Stripe(env.payments.stripeSecretKey);
  return client;
};

export const isConfigured = () => Boolean(env.payments.stripeSecretKey && env.payments.stripePublishableKey);
const toMinorUnits = (amount) => Math.round(Number(amount) * 100);

/** Create a PaymentIntent; the browser confirms it using Stripe.js. */
export async function create({ order, amount }) {
  const stripe = getClient();
  if (!stripe || !isConfigured()) throw new Error('Stripe is not configured');

  const intent = await stripe.paymentIntents.create({
    amount: toMinorUnits(amount),
    currency: env.currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata: { orderId: String(order.id) },
    description: `Order #${order.id}`,
  });

  return {
    reference: intent.id,
    status: 'PENDING',
    payload: {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      publishableKey: env.payments.stripePublishableKey,
    },
  };
}

export async function confirm({ payment, payload, order, amount }) {
  const stripe = getClient();
  if (!stripe || !isConfigured()) throw new Error('Stripe is not configured');

  const reference = String(payload.paymentIntentId ?? payment.paymentId ?? '');
  if (!reference || (payment.paymentId && reference !== payment.paymentId)) {
    return { status: 'FAILED', failureCode: 'INTENT_MISMATCH' };
  }

  const intent = await stripe.paymentIntents.retrieve(reference, { expand: ['latest_charge'] });
  if (intent.metadata?.orderId !== String(order.id)) {
    return { status: 'FAILED', reference: intent.id, failureCode: 'ORDER_MISMATCH' };
  }

  const amountMatches = Number(intent.amount_received || intent.amount) === toMinorUnits(amount);
  const currencyMatches = String(intent.currency).toUpperCase() === env.currency;
  if (!amountMatches || !currencyMatches) {
    return { status: 'FAILED', reference: intent.id, failureCode: 'AMOUNT_OR_CURRENCY_MISMATCH' };
  }

  if (intent.status === 'succeeded') {
    const charge = typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
    return {
      status: 'SUCCESS',
      reference: intent.id,
      payerEmail: charge?.billing_details?.email ?? null,
      method: intent.payment_method_types?.[0] ?? null,
    };
  }

  return {
    status: intent.status === 'processing' ? 'PENDING' : 'FAILED',
    reference: intent.id,
    failureCode: intent.status,
  };
}

/** Verifies a Stripe webhook using the exact raw request bytes. */
export const constructWebhookEvent = (rawBody, signature) => {
  const stripe = getClient();
  if (!stripe || !env.payments.stripeWebhookSecret) return null;

  try {
    return stripe.webhooks.constructEvent(rawBody, signature, env.payments.stripeWebhookSecret);
  } catch {
    throw ApiError.badRequest('Invalid Stripe webhook signature');
  }
};
