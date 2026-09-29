import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { summarizeCart, serializeCart } from '../cart/cart.service.js';
import { isOnlinePayment, placeOrder, startPayment, getOrderOrThrow, serializeOrder } from '../orders/order.service.js';
import { isProviderAvailable, listPaymentMethods } from '../../services/payments/index.js';
import { rateLimit } from '../../middleware/rateLimit.js';

const checkoutSchema = z.object({
  addressId: z.coerce.number().int().positive().optional(),
  paymentMethod: z.enum(['COD', 'PAYPAL', 'STRIPE', 'MOCK']),
  customerNote: z.string().trim().max(500).optional(),
  // Lets the shopper check out with a brand new address in one step.
  address: z
    .object({
      fullName: z.string().trim().min(2),
      phone: z.string().trim().min(6),
      address1: z.string().trim().min(3),
      address2: z.string().trim().optional(),
      city: z.string().trim().min(2),
      state: z.string().trim().min(2),
      country: z.string().trim().min(2),
      zipCode: z.string().trim().min(3),
      label: z.string().trim().optional(),
      save: z.boolean().optional(),
    })
    .optional(),
});

export const checkoutController = {
  /** GET /api/checkout/summary — everything the checkout page needs in one call */
  summary: asyncHandler(async (req, res) => {
    const [{ cart, lines, totals }, addresses] = await Promise.all([
      summarizeCart(req.user.id),
      prisma.address.findMany({ where: { userId: req.user.id }, orderBy: [{ isDefault: 'desc' }, { id: 'desc' }] }),
    ]);

    res.json({
      success: true,
      data: {
        cart: serializeCart(cart, lines, totals),
        addresses,
        paymentMethods: listPaymentMethods(),
        shipping: {
          fee: env.shippingFee,
          freeShippingThreshold: env.freeShippingThreshold,
          taxRatePercent: env.taxRatePercent,
        },
      },
    });
  }),

  /** POST /api/checkout */
  checkout: [
    rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'checkout' }),
    asyncHandler(async (req, res) => {
      const body = checkoutSchema.parse(req.body);

      if (!isProviderAvailable(body.paymentMethod)) {
        throw ApiError.badRequest('That payment method is not available right now');
      }

      let addressId = body.addressId;

      if (!addressId && body.address) {
        const created = await prisma.address.create({
          data: {
            userId: req.user.id,
            fullName: body.address.fullName,
            phone: body.address.phone,
            address1: body.address.address1,
            address2: body.address.address2,
            city: body.address.city,
            state: body.address.state,
            country: body.address.country,
            zipCode: body.address.zipCode,
            label: body.address.label,
            isDefault: body.address.save ?? false,
          },
        });

        if (body.address.save) {
          await prisma.address.updateMany({
            where: { userId: req.user.id, id: { not: created.id } },
            data: { isDefault: false },
          });
        }

        addressId = created.id;
      }

      const { order, online } = await placeOrder({
        userId: req.user.id,
        addressId,
        provider: body.paymentMethod,
        customerNote: body.customerNote,
      });

      let payment = null;

      if (online) {
        payment = await startPayment({ order, provider: body.paymentMethod });
      }

      res.status(201).json({
        success: true,
        message: online
          ? 'Order created — complete your payment to confirm it'
          : 'Order placed successfully. Pay on delivery.',
        data: {
          order: serializeOrder(order),
          payment: payment
            ? {
                provider: body.paymentMethod,
                status: payment.status,
                ...payment.payload,
              }
            : { provider: body.paymentMethod, status: 'PENDING' },
        },
      });
    }),
  ],

  /**
   * POST /api/checkout/:orderId/pay
   * Creates (or re-creates) the gateway payment for an order that is still
   * waiting — lets a customer resume after closing the PayPal/Stripe popup.
   */
  pay: asyncHandler(async (req, res) => {
    const order = await getOrderOrThrow(req.params.orderId);

    if (order.userId !== req.user.id) throw ApiError.forbidden('This order is not yours');
    if (order.status !== 'PENDING_PAYMENT') throw ApiError.badRequest('This order is not awaiting payment');
    if (!isOnlinePayment(order.payment?.provider)) {
      throw ApiError.badRequest('This order does not require an online payment');
    }

    const payment = await startPayment({ order, provider: order.payment.provider });

    res.json({
      success: true,
      data: {
        provider: order.payment.provider,
        status: payment.status,
        ...payment.payload,
      },
    });
  }),
};
