import crypto from 'node:crypto';

import { env } from '../../config/env.js';
import { ApiError } from '../../lib/errors.js';

const API_URL = 'https://api.razorpay.com/v1';

export const isConfigured = () => Boolean(env.payments.razorpayKeyId && env.payments.razorpayKeySecret);

const toMinorUnits = (amount) => Math.round(Number(amount) * 100);

const constantTimeEqual = (left, right) => {
  const a = Buffer.from(String(left ?? ''), 'utf8');
  const b = Buffer.from(String(right ?? ''), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const request = async (path, { method = 'GET', body } = {}) => {
  if (!isConfigured()) throw new Error('Razorpay is not configured');

  const credentials = Buffer.from(`${env.payments.razorpayKeyId}:${env.payments.razorpayKeySecret}`).toString('base64');
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${credentials}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(12_000),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.description ?? data?.error?.reason ?? `Razorpay request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
};

export async function create({ order, amount, storeName }) {
  const gatewayOrder = await request('/orders', {
    method: 'POST',
    body: {
      amount: toMinorUnits(amount),
      currency: env.currency,
      receipt: `order-${order.id}`,
      notes: { orderId: String(order.id) },
    },
  });

  return {
    reference: null,
    gatewayOrderId: gatewayOrder.id,
    status: 'PENDING',
    payload: {
      keyId: env.payments.razorpayKeyId,
      orderId: gatewayOrder.id,
      amount: gatewayOrder.amount,
      currency: gatewayOrder.currency,
      name: storeName ?? 'Store',
      description: `Order #${order.id}`,
      prefill: { email: order.user?.email ?? '' },
    },
  };
}

const isPaymentSignatureValid = ({ orderId, paymentId, signature }) => {
  if (!orderId || !paymentId || !signature) return false;
  const expected = crypto
    .createHmac('sha256', env.payments.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return constantTimeEqual(expected, signature);
};

export async function confirm({ payment, payload, order, amount }) {
  const orderId = String(payload.razorpay_order_id ?? '');
  const paymentId = String(payload.razorpay_payment_id ?? '');
  const signature = String(payload.razorpay_signature ?? '');

  if (!payment.gatewayOrderId || orderId !== payment.gatewayOrderId) {
    return { status: 'FAILED', failureCode: 'ORDER_MISMATCH' };
  }

  if (!isPaymentSignatureValid({ orderId, paymentId, signature })) {
    return { status: 'FAILED', failureCode: 'INVALID_SIGNATURE' };
  }

  let gatewayPayment = await request(`/payments/${encodeURIComponent(paymentId)}`);

  if (gatewayPayment.order_id !== payment.gatewayOrderId) {
    return { status: 'FAILED', reference: paymentId, failureCode: 'ORDER_MISMATCH' };
  }

  // Razorpay authorizes a payment before capture. Capture authorized payments
  // explicitly so stock and order state only advance after funds are captured.
  if (gatewayPayment.status === 'authorized') {
    gatewayPayment = await request(`/payments/${encodeURIComponent(paymentId)}/capture`, {
      method: 'POST',
      body: { amount: toMinorUnits(amount), currency: env.currency },
    });
  }

  if (
    gatewayPayment.status !== 'captured' ||
    Number(gatewayPayment.amount) !== toMinorUnits(amount) ||
    String(gatewayPayment.currency).toUpperCase() !== env.currency
  ) {
    return {
      status: 'FAILED',
      reference: paymentId,
      failureCode: gatewayPayment.status === 'captured' ? 'AMOUNT_OR_CURRENCY_MISMATCH' : gatewayPayment.status ?? 'NOT_CAPTURED',
    };
  }

  return {
    status: 'SUCCESS',
    reference: gatewayPayment.id,
    payerEmail: gatewayPayment.email ?? null,
    payerContact: gatewayPayment.contact ?? null,
    method: gatewayPayment.method ?? null,
  };
}

/** Verify the signed raw body and parse a Razorpay webhook event. */
export const constructWebhookEvent = (rawBody, signature) => {
  if (!env.payments.razorpayWebhookSecret) return null;
  if (!Buffer.isBuffer(rawBody) || !signature) throw ApiError.unauthorized('Invalid Razorpay webhook signature');

  const expected = crypto
    .createHmac('sha256', env.payments.razorpayWebhookSecret)
    .update(rawBody)
    .digest('hex');

  if (!constantTimeEqual(expected, signature)) throw ApiError.unauthorized('Invalid Razorpay webhook signature');

  try {
    return JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw ApiError.badRequest('Invalid Razorpay webhook payload');
  }
};

export const verifyPaymentSignature = isPaymentSignatureValid;
