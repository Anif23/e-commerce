import Stripe from 'stripe';
import { env } from '../../config/env.js';

/**
 * Stripe Payment Intents implementation.
 * The browser confirms the intent with the returned client secret; this module
 * only creates intents and verifies their final state server side.
 */

let client = null;

const getClient = () => {
  if (!isConfigured()) return null;
  if (!client) client = new Stripe(env.payments.stripeSecretKey);
  return client;
};

export const isConfigured = () => Boolean(env.payments.stripeSecretKey);

export async function create({ order, amount }) {
  const stripe = getClient();
  if (!stripe) throw new Error('Stripe is not configured');

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(Number(amount) * 100),
    currency: env.currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata: { orderId: String(order.id) },
    description: `Order #${order.id}`,
  });

  return {
    reference: intent.id,
    status: 'PENDING',
    payload: { clientSecret: intent.client_secret, paymentIntentId: intent.id },
  };
}

export async function confirm({ payment, payload }) {
  const stripe = getClient();
  if (!stripe) throw new Error('Stripe is not configured');

  const reference = payload.paymentIntentId ?? payment.paymentId;
  if (!reference) return { status: 'FAILED', failureCode: 'MISSING_INTENT' };

  const intent = await stripe.paymentIntents.retrieve(reference);

  if (intent.status === 'succeeded') {
    return { status: 'SUCCESS', reference: intent.id, payerEmail: intent.receipt_email ?? null };
  }

  return { status: intent.status === 'processing' ? 'PENDING' : 'FAILED', reference: intent.id, failureCode: intent.status };
}

/** Verifies the signature of a Stripe webhook (used by POST /api/payments/stripe/webhook). */
export const constructWebhookEvent = (rawBody, signature) => {
  const stripe = getClient();
  if (!stripe || !env.payments.stripeWebhookSecret) return null;

  return stripe.webhooks.constructEvent(rawBody, signature, env.payments.stripeWebhookSecret);
};
