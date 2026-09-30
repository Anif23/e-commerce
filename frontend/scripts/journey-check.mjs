/**
 * End-to-end journey check driven by the frontend's own API layer.
 *
 * It loads `src/lib/api/endpoints.ts` through Vite so every request is the exact
 * one the UI makes, then walks the purchase journey from browse -> cart ->
 * coupon -> COD checkout -> tracking -> review -> support, finishing with
 * the admin tools.
 */
process.env.VITE_API_URL = process.env.VITE_API_URL ?? 'http://127.0.0.1:5000/api';

import { createServer } from 'vite';

const server = await createServer({
  root: process.cwd(),
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
});

const { api } = await server.ssrLoadModule('/src/lib/api/client.ts');
const { authApi, catalogApi, cartApi, wishlistApi, addressApi, checkoutApi, ordersApi, reviewsApi, supportApi, notificationsApi, profileApi, couponsApi, adminApi } =
  await server.ssrLoadModule('/src/lib/api/endpoints.ts');
const { useAuthStore } = await server.ssrLoadModule('/src/store/authStore.ts');

let step = 0;
let failures = 0;

const ok = (label, extra = '') => console.log(`  ${String(++step).padStart(2)}. ✓ ${label}${extra ? ` — ${extra}` : ''}`);
const fail = (label, error) => {
  failures += 1;
  console.error(`  ${String(++step).padStart(2)}. ✗ ${label}\n     ${error?.response?.data?.message ?? error?.message ?? error}`);
};

const run = async (label, fn) => {
  try {
    const result = await fn();
    ok(label, result);
    return result;
  } catch (error) {
    fail(label, error);
    return null;
  }
};

const setSession = (data) => useAuthStore.getState().setSession(data.token, data.user);

console.log('\nSTOREFRONT JOURNEY');
console.log('------------------');

/* 1. register a fresh shopper (also exercises registration + a clean cart) */
const email = `journey_${Date.now()}@store.dev`;

await run('register shopper', async () => {
  const { data } = await authApi.register({ username: `journey_${Date.now().toString(36)}`, email, password: 'Journey@123' });
  setSession(data.data);
  return `${data.data.user.username} (${data.data.user.role})`;
});

/* 2. browse + search + filters */
await run('browse products', async () => {
  const { data } = await catalogApi.products({ page: 1, sort: 'newest' });
  return `${data.data.length} of ${data.pagination.total} products`;
});

await run('search "coffee"', async () => {
  const { data } = await catalogApi.products({ search: 'coffee' });
  return `${data.pagination.total} match(es)`;
});

await run('filter facets', async () => {
  const { data } = await catalogApi.filters();
  return `${data.data.categories.length} categories, ${data.data.brands.length} brands`;
});

/* 3. product detail with variants */
let variantProduct = null;
await run('product detail (variant aware)', async () => {
  const { data } = await catalogApi.products({ page: 1, limit: 50 });
  variantProduct = data.data.find((product) => product.hasVariants) ?? data.data[0];
  const detail = await catalogApi.product(variantProduct.slug);
  return `${detail.data.data.name} — ${detail.data.data.variants.length} variants, stock ${detail.data.data.stock}`;
});

/* 4. cart, variant aware */
await run('clear cart', async () => {
  await cartApi.clear();
  return 'empty';
});

await run('add product to cart', async () => {
  const variant = variantProduct.variants.find((entry) => entry.stock > 0) ?? null;
  const { data } = await cartApi.addItem({
    productId: variantProduct.id,
    variantId: variant?.id ?? null,
    quantity: 2,
  });
  return `${data.data.items.length} line(s), ${data.data.totals.subtotal} subtotal${variant ? ` (${variant.label})` : ''}`;
});

await run('quantity update', async () => {
  const cart = await cartApi.get();
  const item = cart.data.data.items[0];
  const { data } = await cartApi.updateItem(item.id, 3);
  return `line qty ${data.data.items[0].quantity}, total ${data.data.totals.total}`;
});

/* 5. coupon */
await run('validate coupon WELCOME10', async () => {
  const cart = await cartApi.get();
  const { data } = await couponsApi.validate('WELCOME10', cart.data.data.totals.subtotal);
  return `${data.data.discount} off`;
});

await run('apply coupon to cart', async () => {
  const { data } = await cartApi.applyCoupon('WELCOME10');
  return `${data.data.couponCode} → discount ${data.data.totals.discount}, total ${data.data.totals.total}`;
});

/* 6. addresses */
let addressId = null;
await run('create address', async () => {
  const { data } = await addressApi.create({
    label: 'Home',
    fullName: 'Meera Iyer',
    phone: '+91 98400 22118',
    address1: '18, Nehru Street, Palayamkottai',
    city: 'Tirunelveli',
    state: 'Tamil Nadu',
    country: 'India',
    zipCode: '627001',
    isDefault: true,
  });
  addressId = data.data.id;
  return `#${addressId} ${data.data.city}`;
});

/* 7. checkout */
await run('checkout summary', async () => {
  const { data } = await checkoutApi.summary();
  return `${data.data.cart.items.length} items, ${data.data.paymentMethods.map((m) => m.id).join('/')} methods, shipping ${data.data.shipping.fee}`;
});

let orderId = null;
await run('place cash-on-delivery order', async () => {
  const { data } = await checkoutApi.place({
    addressId,
    paymentMethod: 'COD',
    customerNote: 'Leave at the door',
  });
  orderId = data.data.order.id;
  return `#${orderId} ${data.data.order.status} (${data.data.payment.provider}/${data.data.payment.status})`;
});

await run('payment methods', async () => {
  const { data } = await paymentsApi.methods();
  return data.data.map((method) => method.id).join(', ');
});

/* 8. order views */
await run('order detail', async () => {
  const { data } = await ordersApi.detail(orderId);
  return `${data.data.items.length} items, total ${data.data.totals.total}, timeline ${data.data.timeline.length} events`;
});

await run('order tracking', async () => {
  const { data } = await ordersApi.track(orderId);
  const done = data.data.steps.filter((entry) => entry.done).length;
  return `${data.data.status} — ${done}/${data.data.steps.length} steps complete`;
});

await run('order stats', async () => {
  const { data } = await ordersApi.stats();
  return `${data.data.total} orders, ${data.data.lifetimeSpend} lifetime`;
});

/* 9. reviews */
await run('review eligibility', async () => {
  const { data } = await reviewsApi.eligibility(variantProduct.id);
  return `canReview=${data.data.canReview} hasReviewed=${data.data.hasReviewed}`;
});

let reviewId = null;
await run('post review', async () => {
  const { data } = await reviewsApi.create({
    productId: variantProduct.id,
    rating: 5,
    title: 'Solid build',
    comment: 'Exactly what the description promised.',
  });
  reviewId = data.data.id;
  return `#${reviewId} rating ${data.data.rating}`;
});

await run('product reviews + distribution', async () => {
  const { data } = await catalogApi.reviews(variantProduct.slug, { page: 1 });
  return `${data.data.length} review(s), distribution ${data.distribution.map((d) => `${d.rating}:${d.count}`).join(' ')}`;
});

/* 10. support */
let ticketId = null;
await run('open support ticket', async () => {
  const { data } = await supportApi.create({ subject: 'Where is my parcel?', message: 'It has been three days.', orderId, priority: 'NORMAL' });
  ticketId = data.data.id;
  return `#${ticketId} ${data.data.status}`;
});

await run('reply to ticket', async () => {
  const { data } = await supportApi.reply(ticketId, 'Any update please?');
  return `${data.data.messages.length} messages`;
});

await run('faq', async () => {
  const { data } = await supportApi.faq();
  return `${data.data.length} entries`;
});

/* 11. wishlist + notifications + profile */
await run('wishlist toggle', async () => {
  const first = await wishlistApi.toggle(variantProduct.id);
  const list = await wishlistApi.list();
  return `${list.data.data.length} saved (wishlisted=${first.data.wishlisted})`;
});

await run('notifications', async () => {
  const { data } = await notificationsApi.list();
  return `${data.data.length} notifications, ${data.unread} unread`;
});

await run('profile', async () => {
  const { data } = await profileApi.get();
  return data.data.username;
});

/* 12. cancel a second order to prove the flow */
await run('place + cancel order', async () => {
  const variant = variantProduct.variants.find((entry) => entry.stock > 0) ?? null;
  await cartApi.addItem({ productId: variantProduct.id, variantId: variant?.id ?? null, quantity: 1 });
  const placed = await checkoutApi.place({ addressId, paymentMethod: 'COD' });
  const cancelled = await ordersApi.cancel(placed.data.data.order.id, 'Changed my mind');
  return `#${cancelled.data.data.id} → ${cancelled.data.data.status}`;
});

console.log('\nADMIN JOURNEY');
console.log('-------------');

await run('login admin', async () => {
  const { data } = await authApi.login({ email: 'admin@store.dev', password: 'Admin@123' });
  setSession(data.data);
  return `${data.data.user.username} (${data.data.user.role})`;
});

await run('dashboard', async () => {
  const { data } = await adminApi.dashboard();
  return `revenue ${data.data.cards.revenue}, orders ${data.data.cards.orders}, lowStock ${data.data.cards.lowStockCount}`;
});

await run('admin products list', async () => {
  const { data } = await adminApi.products({ page: 1 });
  return `${data.data.length} of ${data.pagination.total}`;
});

let createdProductId = null;
await run('create product (multipart)', async () => {
  const form = new FormData();
  form.append('name', `Smoke Test Product ${Date.now()}`);
  form.append('categoryId', String((await adminApi.categories()).data.data[0].id));
  form.append('price', '1999');
  form.append('stock', '25');
  form.append('lowStock', '5');
  form.append('brand', 'Smoke');
  form.append('tags', 'test, smoke');
  form.append('description', 'Created by the frontend journey check.');
  const { data } = await adminApi.createProduct(form);
  createdProductId = data.data.id;
  return `#${createdProductId} ${data.data.slug}`;
});

let variantId = null;
const duplicateSku = `SMOKE-${Date.now().toString(36)}`;
await run('add variant', async () => {
  await adminApi.setOptions(createdProductId, [{ name: 'Size', values: ['S', 'M', 'L'] }]);
  const { data } = await adminApi.createVariant(createdProductId, {
    sku: duplicateSku,
    price: '2199',
    stock: 10,
    combination: { Size: 'M' },
  });
  variantId = data.data.id;
  return `#${data.data.id} ${data.data.sku} @ ${data.data.price}`;
});

await run('duplicate SKU is rejected', async () => {
  try {
    await api.post(`/admin/products/${createdProductId}/variants`, { sku: duplicateSku, stock: 1 });
    throw new Error('duplicate sku was accepted');
  } catch (error) {
    const status = error.response?.status;
    if (status !== 409) throw new Error(`expected 409, got ${status}`);
    return `409 ${error.response.data.message}`;
  }
});

await run('adjust stock', async () => {
  const { data } = await adminApi.adjustStock(createdProductId, { change: 5, reason: 'Journey check restock' });
  return `stock now ${data.data.stock}`;
});

await run('update product', async () => {
  const form = new FormData();
  form.append('price', '1799');
  form.append('isFeatured', 'true');
  const { data } = await adminApi.updateProduct(createdProductId, form);
  return `${data.data.price} featured=${data.data.isFeatured}`;
});

await run('advance order to processing', async () => {
  const { data } = await adminApi.updateOrderStatus(orderId, {
    status: 'PROCESSING',
    note: 'Packing',
  });
  return `#${data.data.id} ${data.data.status}`;
});

await run('advance order to shipped', async () => {
  const { data } = await adminApi.updateOrderStatus(orderId, {
    status: 'SHIPPED',
    trackingNumber: 'SMOKE123456',
    trackingCarrier: 'Demo Courier',
    note: 'Handed to courier',
  });
  return `#${data.data.id} ${data.data.status} (${data.data.tracking.number})`;
});

await run('deliver order', async () => {
  const { data } = await adminApi.updateOrderStatus(orderId, { status: 'DELIVERED', note: 'Delivered' });
  return `${data.data.status}`;
});

await run('order counters', async () => {
  const { data } = await adminApi.orderCounters();
  return JSON.stringify(data.data.counters);
});

await run('inventory report', async () => {
  const { data } = await adminApi.inventoryReport();
  return `valuation ${data.data.valuation}, low ${data.data.lowStock}, out ${data.data.outOfStock}`;
});

await run('customers', async () => {
  const { data } = await adminApi.customers({ page: 1 });
  return `${data.data.length} of ${data.pagination.total}`;
});

await run('coupons + announcements + reviews', async () => {
  const [coupons, announcements, reviews] = await Promise.all([
    adminApi.coupons({}),
    adminApi.announcements(),
    adminApi.reviews({ page: 1 }),
  ]);
  return `${coupons.data.data.length} coupons, ${announcements.data.data.length} announcements, ${reviews.data.data.length} reviews`;
});

await run('moderate + delete review', async () => {
  await adminApi.moderateReview(reviewId, true);
  await adminApi.deleteReview(reviewId);
  return `review #${reviewId} approved then removed`;
});

await run('reports (30d)', async () => {
  const { data } = await adminApi.reports('30d');
  return `revenue ${data.data.summary.revenue}, orders ${data.data.summary.orders}, ${data.data.topProducts.length} top products`;
});

await run('admin support reply', async () => {
  const { data } = await adminApi.replySupport(ticketId, 'It is on the way, sorry for the wait.');
  await adminApi.updateSupportStatus(ticketId, 'RESOLVED');
  return `ticket #${ticketId} resolved`;
});

await run('delete test product', async () => {
  await adminApi.deleteProduct(createdProductId);
  return `#${createdProductId} soft-deleted`;
});

await server.close();

console.log(failures ? `\n${failures} step(s) failed` : `\nAll ${step} steps passed`);
process.exit(failures ? 1 : 0);
