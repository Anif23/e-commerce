/**
 * Render smoke test: boots the real Vite app in SSR mode and renders every
 * screen to a string. Catches import cycles, bad JSX, missing exports and hook
 * misuse without needing a browser.
 *
 * Public routes go through <App/> (router + guards); guarded/admin screens are
 * rendered directly because React.lazy cannot resolve synchronously in SSR.
 *
 * Run from the frontend directory:  node ./ssr-smoke.tmp.mjs
 */
import { createServer } from 'vite';
import { createElement } from 'react';

/* route -> [session, render through the router?] */
const PUBLIC = [
  '/',
  '/products',
  '/products?search=coffee&sort=price_asc',
  '/products/brew-hand-grinder',
  '/cart',
  '/wishlist',
  '/support',
  '/login',
  '/register',
  '/policies',
  '/policies/privacy',
  '/policies/refund',
  '/policies/shipping',
  '/policies/terms',
  '/policies/cookies',
  '/nope',
];

const SCREENS = [
  ['src/pages/storefront/CheckoutPage.tsx', 'CheckoutPage', 'shopper'],
  ['src/pages/storefront/OrdersPage.tsx', 'OrdersPage', 'shopper'],
  ['src/pages/storefront/OrderDetailPage.tsx', 'OrderDetailPage', 'shopper'],
  ['src/pages/storefront/TrackOrderPage.tsx', 'TrackOrderPage', 'shopper'],
  ['src/pages/storefront/SupportTicketPage.tsx', 'SupportTicketPage', 'shopper'],
  ['src/pages/account/AccountLayout.tsx', 'AccountLayout', 'shopper'],
  ['src/pages/account/ProfilePage.tsx', 'ProfilePage', 'shopper'],
  ['src/pages/account/AddressesPage.tsx', 'AddressesPage', 'shopper'],
  ['src/pages/account/NotificationsPage.tsx', 'NotificationsPage', 'shopper'],
  ['src/pages/account/ReviewsPage.tsx', 'ReviewsPage', 'shopper'],
  ['src/layouts/AdminLayout.tsx', 'AdminLayout', 'admin'],
  ['src/pages/admin/DashboardPage.tsx', 'DashboardPage', 'admin'],
  ['src/pages/admin/AdminProductsPage.tsx', 'AdminProductsPage', 'admin'],
  ['src/pages/admin/AdminProductFormPage.tsx', 'AdminProductFormPage', 'admin'],
  ['src/pages/admin/AdminCategoriesPage.tsx', 'AdminCategoriesPage', 'admin'],
  ['src/pages/admin/AdminInventoryPage.tsx', 'AdminInventoryPage', 'admin'],
  ['src/pages/admin/AdminOrdersPage.tsx', 'AdminOrdersPage', 'admin'],
  ['src/pages/admin/AdminOrderDetailPage.tsx', 'AdminOrderDetailPage', 'admin'],
  ['src/pages/admin/AdminCustomersPage.tsx', 'AdminCustomersPage', 'admin'],
  ['src/pages/admin/AdminCouponsPage.tsx', 'AdminCouponsPage', 'admin'],
  ['src/pages/admin/AdminAnnouncementsPage.tsx', 'AdminAnnouncementsPage', 'admin'],
  ['src/pages/admin/AdminReviewsPage.tsx', 'AdminReviewsPage', 'admin'],
  ['src/pages/admin/AdminSupportPage.tsx', 'AdminSupportPage', 'admin'],
  ['src/pages/admin/AdminReportsPage.tsx', 'AdminReportsPage', 'admin'],
];

const SESSIONS = {
  guest: null,
  shopper: { id: 2, username: 'shopper', email: 'shopper@store.dev', role: 'USER' },
  admin: { id: 1, username: 'admin', email: 'admin@store.dev', role: 'ADMIN' },
};

const server = await createServer({
  root: process.cwd(),
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
});

const { renderToString } = await import('react-dom/server');
const { MemoryRouter } = await import('react-router-dom');

const modules = {};
const load = (path) => (modules[path] ??= server.ssrLoadModule(`/${path}`));

const App = (await load('src/App.tsx')).default;
const { QueryProvider } = await load('src/providers/QueryProvider.tsx');
const { queryClient } = await load('src/lib/queryClient.ts');
const { queryKeys } = await load('src/lib/queryKeys.ts');
const { useAuthStore } = await load('src/store/authStore.ts');
const { disconnectSocket } = await load('src/lib/socket.ts');

/* ---- seed caches with real API payloads so data-heavy paths render ---- */
const BASE = 'http://127.0.0.1:5000/api';
const get = async (path) => (await fetch(`${BASE}${path}`)).json();

let seeded = 0;
try {
  const [featured, categories, products, product] = await Promise.all([
    get('/products/featured?limit=8'),
    get('/categories'),
    get('/products?page=1&sort=newest'),
    get('/products/brew-hand-grinder'),
  ]);

  queryClient.setQueryData(queryKeys.featured, featured.data.data ?? featured.data);
  queryClient.setQueryData(queryKeys.categories, categories.data.data ?? categories.data);
  queryClient.setQueryData(queryKeys.products({ page: 1, sort: 'newest' }), products.data);
  queryClient.setQueryData(queryKeys.products({ page: 1, search: 'coffee', sort: 'price_asc' }), products.data);
  queryClient.setQueryData(queryKeys.product('brew-hand-grinder'), product.data);
  seeded = 5;
} catch (error) {
  console.warn('could not seed caches:', error.message);
}
console.log(`seeded ${seeded} caches from the live API\n`);

let failures = 0;
const check = (label, factory, session, entry = '/') => {
  useAuthStore.setState({ token: session === 'guest' ? null : `smoke-${session}`, user: SESSIONS[session] });

  try {
    const html = renderToString(
      createElement(QueryProvider, null, createElement(MemoryRouter, { initialEntries: [entry] }, factory())),
    );

    if (html.length < 200) throw new Error(`suspiciously small render (${html.length} chars)`);
    const rupees = (html.match(/₹/g) ?? []).length;
    const dollars = (html.match(/\$\d/g) ?? []).length;
    console.log(
      `✓ ${label.padEnd(42)} ${String(html.length).padStart(6)} chars  ₹${String(rupees).padStart(3)}  $${String(dollars).padStart(3)}  ${html.includes('Asnif') ? 'brand' : '-------'}  ${html.includes('We use cookies') ? 'cookies' : '-------'}`,
    );
  } catch (error) {
    failures += 1;
    console.error(`✗ ${label}\n  ${String(error?.stack ?? error).split('\n').slice(0, 8).join('\n  ')}`);
  }
};

for (const route of PUBLIC) {
  check(`route ${route}`, () => createElement(App), 'guest', route);
}

for (const [path, exportName, session] of SCREENS) {
  const module = await load(path);
  check(exportName, () => createElement(module[exportName]), session);
}

disconnectSocket();
await server.close();

console.log(failures ? `\n${failures} screen(s) failed` : `\nAll ${PUBLIC.length + SCREENS.length} screens rendered`);
process.exit(failures ? 1 : 0);
