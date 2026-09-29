import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { app, authHeader, makeUser, prisma, seedCatalog } from './helpers.js';

/** Product discovery: search, filters, sorting, pagination and detail. */
describe('catalog', () => {
  let catalog;
  let customer;

  beforeAll(async () => {
    catalog = await seedCatalog();
    customer = await makeUser();

    await prisma.product.create({
      data: {
        name: 'Budget Friendly Mug',
        slug: 'budget-friendly-mug',
        price: 12,
        stock: 4,
        brand: 'Terra',
        tags: ['kitchen'],
        categoryId: catalog.category.id,
        isFeatured: true,
      },
    });

    await prisma.product.create({
      data: {
        name: 'Premium Roasted Beans',
        slug: 'premium-roasted-beans',
        price: 320,
        stock: 0,
        brand: 'Brew',
        tags: ['coffee'],
        categoryId: catalog.category.id,
      },
    });
  });

  it('returns paginated products with metadata', async () => {
    const response = await request(app).get('/api/products?page=1&limit=2').expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(response.body.pagination).toMatchObject({ page: 1, limit: 2, hasPrev: false });
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(4);
  });

  it('searches by name, brand and tag', async () => {
    const byName = await request(app).get('/api/products?search=budget').expect(200);
    expect(byName.body.data.map((product) => product.name)).toEqual(['Budget Friendly Mug']);

    const byBrand = await request(app).get('/api/products?brand=Brew').expect(200);
    expect(byBrand.body.data.every((product) => product.brand === 'Brew')).toBe(true);

    const byTag = await request(app).get('/api/products?tags=coffee').expect(200);
    expect(byTag.body.data.map((product) => product.name)).toContain('Premium Roasted Beans');
  });

  it('filters by price range and stock status', async () => {
    const cheap = await request(app).get('/api/products?maxPrice=20').expect(200);
    expect(cheap.body.data.every((product) => product.price <= 20)).toBe(true);

    const inStock = await request(app).get('/api/products?inStock=true').expect(200);
    expect(inStock.body.data.every((product) => product.stock > 0)).toBe(true);

    const featured = await request(app).get('/api/products?featured=true').expect(200);
    expect(featured.body.data.every((product) => product.isFeatured)).toBe(true);
  });

  it('sorts by price in both directions', async () => {
    const ascending = await request(app).get('/api/products?sort=price_asc&limit=20').expect(200);
    const prices = ascending.body.data.map((product) => product.price);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);

    const descending = await request(app).get('/api/products?sort=price_desc&limit=20').expect(200);
    const desc = descending.body.data.map((product) => product.price);
    expect([...desc].sort((a, b) => b - a)).toEqual(desc);
  });

  it('returns facets for the filter sidebar', async () => {
    const response = await request(app).get('/api/products/filters').expect(200);

    expect(response.body.data.brands).toContain('Brew');
    expect(response.body.data.price.max).toBeGreaterThanOrEqual(response.body.data.price.min);
    expect(response.body.data.categories.length).toBeGreaterThan(0);
  });

  it('opens a product by id or slug with variants and options', async () => {
    const bySlug = await request(app).get(`/api/products/${catalog.variantProduct.slug}`).expect(200);

    expect(bySlug.body.data.id).toBe(catalog.variantProduct.id);
    expect(bySlug.body.data.variants).toHaveLength(2);
    expect(bySlug.body.data.options[0]).toMatchObject({ name: 'Size' });
    expect(bySlug.body.data.hasVariants).toBe(true);

    await request(app).get(`/api/products/${catalog.variantProduct.id}`).expect(200);
    await request(app).get('/api/products/does-not-exist').expect(404);
  });

  it('paginates product reviews with a rating distribution', async () => {
    await prisma.review.create({
      data: {
        productId: catalog.simple.id,
        userId: customer.user.id,
        rating: 5,
        comment: 'Great value',
        isVerifiedPurchase: true,
      },
    });

    const response = await request(app).get(`/api/products/${catalog.simple.id}/reviews`).expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.distribution.find((bucket) => bucket.rating === 5).count).toBe(1);
  });

  it('saves and removes wishlist entries', async () => {
    await request(app)
      .post(`/api/wishlist/${catalog.simple.id}`)
      .set(authHeader(customer.token))
      .expect(200);

    const list = await request(app).get('/api/wishlist').set(authHeader(customer.token)).expect(200);
    expect(list.body.data.map((entry) => entry.product.id)).toContain(catalog.simple.id);

    await request(app)
      .delete(`/api/wishlist/${catalog.simple.id}`)
      .set(authHeader(customer.token))
      .expect(200);

    const after = await request(app).get('/api/wishlist').set(authHeader(customer.token)).expect(200);
    expect(after.body.data.map((entry) => entry.product.id)).not.toContain(catalog.simple.id);
  });
});
