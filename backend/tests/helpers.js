import request from 'supertest';

import { createApp } from '../app.js';
import { prisma } from '../src/lib/prisma.js';

/**
 * Shared test utilities: a supertest agent, unique identities and a tiny
 * catalogue fixture so assertions do not depend on demo data.
 */
export const app = createApp();

let counter = 0;
const unique = (prefix) => `${prefix}-${Date.now().toString(36)}-${++counter}`;

export const makeUser = async ({ role = 'USER', password = 'Pass@123' } = {}) => {
  const username = unique('user');
  const email = `${username}@test.dev`;

  const response = await request(app).post('/api/auth/register').send({ username, email, password });

  if (response.status !== 201) {
    throw new Error(`register failed: ${JSON.stringify(response.body)}`);
  }

  return { ...response.body.data, email, username, password };
};

/** Creates an admin by registering then promoting through the model layer. */
export const makeAdmin = async () => {
  const user = await makeUser();

  await prisma.user.update({ where: { id: user.user.id }, data: { role: 'ADMIN' } });

  const token = await issueToken(user.user.id, 'ADMIN');

  return { ...user, token };
};

/** Mints a fresh access token without going through login (faster, and role aware). */
export const issueToken = async (userId, role = 'USER') => {
  const jwt = (await import('jsonwebtoken')).default;
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

export const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

export const addressPayload = (overrides = {}) => ({
  fullName: 'Test Shopper',
  phone: '+91 98765 43210',
  address1: '12 Test Avenue, Gandhi Nagar',
  city: 'Thoothukudi',
  state: 'Tamil Nadu',
  country: 'India',
  zipCode: '628001',
  ...overrides,
});

/**
 * Builds a minimal catalogue: one category, a variant product and a simple one.
 */
export const seedCatalog = async () => {
  const category = await prisma.category.create({
    data: { name: unique('Category'), slug: unique('category') },
  });

  const simple = await prisma.product.create({
    data: {
      name: unique('Simple Product'),
      slug: unique('simple-product'),
      price: 40,
      stock: 10,
      categoryId: category.id,
    },
  });

  const variantProduct = await prisma.product.create({
    data: {
      name: unique('Variant Product'),
      slug: unique('variant-product'),
      price: 100,
      stock: 0,
      categoryId: category.id,
      options: {
        create: [{ name: 'Size', values: ['S', 'M'], position: 0 }],
      },
      variants: {
        create: [
          { sku: unique('SKU-S'), stock: 5, combination: { Size: 'S' } },
          { sku: unique('SKU-M'), stock: 3, priceAdjustment: 15, combination: { Size: 'M' } },
        ],
      },
    },
    include: { variants: true },
  });

  const coupon = await prisma.coupon.create({
    data: {
      code: unique('TEST10').toUpperCase(),
      type: 'PERCENTAGE',
      value: 10,
      minOrder: 20,
      maxDiscount: 25,
      usageLimit: 5,
      perUserLimit: 1,
    },
  });

  return { category, simple, variantProduct, coupon };
};

/**
 * Walks the happy path up to (but not including) payment confirmation.
 */
export const createOrder = async ({ token, productId, variantId = null, quantity = 1, provider = 'MOCK' }) => {
  // When no product is given we check out whatever is already in the cart.
  if (productId) {
    await request(app)
      .post('/api/cart/items')
      .set(authHeader(token))
      .send({ productId, variantId, quantity })
      .expect(200);
  }

  const address = await request(app)
    .post('/api/addresses')
    .set(authHeader(token))
    .send(addressPayload())
    .expect(201);

  return request(app)
    .post('/api/checkout')
    .set(authHeader(token))
    .send({ addressId: address.body.data.id, paymentMethod: provider })
    .expect(201);
};

export { prisma, request };
