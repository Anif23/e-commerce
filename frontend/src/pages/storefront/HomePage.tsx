import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Sparkles, Truck } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, Reveal, Skeleton } from '../../components/ui/Feedback';
import { ProductGrid } from '../../components/common/ProductGrid';
import { SectionHeader } from '../../components/common/SectionHeader';
import { SmartImage } from '../../components/common/SmartImage';
import { useCategories, useFeaturedProducts } from '../../hooks/queries/useCatalog';
import { Tabs } from '../../components/ui/Display';
import { useState } from 'react';
import { assetUrl } from '../../lib/assets';
import { formatCompact, formatPrice } from '../../lib/format';
import { FREE_SHIPPING_THRESHOLD } from '../../lib/store';

const HIGHLIGHTS = [
  { icon: Truck, title: `Free delivery over ${formatPrice(FREE_SHIPPING_THRESHOLD)}`, text: 'Automatic at checkout, no code needed.' },
  { icon: ShieldCheck, title: 'Secure payments', text: 'PayPal, Stripe, or pay on delivery.' },
  { icon: Sparkles, title: 'Real-time stock', text: 'Variant-level inventory you can trust.' },
];

export const HomePage = () => {
  const [rail, setRail] = useState<'featured' | 'newest' | 'bestSellers'>('featured');
  const { data, isLoading, isError, refetch } = useFeaturedProducts();
  const { data: categories } = useCategories();

  const rails = {
    featured: data?.featured ?? [],
    newest: data?.newest ?? [],
    bestSellers: data?.bestSellers ?? [],
  };

  const activeRail = rails[rail];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl animate-float"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl animate-float"
          style={{ animationDelay: '1.5s' }}
        />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-200">
              <Sparkles className="h-3.5 w-3.5" />
              New season arrivals
            </span>

            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Everything you need,
              <span className="block text-brand-300">delivered properly.</span>
            </h1>

            <p className="mt-5 max-w-lg text-base text-ink-300">
              Browse a catalogue with variant-level stock, honest reviews and live order tracking. Checkout takes less
              than a minute.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products">
                <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Shop the catalogue
                </Button>
              </Link>
              <Link to="/products?featured=true">
                <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                  See featured picks
                </Button>
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
              {HIGHLIGHTS.map((item) => (
                <div key={item.title}>
                  <item.icon className="h-5 w-5 text-brand-300" />
                  <dt className="mt-2 text-sm font-semibold">{item.title}</dt>
                  <dd className="text-xs text-ink-400">{item.text}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={120} className="hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              {(data?.featured ?? []).slice(0, 4).map((product, index) => (
                <div
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur"
                  style={{ transform: index % 2 ? 'translateY(1.5rem)' : undefined }}
                >
                  <SmartImage src={product.image} alt={product.name} className="aspect-square w-full" />
                </div>
              ))}
              {!data?.featured?.length &&
                [0, 1, 2, 3].map((key) => <Skeleton key={key} className="aspect-square w-full rounded-2xl" />)}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Browse"
          title="Shop by category"
          description="Five curated departments, each with real stock counts."
          action={
            <Link to="/products" className="text-sm font-medium text-brand-700 hover:underline">
              View all products →
            </Link>
          }
        />

        <div className="stagger mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(categories ?? []).map((category) => (
            <Link
              key={category.id}
              to={`/products?category=${category.slug}`}
              className="group surface hover-lift reveal is-revealed overflow-hidden"
            >
              <div className="relative aspect-4/3 bg-ink-100">
                <SmartImage
                  src={category.image}
                  alt={category.name}
                  className="transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold text-ink-900">{category.name}</span>
                {category.productCount !== undefined && (
                  <span className="text-xs text-ink-400">{formatCompact(category.productCount)}</span>
                )}
              </div>
            </Link>
          ))}

          {!categories?.length &&
            [0, 1, 2, 3, 4].map((key) => <Skeleton key={key} className="aspect-4/3 rounded-2xl" />)}
        </div>
      </section>

      {/* Product rail */}
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <SectionHeader title="Trending now" description="Refreshed from live sales and stock data." />
          <Tabs
            className="w-full max-w-md"
            value={rail}
            onChange={setRail}
            tabs={[
              { id: 'featured', label: 'Featured' },
              { id: 'newest', label: 'Newest' },
              { id: 'bestSellers', label: 'Best sellers' },
            ]}
          />
        </div>

        {isError ? (
          <ErrorState message="We could not load the catalogue." onRetry={() => refetch()} />
        ) : isLoading ? (
          <ProductGrid products={[]} loading />
        ) : activeRail.length === 0 ? (
          <EmptyState title="No products yet" description="Check back shortly — the catalogue is being stocked." />
        ) : (
          <ProductGrid products={activeRail} />
        )}
      </section>

      {/* Editorial band */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-brand-600 text-white">
          <div className="grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Track every order, end to end</h2>
              <p className="mt-3 text-sm text-brand-100">
                Each order keeps a full timeline — from placement through payment, packing, shipping and delivery. Open a
                support ticket from any order if something looks off.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/track">
                  <Button variant="secondary" className="bg-white text-brand-700 hover:bg-brand-50">
                    Track an order
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="ghost" className="text-white hover:bg-white/10">
                    Create an account
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(data?.bestSellers ?? []).slice(0, 3).map((product) => (
                <div key={product.id} className="overflow-hidden rounded-2xl bg-white/10">
                  <img
                    src={assetUrl(product.image)}
                    alt={product.name}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
