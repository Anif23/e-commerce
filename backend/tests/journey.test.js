import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { app, authHeader, createOrder, makeAdmin, makeUser, prisma, seedCatalog } from './helpers.js';
import { finalizePayment, getOrderOrThrow, placeOrder } from '../src/modules/orders/order.service.js';

/**
 * The purchase journey end to end:
 * register -> browse -> variant selection -> cart -> coupon -> checkout
 * -> payment -> stock movement -> tracking -> review -> admin fulfilment.
 */
describe('purchase journey', () => {
  let customer;
  let admin;
  let catalog;
  let pendingOrderId;

  beforeAll(async () => {
    customer = await makeUser();
    admin = await makeAdmin();
    catalog = await seedCatalog();
  });

  it('registers and exposes a profile', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set(authHeader(customer.token))
      .expect(200);

    expect(response.body.data.email).toBe(customer.email);
    expect(response.body.data.stats.orders).toBe(0);
  });

  it('rejects adding a product variant without choosing one', async () => {
    const response = await request(app)
      .post('/api/cart/items')
      .set(authHeader(customer.token))
      .send({ productId: catalog.variantProduct.id, quantity: 1 })
      .expect(400);

    expect(response.body.message).toMatch(/choose a variant/i);
  });

  it('adds the selected variant with its own price', async () => {
    const medium = catalog.variantProduct.variants.find((variant) => variant.priceAdjustment > 0);

    const response = await request(app)
      .post('/api/cart/items')
      .set(authHeader(customer.token))
      .send({ productId: catalog.variantProduct.id, variantId: medium.id, quantity: 2 })
      .expect(200);

    const item = response.body.data.items.at(-1);

    expect(item.unitPrice).toBe(115); // 100 base + 15 adjustment
    expect(item.lineTotal).toBe(230);
    expect(item.variant.label).toContain('Size');
  });

  it('rejects quantities above available stock', async () => {
    const small = catalog.variantProduct.variants.find((variant) => variant.priceAdjustment === 0);

    await request(app)
      .post('/api/cart/items')
      .set(authHeader(customer.token))
      .send({ productId: catalog.variantProduct.id, variantId: small.id, quantity: 99 })
      .expect(400);
  });

  it('rejects an unknown coupon and applies a valid one with its cap', async () => {
    await request(app)
      .post('/api/cart/coupon')
      .set(authHeader(customer.token))
      .send({ code: 'NOT-A-CODE' })
      .expect(400);

    const response = await request(app)
      .post('/api/cart/coupon')
      .set(authHeader(customer.token))
      .send({ code: catalog.coupon.code })
      .expect(200);

    // 10% of 230 = 23, under the 25 cap.
    expect(response.body.data.totals.discount).toBe(23);
    expect(response.body.data.totals.subtotal).toBe(230);
  });

  it('creates a pending online order without reserving stock before gateway confirmation', async () => {
    const address = await request(app)
      .post('/api/addresses')
      .set(authHeader(customer.token))
      .send({
        fullName: 'Test Shopper',
        phone: '+91 98765 43210',
        address1: '12 Test Avenue',
        city: 'Thoothukudi',
        state: 'Tamil Nadu',
        country: 'India',
        zipCode: '628001',
      })
      .expect(201);

    const placed = await placeOrder({
      userId: customer.user.id,
      addressId: address.body.data.id,
      provider: 'RAZORPAY',
    });
    pendingOrderId = placed.order.id;

    expect(placed.order.status).toBe('PENDING_PAYMENT');
    expect(placed.order.payment.provider).toBe('RAZORPAY');
    expect(placed.order.payment.status).toBe('PENDING');
    expect(placed.order.expiresAt).not.toBeNull();
    expect(placed.order.items).toHaveLength(1);

    // Stock is only reserved after the gateway confirms capture.
    const variant = await prisma.productVariant.findUnique({ where: { id: placed.order.items[0].variantId } });
    expect(variant.stock).toBe(3);
  });

  it('does not finalise a declined gateway result', async () => {
    const user = await makeUser();
    await request(app)
      .post('/api/cart/items')
      .set(authHeader(user.token))
      .send({ productId: catalog.simple.id, quantity: 1 })
      .expect(200);
    const address = await request(app)
      .post('/api/addresses')
      .set(authHeader(user.token))
      .send({
        fullName: 'Test Shopper',
        phone: '+91 98765 43210',
        address1: '12 Test Avenue',
        city: 'Thoothukudi',
        state: 'Tamil Nadu',
        country: 'India',
        zipCode: '628001',
      })
      .expect(201);

    const placed = await placeOrder({ userId: user.user.id, addressId: address.body.data.id, provider: 'RAZORPAY' });
    const outcome = await finalizePayment({
      order: placed.order,
      result: { status: 'FAILED', failureCode: 'DECLINED' },
    });
    const stored = await prisma.order.findUnique({ where: { id: placed.order.id }, include: { payment: true } });

    expect(outcome.failed).toBe(true);
    expect(stored.status).toBe('PENDING_PAYMENT');
    expect(stored.payment.status).toBe('FAILED');
  });

  it('confirms payment, moves stock, clears the cart and records the timeline', async () => {
    const order = await getOrderOrThrow(pendingOrderId);
    const outcome = await finalizePayment({
      order,
      result: {
        status: 'SUCCESS',
        reference: 'razorpay-payment-reference',
        payerEmail: 'shopper@example.test',
        method: 'upi',
        currency: 'INR',
      },
    });
    const updated = await getOrderOrThrow(pendingOrderId);

    expect(outcome.failed).toBe(false);
    expect(updated.status).toBe('PAID');
    expect(updated.timeline.map((event) => event.status)).toContain('PAID');

    const stored = await prisma.order.findUnique({
      where: { id: pendingOrderId },
      include: { items: true, payment: true, events: true },
    });
    const variant = await prisma.productVariant.findUnique({ where: { id: stored.items[0].variantId } });

    expect(variant.stock).toBe(1); // 3 - 2
    expect(stored.payment.status).toBe('SUCCESS');
    expect(stored.payment.paymentId).toBe('razorpay-payment-reference');
    expect(stored.payment.method).toBe('upi');
    expect(stored.couponCode).toBe(catalog.coupon.code);

    const cart = await request(app).get('/api/cart').set(authHeader(customer.token)).expect(200);
    expect(cart.body.data.items).toHaveLength(0);
    expect(cart.body.data.couponCode).toBeNull();

    const usage = await prisma.couponUsage.count({ where: { couponId: catalog.coupon.id } });
    expect(usage).toBe(1);

    const logs = await prisma.stockLog.findMany({ where: { variantId: variant.id } });
    expect(logs.at(-1).change).toBe(-2);
  });

  it('exposes a tracking timeline for the customer', async () => {
    const orderId = (
      await prisma.order.findFirst({ where: { userId: customer.user.id }, orderBy: { id: 'desc' } })
    ).id;

    const response = await request(app)
      .get(`/api/orders/${orderId}/track`)
      .set(authHeader(customer.token))
      .expect(200);

    expect(response.body.data.status).toBe('PAID');
    expect(response.body.data.currentStep).toBe(1);
    expect(response.body.data.steps.filter((step) => step.done)).toHaveLength(2);
    expect(response.body.data.timeline.length).toBeGreaterThan(1);
  });

  it('lets the admin move the order through fulfilment', async () => {
    const orderId = (
      await prisma.order.findFirst({ where: { userId: customer.user.id }, orderBy: { id: 'desc' } })
    ).id;

    await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set(authHeader(admin.token))
      .send({ status: 'PROCESSING' })
      .expect(200);

    const shipped = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set(authHeader(admin.token))
      .send({ status: 'SHIPPED', trackingNumber: 'TRACK-123', trackingCarrier: 'SwiftPost' })
      .expect(200);

    expect(shipped.body.data.status).toBe('SHIPPED');
    expect(shipped.body.data.tracking.number).toBe('TRACK-123');

    const delivered = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set(authHeader(admin.token))
      .send({ status: 'DELIVERED' })
      .expect(200);

    expect(delivered.body.data.status).toBe('DELIVERED');

    // Invalid transitions are rejected.
    await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set(authHeader(admin.token))
      .send({ status: 'PROCESSING' })
      .expect(400);

    const notifications = await prisma.notification.count({ where: { userId: customer.user.id } });
    expect(notifications).toBeGreaterThan(0);
  });

  it('allows a review only after a purchase and updates the product rating', async () => {
    const orderId = (
      await prisma.order.findFirst({ where: { userId: customer.user.id }, orderBy: { id: 'desc' } })
    ).id;

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    const productId = order.items[0].productId;

    const forbidden = await request(app)
      .post('/api/reviews')
      .set(authHeader((await makeUser()).token))
      .send({ productId, rating: 5, comment: 'Great' })
      .expect(403);

    expect(forbidden.body.message).toMatch(/purchased/i);

    await request(app)
      .post('/api/reviews')
      .set(authHeader(customer.token))
      .send({ productId, rating: 4, title: 'Solid', comment: 'Fits well' })
      .expect(201);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product.ratingCount).toBe(1);
    expect(product.ratingAvg).toBe(4);

    // Editing the review keeps a single row and refreshes the average.
    await request(app)
      .patch(`/api/reviews/${(await prisma.review.findFirst({ where: { productId } })).id}`)
      .set(authHeader(customer.token))
      .send({ rating: 5 })
      .expect(200);

    const updated = await prisma.product.findUnique({ where: { id: productId } });
    expect(updated.ratingAvg).toBe(5);
    expect(updated.ratingCount).toBe(1);
  });

  it('opens and answers a support ticket', async () => {
    const created = await request(app)
      .post('/api/support/tickets')
      .set(authHeader(customer.token))
      .send({ subject: 'Wrong size delivered', message: 'I ordered M but received S.' })
      .expect(201);

    const ticketId = created.body.data.id;

    await request(app)
      .post(`/api/support/tickets/${ticketId}/messages`)
      .set(authHeader(admin.token))
      .send({ message: 'Sorry about that — we will ship a replacement.' })
      .expect(200);

    const detail = await request(app)
      .get(`/api/support/tickets/${ticketId}`)
      .set(authHeader(customer.token))
      .expect(200);

    expect(detail.body.data.messages).toHaveLength(2);
    expect(detail.body.data.status).toBe('PENDING');
  });

  it('supports cash on delivery with immediate stock reservation', async () => {
    const user = await makeUser();

    const order = await createOrder({
      token: user.token,
      productId: catalog.simple.id,
      provider: 'COD',
      quantity: 2,
    });

    expect(order.body.data.order.status).toBe('PROCESSING');

    const product = await prisma.product.findUnique({ where: { id: catalog.simple.id } });
    expect(product.stock).toBe(8); // 10 - 2

    // Cancelling puts the stock back.
    await request(app)
      .post(`/api/orders/${order.body.data.order.id}/cancel`)
      .set(authHeader(user.token))
      .send({ reason: 'Changed my mind' })
      .expect(200);

    const restored = await prisma.product.findUnique({ where: { id: catalog.simple.id } });
    expect(restored.stock).toBe(10);
  });
});
