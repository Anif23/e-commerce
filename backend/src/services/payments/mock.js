import crypto from 'node:crypto';

/**
 * Simulated gateway used when no real credentials are configured (local dev, CI).
 * It behaves like an online provider so the whole checkout journey — pending
 * order, capture, stock movement, confirmation email — can be exercised.
 *
 * A payment can be forced to fail by confirming with `{ outcome: 'fail' }`.
 */

export const isConfigured = () => true;

export async function create({ order }) {
  return {
    reference: `mock_${order.id}_${crypto.randomBytes(4).toString('hex')}`,
    status: 'PENDING',
    payload: { message: 'Simulated payment — confirm to complete the order' },
  };
}

export async function confirm({ payment, payload = {} }) {
  if (payload.outcome === 'fail') {
    return { status: 'FAILED', reference: payment?.paymentId ?? null, failureCode: 'SIMULATED_DECLINE' };
  }

  return {
    status: 'SUCCESS',
    reference: payment?.paymentId ?? `mock_${crypto.randomBytes(6).toString('hex')}`,
    payerEmail: 'buyer@example.com',
    payerId: 'mock-payer',
  };
}
