import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import { AdminRoute, GuestRoute, ProtectedRoute, SuspenseFallback } from './components/common/ProtectedRoute';
import { ScrollToTop } from './components/common/ScrollToTop';
import { StorefrontLayout } from './layouts/StorefrontLayout';
import { CookieConsentProvider } from './providers/CookieConsentProvider';
import { CookieConsent } from './components/storefront/CookieConsent';
import { AdminLayout } from './layouts/AdminLayout';
import { AccountLayout } from './pages/account/AccountLayout';

import { HomePage } from './pages/storefront/HomePage';
import { ProductsPage } from './pages/storefront/ProductsPage';
import { ProductDetailPage } from './pages/storefront/ProductDetailPage';
import { CartPage } from './pages/storefront/CartPage';
import { CheckoutPage } from './pages/storefront/CheckoutPage';
import { OrdersPage } from './pages/storefront/OrdersPage';
import { OrderDetailPage } from './pages/storefront/OrderDetailPage';
import { TrackOrderPage } from './pages/storefront/TrackOrderPage';
import { WishlistPage } from './pages/storefront/WishlistPage';
import { SupportPage } from './pages/storefront/SupportPage';
import { SupportTicketPage } from './pages/storefront/SupportTicketPage';
import { PolicyPage } from './pages/storefront/PolicyPage';
import { NotFoundPage } from './components/common/NotFoundPage';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

import { ProfilePage } from './pages/account/ProfilePage';
import { AddressesPage } from './pages/account/AddressesPage';
import { NotificationsPage } from './pages/account/NotificationsPage';
import { ReviewsPage } from './pages/account/ReviewsPage';

/* The admin console (charts, tables) is code-split: shoppers never download it. */
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AdminProductsPage = lazy(() =>
  import('./pages/admin/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage })),
);
const AdminProductFormPage = lazy(() =>
  import('./pages/admin/AdminProductFormPage').then((m) => ({ default: m.AdminProductFormPage })),
);
const AdminCategoriesPage = lazy(() =>
  import('./pages/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })),
);
const AdminInventoryPage = lazy(() =>
  import('./pages/admin/AdminInventoryPage').then((m) => ({ default: m.AdminInventoryPage })),
);
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })));
const AdminOrderDetailPage = lazy(() =>
  import('./pages/admin/AdminOrderDetailPage').then((m) => ({ default: m.AdminOrderDetailPage })),
);
const AdminCustomersPage = lazy(() =>
  import('./pages/admin/AdminCustomersPage').then((m) => ({ default: m.AdminCustomersPage })),
);
const AdminCouponsPage = lazy(() => import('./pages/admin/AdminCouponsPage').then((m) => ({ default: m.AdminCouponsPage })));
const AdminAnnouncementsPage = lazy(() =>
  import('./pages/admin/AdminAnnouncementsPage').then((m) => ({ default: m.AdminAnnouncementsPage })),
);
const AdminReviewsPage = lazy(() => import('./pages/admin/AdminReviewsPage').then((m) => ({ default: m.AdminReviewsPage })));
const AdminSupportPage = lazy(() => import('./pages/admin/AdminSupportPage').then((m) => ({ default: m.AdminSupportPage })));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })));

export default function App() {
  return (
    <CookieConsentProvider>
      <CookieConsent />
      <ScrollToTop />

      <Routes>
        {/* Storefront */}
        <Route element={<StorefrontLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:slug" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="policies" element={<PolicyPage />} />
          <Route path="policies/:slug" element={<PolicyPage />} />

          {/* Signed-in shoppers */}
          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="track" element={<TrackOrderPage />} />
            <Route path="support/:id" element={<SupportTicketPage />} />

            <Route path="account" element={<AccountLayout />}>
              <Route index element={<ProfilePage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="addresses" element={<AddressesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
            </Route>
          </Route>
        </Route>

        {/* Auth */}
        <Route element={<GuestRoute />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>

        {/* Admin console */}
        <Route element={<AdminRoute />}>
          <Route
            path="admin"
            element={
              <Suspense fallback={<SuspenseFallback />}>
                <AdminLayout />
              </Suspense>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="reports" element={<AdminReportsPage />} />

            <Route path="products" element={<AdminProductsPage />} />
            <Route path="products/new" element={<AdminProductFormPage />} />
            <Route path="products/:id/edit" element={<AdminProductFormPage />} />

            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="inventory" element={<AdminInventoryPage />} />
            <Route path="reviews" element={<AdminReviewsPage />} />

            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="orders/:id" element={<AdminOrderDetailPage />} />

            <Route path="customers" element={<AdminCustomersPage />} />
            <Route path="coupons" element={<AdminCouponsPage />} />
            <Route path="announcements" element={<AdminAnnouncementsPage />} />
            <Route path="support" element={<AdminSupportPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </CookieConsentProvider>
  );
}
