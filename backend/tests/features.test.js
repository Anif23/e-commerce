import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { app, authHeader, addressPayload, makeAdmin, makeUser, prisma, seedCatalog } from './helpers.js';
import { placeOrder, reopenOrderForPayment } from '../src/modules/orders/order.service.js';

/**
 * Covers the store improvements: idempotent orders (no duplicate on payment
 * retry), the admin payments view, real support unread counts, and downloadable
 * reports.
 */
describe('store operations', () => {
  let customer;
  let admin;
  let catalog;

  beforeAll(async () => {
    customer = await makeUser();
    admin = await makeAdmin();
    catalog = await seedCatalog();
  });

  describe('idempotent orders', () => {
    it('reuses the same unpaid order instead of creating a duplicate', async () => {
      const medium = catalog.variantProduct.variants.find((variant) => variant.priceAdjustment > 0);

      await request(app)
        .post('/api/cart/items')
        .set(authHeader(customer.token))
        .send({ productId: catalog.variantProduct.id, variantId: medium.id, quantity: 1 })
        .expect(200);

      const address = await request(app)
        .post('/api/addresses')
        .set(authHeader(customer.token))
        .send(addressPayload())
        .expect(201);

      const first = await placeOrder({
        userId: customer.user.id,
        addressId: address.body.data.id,
        provider: 'RAZORPAY',
      });
      expect(first.order.status).toBe('PENDING_PAYMENT');

      // Shopper retries checkout with the same cart -> same order, not a new one.
      const second = await placeOrder({
        userId: customer.user.id,
        addressId: address.body.data.id,
        provider: 'RAZORPAY',
      });

      expect(second.reused).toBe(true);
      expect(second.order.id).toBe(first.order.id);

      const pendingCount = await prisma.order.count({
        where: { userId: customer.user.id, status: { in: ['PENDING_PAYMENT', 'EXPIRED'] } },
      });
      expect(pendingCount).toBe(1);
    });

    it('reopens an expired order for payment rather than forcing a new one', async () => {
      const order = await prisma.order.findFirst({
        where: { userId: customer.user.id, status: 'PENDING_PAYMENT' },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'EXPIRED', expiresAt: new Date(Date.now() - 60_000) },
      });

      const expired = await prisma.order.findUnique({ where: { id: order.id } });
      const reopened = await reopenOrderForPayment(expired);

      expect(reopened.id).toBe(order.id);
      expect(reopened.status).toBe('PENDING_PAYMENT');
      expect(new Date(reopened.expiresAt).getTime()).toBeGreaterThan(Date.now());

      const events = await prisma.orderEvent.findMany({ where: { orderId: order.id } });
      expect(events.map((event) => event.message)).toContain('Payment window reopened');
    });
  });

  describe('admin payments view', () => {
    it('lists payments with order context and summarises them', async () => {
      // A COD order produces a payment row the finance view should surface.
      await request(app)
        .post('/api/cart/items')
        .set(authHeader(customer.token))
        .send({ productId: catalog.simple.id, quantity: 1 })
        .expect(200);
      const address = await request(app)
        .post('/api/addresses')
        .set(authHeader(customer.token))
        .send(addressPayload())
        .expect(201);
      await request(app)
        .post('/api/checkout')
        .set(authHeader(customer.token))
        .send({ addressId: address.body.data.id, paymentMethod: 'COD' })
        .expect(201);

      const list = await request(app).get('/api/admin/payments').set(authHeader(admin.token)).expect(200);
      expect(Array.isArray(list.body.data)).toBe(true);
      const cod = list.body.data.find((payment) => payment.provider === 'COD');
      expect(cod).toBeTruthy();
      expect(cod.order).toBeTruthy();
      expect(cod.order.id).toBeGreaterThan(0);

      const stats = await request(app).get('/api/admin/payments/stats').set(authHeader(admin.token)).expect(200);
      expect(stats.body.data.byStatus).toHaveProperty('PENDING');
      expect(stats.body.data.totals).toHaveProperty('captured');
    });

    it('rejects non-admins', async () => {
      await request(app).get('/api/admin/payments').set(authHeader(customer.token)).expect(403);
    });
  });

  describe('support unread tracking', () => {
    let ticketId;

    it('counts a new customer ticket as unread, then clears it when opened', async () => {
      const created = await request(app)
        .post('/api/support/tickets')
        .set(authHeader(customer.token))
        .send({ subject: 'Where is my order?', message: 'It has not shipped yet.' })
        .expect(201);
      ticketId = created.body.data.id;

      const before = await request(app).get('/api/admin/support/unread').set(authHeader(admin.token)).expect(200);
      expect(before.body.data.unread).toBeGreaterThanOrEqual(1);

      // Admin opens the conversation -> marked read.
      await request(app).get(`/api/admin/support/${ticketId}`).set(authHeader(admin.token)).expect(200);

      const afterOpen = await request(app).get('/api/admin/support/unread').set(authHeader(admin.token)).expect(200);
      const stillUnread = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
      expect(stillUnread.adminLastReadAt).not.toBeNull();
      expect(afterOpen.body.data.unread).toBeLessThan(before.body.data.unread);
    });

    it('becomes unread again when the customer replies', async () => {
      await request(app)
        .post(`/api/support/tickets/${ticketId}/messages`)
        .set(authHeader(customer.token))
        .send({ message: 'Any update please?' })
        .expect(200);

      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      const lastMessage = ticket.messages.at(-1);
      expect(lastMessage.isAdmin).toBe(false);
      expect(new Date(lastMessage.createdAt).getTime()).toBeGreaterThan(new Date(ticket.adminLastReadAt).getTime());
    });
  });

  describe('downloadable reports', () => {
    it('streams a CSV sales report', async () => {
      const res = await request(app)
        .get('/api/admin/reports/export?format=csv&range=30d')
        .set(authHeader(admin.token))
        .expect(200);

      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="sales-report-.*\.csv"/);
      expect(res.text).toMatch(/Sales report/);
      expect(res.text).toMatch(/Order,Date,Customer/);
    });

    it('streams a PDF sales report', async () => {
      const res = await request(app)
        .get('/api/admin/reports/export?format=pdf&range=30d')
        .set(authHeader(admin.token))
        .responseType('buffer')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/application\/pdf/);
      expect(res.body.slice(0, 5).toString()).toBe('%PDF-');
    });

    it('honours an explicit from/to window', async () => {
      const from = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const to = new Date().toISOString().slice(0, 10);
      const res = await request(app)
        .get(`/api/admin/reports/export?format=csv&from=${from}&to=${to}`)
        .set(authHeader(admin.token))
        .expect(200);
      expect(res.text).toMatch(/Sales report/);
    });

    it('rejects an unknown format', async () => {
      await request(app)
        .get('/api/admin/reports/export?format=xlsx')
        .set(authHeader(admin.token))
        .expect(400);
    });
  });

  describe('admin image uploads', () => {
    // 1x1 transparent PNG
    const PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );

    it('uploads a store logo, stores an absolute URL and serves the file', async () => {
      const res = await request(app)
        .post('/api/admin/settings/logo')
        .set(authHeader(admin.token))
        .attach('logo', PNG, { filename: 'logo.png', contentType: 'image/png' })
        .expect(200);

      expect(res.body.data.logoUrl).toMatch(/\/uploads\/[\w.-]+\.png$/);

      // The stored file is reachable through the static /uploads mount.
      const pathname = new URL(res.body.data.logoUrl).pathname;
      await request(app).get(pathname).expect(200);
    });

    it('uploads a category image', async () => {
      const res = await request(app)
        .post('/api/admin/categories')
        .set(authHeader(admin.token))
        .field('name', `Upload Cat ${Date.now()}`)
        .attach('image', PNG, { filename: 'cat.png', contentType: 'image/png' })
        .expect(201);

      expect(res.body.data.image).toMatch(/\/uploads\/[\w.-]+\.png$/);
    });

    it('uploads multiple product images', async () => {
      const res = await request(app)
        .post('/api/admin/products')
        .set(authHeader(admin.token))
        .field('name', `Upload Prod ${Date.now()}`)
        .field('categoryId', String(catalog.category.id))
        .field('price', '50')
        .field('stock', '5')
        .attach('images', PNG, { filename: 'a.png', contentType: 'image/png' })
        .attach('images', PNG, { filename: 'b.png', contentType: 'image/png' })
        .expect(201);

      expect(res.body.data.images).toHaveLength(2);
      expect(res.body.data.images[0]).toMatch(/\/uploads\//);
    });
  });
});
