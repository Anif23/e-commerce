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
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="surface mb-8 flex flex-wrap items-center gap-4 p-5">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-lg font-semibold text-white">
          {initialsOf(user?.username ?? 'You')}
        </span>

        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-ink-900">{user?.username}</h1>
          <p className="truncate text-sm text-ink-500">{user?.email}</p>
        </div>

        <div className="ml-auto flex gap-6">
          <div className="text-right">
            <p className="text-lg font-semibold text-ink-900">{stats?.total ?? 0}</p>
            <p className="text-xs text-ink-500">Orders</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-ink-900">{notifications?.unread ?? 0}</p>
            <p className="text-xs text-ink-500">Unread</p>
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-4">
        <aside>
          <nav className="surface sticky top-24 flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                  )
                }
              >
                <link.icon className="h-4 w-4" />
                {link.label}
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
