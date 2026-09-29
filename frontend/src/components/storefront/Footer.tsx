import { Link } from 'react-router-dom';
import { Cookie, CreditCard, Headphones, RotateCcw, Truck } from 'lucide-react';

import { useCategories } from '../../hooks/queries/useCatalog';
import { useCookieConsent } from '../../providers/cookieConsent';
import { POLICIES } from '../../content/policies';
import { formatPrice } from '../../lib/format';
import { FREE_SHIPPING_THRESHOLD, STORE_LOGO, STORE_NAME, STORE_TAGLINE } from '../../lib/store';

const PROMISES = [
  { icon: Truck, title: 'Free shipping', text: `On orders over ${formatPrice(FREE_SHIPPING_THRESHOLD)}` },
  { icon: RotateCcw, title: '30-day returns', text: 'No questions asked' },
  { icon: CreditCard, title: 'Secure payment', text: 'PayPal, Stripe or cash on delivery' },
  { icon: Headphones, title: 'Real support', text: 'Tickets answered by humans' },
];

export const Footer = () => {
  const { data: categories } = useCategories();
  const { reopen } = useCookieConsent();

  return (
    <footer className="mt-20 border-t border-ink-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 border-b border-ink-100 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map((promise) => (
            <div key={promise.title} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <promise.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-900">{promise.title}</p>
                <p className="text-xs text-ink-500">{promise.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-base font-bold text-white">
                {STORE_LOGO}
              </span>
              <span className="text-base font-semibold text-ink-900">
                Asnif <span className="text-brand-600">Store</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-ink-500">{STORE_TAGLINE}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink-900">Shop</h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link to="/products" className="text-sm text-ink-500 transition hover:text-brand-700">
                  All products
                </Link>
              </li>
              {(categories ?? []).slice(0, 5).map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/products?category=${category.slug}`}
                    className="text-sm text-ink-500 transition hover:text-brand-700"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink-900">Help</h3>
            <ul className="mt-4 space-y-2.5">
              {[
                { to: '/track', label: 'Track an order' },
                { to: '/support', label: 'Contact support' },
                { to: '/account/orders', label: 'Order history' },
                { to: '/account/addresses', label: 'Manage addresses' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-ink-500 transition hover:text-brand-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink-900">Account</h3>
            <ul className="mt-4 space-y-2.5">
              {[
                { to: '/login', label: 'Sign in' },
                { to: '/register', label: 'Create account' },
                { to: '/wishlist', label: 'Wishlist' },
                { to: '/cart', label: 'Cart' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-ink-500 transition hover:text-brand-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink-900">Policies</h3>
            <ul className="mt-4 space-y-2.5">
              {POLICIES.map((policy) => (
                <li key={policy.slug}>
                  <Link
                    to={`/policies/${policy.slug}`}
                    className="text-sm text-ink-500 transition hover:text-brand-700"
                  >
                    {policy.title}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={reopen}
                  className="text-sm text-ink-500 transition hover:text-brand-700"
                >
                  Cookie preferences
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 py-6 text-xs text-ink-400 sm:flex-row">
          <p>© {new Date().getFullYear()} {STORE_NAME}. Prices in INR, GST invoiced. Made in India 🇮🇳</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {POLICIES.map((policy) => (
              <Link key={policy.slug} to={`/policies/${policy.slug}`} className="transition hover:text-brand-700">
                {policy.title}
              </Link>
            ))}
            <button type="button" onClick={reopen} className="inline-flex items-center gap-1.5 transition hover:text-brand-700">
              <Cookie className="h-3.5 w-3.5" /> Cookie settings
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
