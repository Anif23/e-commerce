import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell,
  Boxes,
  CreditCard,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Settings,
  Store,
  Tag,
  TicketPercent,
  Users,
  Warehouse,
  X,
} from 'lucide-react';

import { cn } from '../lib/cn';
import { assetUrl } from '../lib/assets';
import { STORE_LOGO, STORE_NAME } from '../lib/store';
import { useStoreSettings } from '../hooks/queries/useStoreSettings';
import { initialsOf } from '../lib/format';
import { useAuthStore } from '../store/authStore';
import { useLogout } from '../hooks/queries/useAuth';
import { useAdminNotifications, useAdminSupportUnread } from '../hooks/queries/useAdmin';
import { IconButton } from '../components/ui/Button';

const GROUPS = [
  {
    label: 'Overview',
    links: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/reports', label: 'Reports', icon: ClipboardList, end: false },
    ],
  },
  {
    label: 'Catalogue',
    links: [
      { to: '/admin/products', label: 'Products', icon: Package, end: false },
      { to: '/admin/categories', label: 'Categories', icon: Tag, end: false },
      { to: '/admin/inventory', label: 'Inventory', icon: Warehouse, end: false },
      { to: '/admin/reviews', label: 'Reviews', icon: Boxes, end: false },
    ],
  },
  {
    label: 'Sales',
    links: [
      { to: '/admin/orders', label: 'Orders', icon: ClipboardList, end: false },
      { to: '/admin/payments', label: 'Payments', icon: CreditCard, end: false },
      { to: '/admin/customers', label: 'Customers', icon: Users, end: false },
      { to: '/admin/coupons', label: 'Coupons', icon: TicketPercent, end: false },
      { to: '/admin/announcements', label: 'Announcements', icon: Megaphone, end: false },
    ],
  },
  {
    label: 'Service',
    links: [{ to: '/admin/support', label: 'Support', icon: Bell, end: false }],
  },
  {
    label: 'Store',
    links: [{ to: '/admin/settings', label: 'Settings', icon: Settings, end: false }],
  },
];

export const AdminLayout = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { data: storeSettings } = useStoreSettings();
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: notifications } = useAdminNotifications();
  const { data: supportUnread } = useAdminSupportUnread();

  // The bell chip counts admin notifications; the Support badge counts tickets
  // awaiting a reply (they are different things and must not share a number).
  const unread = notifications?.unread ?? 0;
  const supportBadge = supportUnread ?? 0;

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            {group.label}
          </p>

          <div className="space-y-0.5">
            {group.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                  )
                }
              >
                <link.icon className="h-4 w-4" />
                {link.label}
                {link.to === '/admin/support' && supportBadge > 0 && (
                  <span className="ml-auto rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {supportBadge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-ink-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-ink-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-ink-200 px-5">
          <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg bg-brand-600 text-sm font-bold text-white">
            {storeSettings?.logoUrl ? (
              <img src={assetUrl(storeSettings.logoUrl)} alt="" className="h-full w-full object-contain" />
            ) : STORE_LOGO}
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight text-ink-900">{storeSettings?.storeName ?? STORE_NAME}</p>
            <p className="text-[11px] text-ink-400">Admin console</p>
          </div>
        </div>

        {nav}

        <div className="border-t border-ink-200 p-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-ink-100"
          >
            <Store className="h-4 w-4" />
            View storefront
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 z-10 flex w-72 max-w-[88vw] flex-col bg-white shadow-xl animate-slide-right">
            <div className="flex h-16 items-center justify-between border-b border-ink-200 px-4">
              <span className="font-semibold text-ink-900">Admin</span>
              <IconButton label="Close menu" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </IconButton>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-lg text-ink-700 transition hover:bg-ink-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1">
            <p className="text-sm font-semibold text-ink-900">Admin console</p>
            <p className="text-xs text-ink-400">Signed in as {user?.username}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-xl bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-600 sm:flex">
              <Bell className="h-3.5 w-3.5" />
              {unread} unread
            </span>

            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {initialsOf(user?.username ?? 'Admin')}
            </span>

            <IconButton
              label="Sign out"
              onClick={() => {
                logout.mutate();
                navigate('/');
              }}
            >
              <LogOut className="h-5 w-5" />
            </IconButton>
          </div>
        </header>

        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
