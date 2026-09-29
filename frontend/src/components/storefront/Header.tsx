import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Search,
  ShoppingBag,
  User as UserIcon,
  X,
} from 'lucide-react';

import { cn } from '../../lib/cn';
import { STORE_LOGO } from '../../lib/store';
import { initialsOf } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { useCategories } from '../../hooks/queries/useCatalog';
import { useCart } from '../../hooks/queries/useCart';
import { useNotifications, useWishlist } from '../../hooks/queries/useAccount';
import { useLogout } from '../../hooks/queries/useAuth';
import { useClickOutside } from '../../hooks/useClickOutside';
import { IconButton } from '../ui/Button';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Shop' },
  { to: '/track', label: 'Track order' },
  { to: '/support', label: 'Support' },
];

export const Header = ({ onOpenCart }: { onOpenCart: () => void }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('search') ?? '');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);

  const user = useAuthStore((state) => state.user);
  const isAuthed = useAuthStore((state) => Boolean(state.token));
  const cart = useCart();
  const { ids: wishlistIds } = useWishlist();
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.unread ?? 0;
  const { data: categories } = useCategories();
  const logout = useLogout();

  const menuRef = useClickOutside<HTMLDivElement>(menuOpen, () => setMenuOpen(false));
  const shopRef = useClickOutside<HTMLDivElement>(shopOpen, () => setShopOpen(false));
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Keep the header search box in sync with the products page URL.
  useEffect(() => {
    setQuery(searchParams.get('search') ?? '');
  }, [searchParams]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    navigate(term ? `/products?search=${encodeURIComponent(term)}` : '/products');
    setMobileOpen(false);
  };

  const accountLinks = [
    { to: '/account', label: 'My profile', icon: UserIcon },
    { to: '/account/orders', label: 'My orders', icon: Package },
    { to: '/account/addresses', label: 'Addresses', icon: MapPin },
    { to: '/wishlist', label: 'Wishlist', icon: Heart },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-4">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-lg text-ink-700 transition hover:bg-ink-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-base font-bold text-white">
              {STORE_LOGO}
            </span>
            <span className="hidden text-base font-semibold tracking-tight text-ink-900 sm:block">
              Asnif <span className="text-brand-600">Store</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.filter((link) => link.to !== '/products').map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}

            <div className="relative" ref={shopRef}>
              <button
                type="button"
                onClick={() => setShopOpen((open) => !open)}
                aria-expanded={shopOpen}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900"
              >
                Shop
                <ChevronDown className={cn('h-4 w-4 transition-transform', shopOpen && 'rotate-180')} />
              </button>

              {shopOpen && (
                <div className="absolute left-0 top-full w-56 pt-2">
                  <div className="overflow-hidden rounded-xl border border-ink-200 bg-white p-1.5 shadow-lg animate-pop-in">
                    <Link
                      to="/products"
                      onClick={() => setShopOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
                    >
                      All products
                    </Link>
                    {(categories ?? []).map((category) => (
                      <Link
                        key={category.id}
                        to={`/products?category=${category.slug}`}
                        onClick={() => setShopOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          <form onSubmit={submitSearch} className="hidden flex-1 md:block">
            <div className="relative mx-auto max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                placeholder="Search products, brands, tags…"
                aria-label="Search products"
                className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-9 pr-3 text-sm text-ink-900 transition-colors placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1">
            <Link
              to="/wishlist"
              aria-label={`Wishlist (${wishlistIds.length})`}
              className="relative grid h-10 w-10 place-items-center rounded-lg text-ink-700 transition hover:bg-ink-100"
            >
              <Heart className="h-5 w-5" />
              {wishlistIds.length > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                  {wishlistIds.length}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`Open cart (${cart.count} items)`}
              className="relative grid h-10 w-10 place-items-center rounded-lg text-ink-700 transition hover:bg-ink-100"
            >
              <ShoppingBag className="h-5 w-5" />
              {cart.count > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                  {cart.count}
                </span>
              )}
            </button>

            {isAuthed ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-expanded={menuOpen}
                  aria-label="Account menu"
                  className="ml-1 flex items-center gap-2 rounded-full border border-ink-200 p-0.5 pr-2 transition hover:border-ink-300"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                    {initialsOf(user?.username ?? 'You')}
                  </span>
                  <ChevronDown className="h-4 w-4 text-ink-500" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full w-60 pt-2">
                    <div className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg animate-pop-in">
                      <div className="border-b border-ink-100 px-4 py-3">
                        <p className="truncate text-sm font-semibold text-ink-900">{user?.username}</p>
                        <p className="truncate text-xs text-ink-500">{user?.email}</p>
                      </div>

                      <div className="p-1.5">
                        {accountLinks.map((link) => (
                          <Link
                            key={link.to}
                            to={link.to}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-700 transition hover:bg-ink-50"
                          >
                            <link.icon className="h-4 w-4 text-ink-400" />
                            <span className="flex-1">{link.label}</span>
                            {link.to.endsWith('/notifications') && unreadCount > 0 && (
                              <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                {unreadCount}
                              </span>
                            )}
                          </Link>
                        ))}

                        {user?.role === 'ADMIN' && (
                          <Link
                            to="/admin"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-700 transition hover:bg-ink-50"
                          >
                            <LayoutDashboard className="h-4 w-4 text-ink-400" />
                            Admin console
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-ink-100 p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            logout.mutate();
                            navigate('/');
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="ml-1 hidden h-10 items-center gap-1.5 rounded-xl bg-ink-900 px-4 text-sm font-medium text-white transition hover:bg-ink-800 sm:flex"
              >
                <UserIcon className="h-4 w-4" />
                Sign in
              </Link>
            )}
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={submitSearch} className="pb-3 md:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              placeholder="Search products…"
              aria-label="Search products"
              className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-9 pr-3 text-sm focus:border-brand-500 focus:bg-white focus:outline-none"
            />
          </div>
        </form>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />

          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-xl animate-slide-right">
            <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
              <span className="font-semibold text-ink-900">Menu</span>
              <IconButton label="Close menu" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </IconButton>
            </div>

            <nav className="flex-1 overflow-y-auto p-3">
              {[...NAV_LINKS, { to: '/cart', label: 'Cart' }].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
                >
                  {link.label}
                </Link>
              ))}

              <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Categories</p>
              {(categories ?? []).map((category) => (
                <Link
                  key={category.id}
                  to={`/products?category=${category.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm text-ink-600 transition hover:bg-ink-50"
                >
                  {category.name}
                </Link>
              ))}

              <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Account</p>
              {isAuthed ? (
                [...accountLinks, { to: '/account/notifications', label: 'Notifications', icon: Package }].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm text-ink-600 transition hover:bg-ink-50"
                  >
                    {link.label}
                  </Link>
                ))
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
                >
                  Sign in / Register
                </Link>
              )}
            </nav>
          </aside>
        </div>
      )}

    </header>
  );
};
