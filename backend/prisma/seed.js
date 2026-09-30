/**
 * Seeds a realistic demo store: categories, products with variants, demo
 * accounts, coupons, historical orders, reviews and a support ticket.
 *
 *   npm run seed
 *
 * Demo products use curated external photography; no images are generated or stored locally.
 */
import 'dotenv/config';

import bcrypt from 'bcrypt';

import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';
import { round2 } from '../src/lib/money.js';

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

const image = (photo, width = 1200) =>
  `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=${width}&q=85`;

// Seed catalogue photos are real product/lifestyle photography, not generated
// placeholder art. External photo URLs keep the local seed lightweight.
const CATEGORY_IMAGES = {
  audio: image('photo-1505740420928-5e560c06d30e'),
  wearables: image('photo-1546868871-7041f2a55e12'),
  home: image('photo-1600210492486-724fe5c67fb0'),
  accessories: image('photo-1553062407-98eeb64c6a62'),
  outdoors: image('photo-1478131143081-80f7f84ca84d'),
};

const PRODUCT_IMAGES = [
  image('photo-1505740420928-5e560c06d30e'),
  image('photo-1606220945770-b5b6c2c55bf1'),
  image('photo-1608043152269-423dbba4e7e1'),
  image('photo-1523275335684-37898b6baf30'),
  image('photo-1575311373937-040b8e1fd5b6'),
  image('photo-1507473885765-e6ed057f782c'),
  image('photo-1563089145-599997674d42'),
  image('photo-1514228742587-6b1558fcca3d'),
  image('photo-1627123424574-724758594e93'),
  image('photo-1553062407-98eeb64c6a62'),
  image('photo-1590874103328-eac38a683ce7'),
  image('photo-1602143407151-7111542de6e8'),
  image('photo-1504851149312-7a075b496cc7'),
  image('photo-1551632811-561732d1e306'),
  image('photo-1495474472287-4d71bcdd2085'),
  image('photo-1517701604599-bb29b565090c'),
];

const CATEGORIES = [
  { name: 'Audio', slug: 'audio' },
  { name: 'Wearables', slug: 'wearables' },
  { name: 'Home', slug: 'home' },
  { name: 'Accessories', slug: 'accessories' },
  { name: 'Outdoors', slug: 'outdoors' },
];

const PRODUCTS = [
  {
    name: 'Aurora Wireless Headphones',
    category: 'audio',
    price: 15999,
    compareAt: 18999,
    stock: 42,
    brand: 'Aurora',
    featured: true,
    tags: ['bluetooth', 'noise-cancelling'],
    description:
      'Over-ear headphones with adaptive noise cancellation, 40-hour battery life and memory-foam cushions that stay comfortable on long calls.',
    options: [{ name: 'Color', values: ['Midnight', 'Ivory'] }],
    variants: [
      { combination: { Color: 'Midnight' }, stock: 24 },
      { combination: { Color: 'Ivory' }, stock: 18 },
    ],
  },
  {
    name: 'Aurora Pocket Earbuds',
    category: 'audio',
    price: 6999,
    stock: 130,
    brand: 'Aurora',
    featured: true,
    tags: ['bluetooth', 'compact'],
    description: 'Pocketable earbuds with 8 hours of playback, a USB-C fast-charge case and sweat resistance for workouts.',
    options: [{ name: 'Color', values: ['Black', 'White'] }],
    variants: [
      { combination: { Color: 'Black' }, stock: 80 },
      { combination: { Color: 'White' }, stock: 50 },
    ],
  },
  {
    name: 'Nimbus Studio Speaker',
    category: 'audio',
    price: 12499,
    stock: 26,
    brand: 'Nimbus',
    tags: ['speaker', 'wifi'],
    description: 'A bookshelf speaker with room-filling sound, Wi-Fi and Bluetooth, plus a warm walnut finish.',
  },
  {
    name: 'Pulse Smart Watch',
    category: 'wearables',
    price: 18999,
    compareAt: 21999,
    stock: 58,
    brand: 'Pulse',
    featured: true,
    tags: ['fitness', 'gps'],
    description: 'Track runs, sleep and recovery on a bright AMOLED display with 7-day battery and built-in GPS.',
    options: [
      { name: 'Size', values: ['41mm', '45mm'] },
      { name: 'Color', values: ['Graphite', 'Silver'] },
    ],
    variants: [
      { combination: { Size: '41mm', Color: 'Graphite' }, stock: 14 },
      { combination: { Size: '41mm', Color: 'Silver' }, stock: 10 },
      { combination: { Size: '45mm', Color: 'Graphite' }, stock: 20, priceAdjustment: 20 },
      { combination: { Size: '45mm', Color: 'Silver' }, stock: 14, priceAdjustment: 20 },
    ],
  },
  {
    name: 'Pulse Fitness Band',
    category: 'wearables',
    price: 4999,
    stock: 8,
    lowStock: 10,
    brand: 'Pulse',
    tags: ['fitness'],
    description: 'A lightweight band for step, heart-rate and sleep tracking with a 14-day battery.',
  },
  {
    name: 'Lumen Desk Lamp',
    category: 'home',
    price: 4999,
    stock: 64,
    brand: 'Lumen',
    tags: ['lighting', 'desk'],
    description: 'Warm-to-cool LED desk lamp with a touch dimmer, adjustable arm and a USB-C charging port.',
  },
  {
    name: 'Lumen Ambient Light Strip',
    category: 'home',
    price: 2499,
    stock: 0,
    brand: 'Lumen',
    tags: ['lighting'],
    description: 'Sixteen-foot smart light strip with app control and music sync. Currently restocking.',
  },
  {
    name: 'Terra Ceramic Mug Set',
    category: 'home',
    price: 2199,
    stock: 90,
    brand: 'Terra',
    tags: ['kitchen'],
    description: 'Four stoneware mugs with a matte glaze — dishwasher and microwave safe.',
  },
  {
    name: 'Vault Leather Wallet',
    category: 'accessories',
    price: 3499,
    stock: 75,
    brand: 'Vault',
    featured: true,
    tags: ['leather', 'everyday'],
    description: 'Full-grain leather wallet with RFID blocking and room for six cards.',
    options: [{ name: 'Color', values: ['Cognac', 'Black'] }],
    variants: [
      { combination: { Color: 'Cognac' }, stock: 45 },
      { combination: { Color: 'Black' }, stock: 30 },
    ],
  },
  {
    name: 'Vault Travel Backpack',
    category: 'accessories',
    price: 9999,
    compareAt: 12999,
    stock: 37,
    brand: 'Vault',
    tags: ['travel', 'laptop'],
    description: 'A 28-litre backpack with a padded 16" laptop sleeve, water-resistant shell and a hidden passport pocket.',
  },
  {
    name: 'Vault Tech Organiser',
    category: 'accessories',
    price: 1899,
    stock: 120,
    brand: 'Vault',
    tags: ['travel'],
    description: 'Zip pouch with elastic loops for cables, chargers and memory cards.',
  },
  {
    name: 'Summit Trail Bottle',
    category: 'outdoors',
    price: 1499,
    stock: 4,
    lowStock: 12,
    brand: 'Summit',
    tags: ['hydration', 'steel'],
    description: 'Vacuum-insulated 750ml bottle that keeps drinks cold for 24 hours or hot for 12.',
  },
  {
    name: 'Summit Camp Chair',
    category: 'outdoors',
    price: 7499,
    stock: 22,
    brand: 'Summit',
    tags: ['camping'],
    description: 'Folding camp chair with a sturdy aluminium frame, cup holder and carry bag.',
  },
  {
    name: 'Summit Daypack 18L',
    category: 'outdoors',
    price: 6499,
    stock: 31,
    brand: 'Summit',
    tags: ['hiking'],
    description: 'Lightweight daypack with a breathable back panel, hydration sleeve and rain cover.',
  },
  {
    name: 'Brew Pour-Over Kettle',
    category: 'home',
    price: 4599,
    stock: 48,
    brand: 'Brew',
    tags: ['coffee', 'kitchen'],
    description: 'Gooseneck kettle with a precision spout and temperature hold for consistent pour-over.',
  },
  {
    name: 'Brew Hand Grinder',
    category: 'home',
    price: 7499,
    stock: 19,
    brand: 'Brew',
    tags: ['coffee'],
    description: 'Stainless burr grinder with 40 click settings for espresso through French press.',
  },
];

const COUPONS = [
  {
    code: 'WELCOME10',
    type: 'PERCENTAGE',
    value: 10,
    description: '10% off your first order',
    minOrder: 1999,
    maxDiscount: 2000,
    usageLimit: 500,
    perUserLimit: 1,
  },
  {
    code: 'SAVE20',
    type: 'FIXED',
    value: 1500,
    description: '₹1,500 off orders over ₹12,000',
    minOrder: 12000,
    usageLimit: 200,
    perUserLimit: 2,
  },
  {
    code: 'FREESHIP',
    type: 'FIXED',
    value: 49,
    description: 'Free shipping on any order',
    minOrder: 0,
    usageLimit: null,
    perUserLimit: 5,
  },
];

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

async function seed() {
  // eslint-disable-next-line no-console
  console.log('Resetting demo data…');

  // Order matters: delete children first.
  await prisma.orderEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.couponUsage.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.review.deleteMany();
  await prisma.supportMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.adminNotification.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.stockLog.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.variantOption.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.announcement.deleteMany();

  /* ------------------------------- categories ------------------------------ */

  const categories = {};
  for (const category of CATEGORIES) {
    categories[category.slug] = await prisma.category.create({
      data: { name: category.name, slug: category.slug, image: CATEGORY_IMAGES[category.slug] },
    });
  }

  /* -------------------------------- products ------------------------------- */

  const products = [];

  for (const [index, entry] of PRODUCTS.entries()) {
    const product = await prisma.product.create({
      data: {
        name: entry.name,
        slug: slugify(entry.name),
        description: entry.description,
        price: entry.price,
        stock: entry.stock,
        lowStock: entry.lowStock ?? 5,
        isActive: true,
        isFeatured: Boolean(entry.featured),
        sku: `${entry.brand.slice(0, 3).toUpperCase()}-${1000 + index}`,
        brand: entry.brand,
        tags: entry.tags,
        categoryId: categories[entry.category].id,
        discountType: entry.compareAt ? 'FIXED' : null,
        discountValue: entry.compareAt ? round2(entry.compareAt - entry.price) : null,
        images: { create: [{ url: PRODUCT_IMAGES[index] }] },
      },
    });

    if (entry.options?.length) {
      await prisma.variantOption.createMany({
        data: entry.options.map((option, position) => ({
          productId: product.id,
          name: option.name,
          values: option.values,
          position,
        })),
      });
    }

    if (entry.variants?.length) {
      await prisma.productVariant.createMany({
        data: entry.variants.map((variant, variantIndex) => ({
          productId: product.id,
          sku: `${product.sku}-${variantIndex + 1}`,
          stock: variant.stock,
          priceAdjustment: variant.priceAdjustment ?? 0,
          combination: variant.combination,
        })),
      });
    }

    products.push(product);
  }

  /* --------------------------------- users --------------------------------- */

  const admin = await prisma.user.create({
    data: {
      username: 'Store Admin',
      email: env.seed.adminEmail,
      password: await bcrypt.hash(env.seed.adminPassword, 10),
      role: 'ADMIN',
    },
  });

  const shopper = await prisma.user.create({
    data: {
      username: 'Alex Shopper',
      email: env.seed.userEmail,
      password: await bcrypt.hash(env.seed.userPassword, 10),
    },
  });

  const otherCustomers = await Promise.all(
    ['Priya Raman', 'Daniel Osei', 'Mei Lin', 'Tom Baker'].map(async (username, index) =>
      prisma.user.create({
        data: {
          username,
          email: `customer${index + 1}@store.dev`,
          password: await bcrypt.hash('Customer@123', 10),
          createdAt: daysAgo(30 - index * 5),
        },
      }),
    ),
  );

  const address = await prisma.address.create({
    data: {
      userId: shopper.id,
      label: 'Home',
      fullName: 'Arjun Mehta',
      phone: '+91 98765 43210',
      address1: '12, 3rd Cross Street, Gandhi Nagar',
      address2: 'Near Anna Park',
      city: 'Thoothukudi',
      state: 'Tamil Nadu',
      country: 'India',
      zipCode: '628001',
      isDefault: true,
    },
  });

  await prisma.address.create({
    data: {
      userId: shopper.id,
      label: 'Office',
      fullName: 'Arjun Mehta',
      phone: '+91 98400 12345',
      address1: '42, Anna Salai, Thousand Lights',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      zipCode: '600002',
    },
  });

  /* -------------------------------- coupons -------------------------------- */

  for (const coupon of COUPONS) {
    await prisma.coupon.create({ data: coupon });
  }

  /* -------------------------- historical demo orders ----------------------- */

  const orderPlan = [
    { user: shopper, status: 'DELIVERED', days: 26, products: [0, 8], coupon: 'WELCOME10' },
    { user: shopper, status: 'SHIPPED', days: 9, products: [3], coupon: null },
    { user: shopper, status: 'PROCESSING', days: 2, products: [1, 10], coupon: null },
    { user: otherCustomers[0], status: 'DELIVERED', days: 21, products: [5, 14], coupon: 'SAVE20' },
    { user: otherCustomers[1], status: 'DELIVERED', days: 17, products: [9], coupon: null },
    { user: otherCustomers[2], status: 'CANCELLED', days: 12, products: [11], coupon: null },
    { user: otherCustomers[3], status: 'DELIVERED', days: 5, products: [2, 15], coupon: 'FREESHIP' },
    { user: otherCustomers[0], status: 'PROCESSING', days: 1, products: [12], coupon: null },
  ];

  const couponRows = await prisma.coupon.findMany();
  const findCoupon = (code) => couponRows.find((coupon) => coupon.code === code) ?? null;

  for (const plan of orderPlan) {
    const items = plan.products.map((productIndex) => ({ product: products[productIndex], productIndex, quantity: 1 }));
    const subtotal = round2(items.reduce((sum, item) => sum + item.product.price * item.quantity, 0));
    const coupon = plan.coupon ? findCoupon(plan.coupon) : null;

    const discount = coupon
      ? Math.min(
          coupon.type === 'PERCENTAGE' ? round2((subtotal * coupon.value) / 100) : round2(coupon.value),
          coupon.maxDiscount ? round2(coupon.maxDiscount) : subtotal,
        )
      : 0;

    const shipping = subtotal - discount >= env.freeShippingThreshold ? 0 : env.shippingFee;
    const tax = round2(((subtotal - discount) * env.taxRatePercent) / 100);
    const total = round2(subtotal - discount + shipping + tax);

    const order = await prisma.order.create({
      data: {
        userId: plan.user.id,
        addressId: plan.user.id === shopper.id ? address.id : null,
        status: plan.status,
        subtotal,
        discount,
        shipping,
        tax,
        taxName: 'GST',
        taxRatePercent: env.taxRatePercent,
        total,
        couponId: coupon?.id ?? null,
        couponCode: coupon?.code ?? null,
        createdAt: daysAgo(plan.days),
        placedAt: daysAgo(plan.days),
        deliveredAt: plan.status === 'DELIVERED' ? daysAgo(Math.max(0, plan.days - 3)) : null,
        shippedAt: ['SHIPPED', 'DELIVERED'].includes(plan.status) ? daysAgo(Math.max(0, plan.days - 2)) : null,
        cancelledAt: plan.status === 'CANCELLED' ? daysAgo(Math.max(0, plan.days - 1)) : null,
        trackingNumber: ['SHIPPED', 'DELIVERED'].includes(plan.status) ? `TRK${100000 + plan.days * 7}` : null,
        trackingCarrier: ['SHIPPED', 'DELIVERED'].includes(plan.status) ? 'SwiftPost' : null,
        items: {
          create: items.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            image: PRODUCT_IMAGES[item.productIndex],
            price: item.product.price,
            quantity: item.quantity,
            total: round2(item.product.price * item.quantity),
          })),
        },
      },
    });

    const paid = plan.status === 'DELIVERED';

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: total,
        currency: env.currency,
        provider: 'COD',
        status: plan.status === 'CANCELLED' ? 'CANCELLED' : paid ? 'SUCCESS' : 'PENDING',
        method: 'cash_on_delivery',
        capturedAt: paid ? daysAgo(Math.max(0, plan.days - 3)) : null,
        createdAt: daysAgo(plan.days),
      },
    });

    const events = [
      { status: 'PROCESSING', message: 'Order placed — cash on delivery', days: plan.days },
      ...(plan.status === 'CANCELLED'
        ? [{ status: 'CANCELLED', message: 'Cancelled by customer', days: Math.max(0, plan.days - 1) }]
        : [
            ...(['SHIPPED', 'DELIVERED'].includes(plan.status)
              ? [{ status: 'SHIPPED', message: 'Handed to courier', days: Math.max(0, plan.days - 2) }]
              : []),
            ...(plan.status === 'DELIVERED'
              ? [{ status: 'DELIVERED', message: 'Delivered — cash collected on delivery', days: Math.max(0, plan.days - 3) }]
              : []),
          ]),
    ];

    await prisma.orderEvent.createMany({
      data: events.map((event) => ({
        orderId: order.id,
        status: event.status,
        message: event.message,
        actor: 'system',
        createdAt: daysAgo(event.days),
      })),
    });

    if (coupon && paid) {
      await prisma.couponUsage.create({ data: { couponId: coupon.id, userId: plan.user.id, orderId: order.id } });
      await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
    }

    if (paid) {
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.product.id },
          data: { soldCount: { increment: item.quantity } },
        });
      }
    }
  }

  /* -------------------------------- reviews -------------------------------- */

  const reviewPlan = [
    { productIndex: 0, user: otherCustomers[0], rating: 5, title: 'Excellent sound', comment: 'Comfortable for long flights and the ANC is genuinely good.' },
    { productIndex: 0, user: otherCustomers[1], rating: 4, title: 'Great value', comment: 'Battery lasts forever. App could be better.' },
    { productIndex: 3, user: otherCustomers[2], rating: 5, title: 'Perfect for runs', comment: 'GPS locks fast and the display is bright in sunlight.' },
    { productIndex: 8, user: otherCustomers[3], rating: 4, title: 'Beautiful leather', comment: 'Softened nicely after a week of use.' },
    { productIndex: 5, user: otherCustomers[0], rating: 3, title: 'Good, a bit bright', comment: 'Nice build, but I wish it dimmed further.' },
  ];

  for (const entry of reviewPlan) {
    const product = products[entry.productIndex];

    await prisma.review.create({
      data: {
        productId: product.id,
        userId: entry.user.id,
        rating: entry.rating,
        title: entry.title,
        comment: entry.comment,
        isVerifiedPurchase: true,
        isApproved: true,
        createdAt: daysAgo(7),
      },
    });
  }

  // Refresh denormalised rating counters.
  const rated = new Set(reviewPlan.map((entry) => products[entry.productIndex].id));

  for (const productId of rated) {
    const stats = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await prisma.product.update({
      where: { id: productId },
      data: { ratingAvg: round2(stats._avg.rating ?? 0), ratingCount: stats._count._all },
    });
  }

  /* ---------------------- wishlist, cart and support ----------------------- */

  await prisma.wishlist.create({
    data: {
      userId: shopper.id,
      items: { create: [{ productId: products[3].id }, { productId: products[9].id }] },
    },
  });

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: shopper.id,
      subject: 'Delivery window for order #2',
      status: 'PENDING',
      priority: 'NORMAL',
      messages: {
        create: [
          { message: 'Hi! Could you confirm the delivery window for my recent order?', userId: shopper.id },
          { message: 'Sure — it should arrive between 9am and 1pm on Thursday.', isAdmin: true, userId: admin.id },
        ],
      },
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: shopper.id,
        title: 'Order shipped',
        message: 'Your order is on the way',
        type: 'ORDER',
        link: '/orders',
        isRead: false,
      },
      {
        userId: shopper.id,
        title: 'Weekend sale',
        message: 'Enjoy 10% off with code WELCOME10',
        type: 'PROMOTION',
        isRead: false,
      },
    ],
  });

  await prisma.adminNotification.createMany({
    data: [
      { title: 'New order', message: 'Order placed and awaiting fulfilment', type: 'ORDER', link: '/admin/orders' },
      { title: 'Low stock', message: 'Summit Trail Bottle is running low', type: 'LOW_STOCK', link: '/admin/inventory' },
    ],
  });

  await prisma.announcement.create({
    data: {
      title: 'Free shipping over ₹999',
      message: 'Use code FREESHIP at checkout — no minimum this week.',
      isActive: true,
    },
  });

  /* eslint-disable no-console */
  console.log('\nSeed complete');
  console.log('───────────────────────────────────────────────');
  console.log('  Admin     :', env.seed.adminEmail, '/', env.seed.adminPassword);
  console.log('  Shopper   :', env.seed.userEmail, '/', env.seed.userPassword);
  console.log('  Categories:', CATEGORIES.length);
  console.log('  Products  :', PRODUCTS.length);
  console.log('  Coupons   :', COUPONS.map((coupon) => coupon.code).join(', '));
  console.log(`  Ticket    : #${ticket.id}`);
  console.log('───────────────────────────────────────────────\n');
  /* eslint-enable no-console */
}

seed()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
