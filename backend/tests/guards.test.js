import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { app, authHeader, makeAdmin, makeUser, prisma, seedCatalog } from './helpers.js';

/** Auth, authorisation and validation behaviour of the API surface. */
describe('guards', () => {
  let customer;
  let admin;
  let catalog;

  beforeAll(async () => {
    customer = await makeUser();
    admin = await makeAdmin();
    catalog = await seedCatalog();
  });

  it('rejects protected routes without a token', async () => {
    await request(app).get('/api/cart').expect(401);
    await request(app).get('/api/orders').expect(401);
    await request(app).get('/api/admin/dashboard').expect(401);
  });

  it('rejects an invalid or expired token', async () => {
    await request(app).get('/api/cart').set(authHeader('not-a-token')).expect(401);
  });

  it('blocks customers from admin routes', async () => {
    await request(app).get('/api/admin/orders').set(authHeader(customer.token)).expect(403);
    await request(app).get('/api/admin/customers').set(authHeader(customer.token)).expect(403);
    await request(app).get('/api/admin/reports').set(authHeader(customer.token)).expect(403);
  });

  it('validates registration input', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ username: 'x', email: 'not-an-email', password: '123' })
      .expect(400);

    expect(response.body.errors).toBeTruthy();
    expect(response.body.message).toMatch(/validation/i);
  });

  it('refuses duplicate registration', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'Dup User', email: customer.email, password: 'Pass@123' })
      .expect(409);
  });

  it('logs in with the right password only', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: customer.email, password: 'wrong-password' })
      .expect(400);

    const ok = await request(app)
      .post('/api/auth/login')
      .send({ email: customer.email, password: customer.password })
      .expect(200);

    expect(ok.body.data.token).toBeTruthy();
  });

  it('never exposes another customer order', async () => {
    const other = await makeUser();

    const created = await request(app)
      .post('/api/addresses')
      .set(authHeader(customer.token))
      .send({
        fullName: 'Test Shopper',
        phone: '+1 555 010 999',
        address1: '12 Test Avenue',
        city: 'Testville',
        state: 'TS',
        country: 'India',
        zipCode: '12345',
      })
      .expect(201);

    await request(app)
      .post('/api/cart/items')
      .set(authHeader(customer.token))
      .send({ productId: catalog.simple.id, quantity: 1 })
      .expect(200);

    const order = await request(app)
      .post('/api/checkout')
      .set(authHeader(customer.token))
      .send({ addressId: created.body.data.id, paymentMethod: 'COD' })
      .expect(201);

    await request(app).get(`/api/orders/${order.body.data.order.id}`).set(authHeader(other.token)).expect(403);
  });

  it('requires a delivery address before checkout', async () => {
    const fresh = await makeUser();

    await request(app)
      .post('/api/cart/items')
      .set(authHeader(fresh.token))
      .send({ productId: catalog.simple.id, quantity: 1 })
      .expect(200);

    const response = await request(app)
      .post('/api/checkout')
      .set(authHeader(fresh.token))
      .send({ paymentMethod: 'COD' })
      .expect(400);

    expect(response.body.message).toMatch(/address/i);
  });

  it('refuses to check out an empty cart', async () => {
    const fresh = await makeUser();

    const address = await request(app)
      .post('/api/addresses')
      .set(authHeader(fresh.token))
      .send({
        fullName: 'Test Shopper',
        phone: '+1 555 010 999',
        address1: '12 Test Avenue',
        city: 'Testville',
        state: 'TS',
        country: 'India',
        zipCode: '12345',
      })
      .expect(201);

    const response = await request(app)
      .post('/api/checkout')
      .set(authHeader(fresh.token))
      .send({ addressId: address.body.data.id, paymentMethod: 'COD' })
      .expect(400);

    expect(response.body.message).toMatch(/empty/i);
  });

  it('only offers payment methods that are configured', async () => {
    const response = await request(app).get('/api/payments/methods').expect(200);

    // Without gateway credentials, only the real COD method is available.
    expect(response.body.data.map((method) => method.id)).toEqual(['COD']);
  });

  it('enforces coupon rules', async () => {
    const response = await request(app)
      .post('/api/coupons/validate')
      .send({ code: catalog.coupon.code, subtotal: 5 })
      .expect(400);

    expect(response.body.message).toMatch(/minimum/i);
  });

  it('blocks a suspended account', async () => {
    const user = await makeUser();

    await prisma.user.update({ where: { id: user.user.id }, data: { isBlocked: true } });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(403);

    expect(response.body.message).toMatch(/suspended/i);
  });

  it('serves a health endpoint', async () => {
    const response = await request(app).get('/api/health').expect(200);
    expect(response.body.data.status).toBe('ok');
  });
});
