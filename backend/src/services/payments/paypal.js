import { OrdersController } from '@paypal/paypal-server-sdk';
import { Client, Environment } from '@paypal/paypal-server-sdk';
import { env } from '../../config/env.js';

/**
 * PayPal Checkout (Orders v2) implementation.
 * Requires PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET; the frontend renders the SDK
 * buttons using the returned order id.
 */

let controller = null;

const getController = () => {
  if (!isConfigured()) return null;

  if (!controller) {
    const client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: env.payments.paypalClientId,
        oAuthClientSecret: env.payments.paypalClientSecret,
      },
      timeout: 0,
      environment: env.payments.paypalMode === 'live' ? Environment.Production : Environment.Sandbox,
    });

    controller = new OrdersController(client);
  }

  return controller;
};

export const isConfigured = () =>
  Boolean(env.payments.paypalClientId && env.payments.paypalClientSecret);

export async function create({ order, amount }) {
  const orders = getController();
  if (!orders) throw new Error('PayPal is not configured');

  const collect = {
    body: {
      intent: 'CAPTURE',
      purchaseUnits: [
        {
          referenceId: String(order.id),
          amount: {
            currencyCode: env.currency,
            value: Number(amount).toFixed(2),
          },
        },
      ],
    },
    prefer: 'return=representation',
  };

  const { result } = await orders.createOrder(collect);

  return {
    reference: result.id,
    status: 'PENDING',
    payload: { orderId: result.id, links: result.links },
  };
}

export async function confirm({ payment, payload }) {
  const orders = getController();
  if (!orders) throw new Error('PayPal is not configured');

  const reference = payload.paypalOrderId ?? payment.paymentId;
  if (!reference) return { status: 'FAILED', failureCode: 'MISSING_ORDER_ID' };

  const { result } = await orders.captureOrder({ id: reference, prefer: 'return=representation' });

  if (result.status !== 'COMPLETED') {
    return { status: 'FAILED', reference, failureCode: result.status ?? 'NOT_COMPLETED' };
  }

  const capture = result.purchaseUnits?.[0]?.payments?.captures?.[0];

  return {
    status: 'SUCCESS',
    reference: capture?.id ?? reference,
    payerEmail: result.payer?.emailAddress ?? null,
    payerId: result.payer?.payerId ?? null,
  };
}
