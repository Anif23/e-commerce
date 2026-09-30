import { NavLink, Outlet } from 'react-router-dom';
import { Bell, Heart, MapPin, Package, Star, User as UserIcon } from 'lucide-react';

import { cn } from '../../lib/cn';
import { initialsOf } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { useNotifications } from '../../hooks/queries/useAccount';
import { useOrderStats } from '../../hooks/queries/useOrders';

const LINKS = [
  { to: '/account', label: 'Profile', icon: UserIcon, end: true },
  { to: '/account/orders', label: 'Orders', icon: Package, end: false },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin, end: false },
  { to: '/account/notifications', label: 'Notifications', icon: Bell, end: false },
  { to: '/account/reviews', label: 'My reviews', icon: Star, end: false },
  { to: '/wishlist', label: 'Wishlist', icon: Heart, end: false },
];

export const AccountLayout = () => {
  const user = useAuthStore((state) => state.user);
  const { data: notifications } = useNotifications();
  const { data: stats } = useOrderStats();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="surface mb-6 flex flex-col gap-4 p-4 sm:mb-8 sm:flex-row sm:items-center sm:p-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-600 text-lg font-semibold text-white">
          {initialsOf(user?.username ?? 'You')}
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-ink-900">{user?.username}</h1>
          <p className="truncate text-sm text-ink-500">{user?.email}</p>
        </div>

        <div className="grid w-full grid-cols-2 gap-4 border-t border-ink-100 pt-3 sm:w-auto sm:gap-6 sm:border-0 sm:pt-0">
          <div className="sm:text-right">
            <p className="text-lg font-semibold text-ink-900">{stats?.total ?? 0}</p>
            <p className="text-xs text-ink-500">Orders</p>
          </div>
          <div className="sm:text-right">
            <p className="text-lg font-semibold text-ink-900">{notifications?.unread ?? 0}</p>
            <p className="text-xs text-ink-500">Unread</p>
          </div>
        </div>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-4 lg:gap-8">
        <aside className="min-w-0">
          <nav className="surface grid grid-cols-2 gap-1 p-2 sm:grid-cols-3 lg:sticky lg:top-24 lg:flex lg:flex-col">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2.5 text-xs font-medium transition sm:gap-2.5 sm:px-3 sm:text-sm',
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                  )
                }
              >
                <link.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 lg:col-span-3">
          <Outlet />
        </section>
      </div>
    </div>
  );
};
