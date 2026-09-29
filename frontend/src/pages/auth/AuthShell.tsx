import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Sparkles, Truck } from 'lucide-react';

import { Reveal } from '../../components/ui/Feedback';
import { STORE_LOGO, STORE_NAME } from '../../lib/store';

const POINTS = [
  { icon: Truck, title: 'Live order tracking', text: 'Every status change, timestamped.' },
  { icon: ShieldCheck, title: 'Secure checkout', text: 'PayPal, Stripe or cash on delivery.' },
  { icon: Sparkles, title: 'Wishlists that sync', text: 'Saved before sign-in come with you.' },
];

export const AuthShell = ({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) => (
  <div className="grid min-h-screen lg:grid-cols-2">
    <div className="relative hidden overflow-hidden bg-ink-900 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-brand-500/30 blur-3xl animate-float"
      />

      <Link to="/" className="relative flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-base font-bold">{STORE_LOGO}</span>
        <span className="text-base font-semibold">
          Asnif <span className="text-brand-400">Store</span>
        </span>
      </Link>

      <Reveal className="relative max-w-md">
        <h2 className="text-3xl font-semibold leading-tight">
          Your order, tracked
          <br />
          from cart to doorstep.
        </h2>
        <p className="mt-3 text-sm text-ink-300">
          Sign in to check out faster, follow shipments and keep your wishlist in sync across devices.
        </p>

        <ul className="mt-8 space-y-5">
          {POINTS.map((point) => (
            <li key={point.title} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
                <point.icon className="h-5 w-5 text-brand-300" />
              </span>
              <div>
                <p className="text-sm font-semibold">{point.title}</p>
                <p className="text-xs text-ink-400">{point.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Reveal>

      <p className="relative text-xs text-ink-500">
        © {new Date().getFullYear()} {STORE_NAME}
      </p>
    </div>

    <div className="flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-16">
      <div className="mx-auto w-full max-w-md">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-ink-500 transition hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
        <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>

        <div className="mt-8">{children}</div>

        <div className="mt-6 text-sm text-ink-500">{footer}</div>
      </div>
    </div>
  </div>
);
