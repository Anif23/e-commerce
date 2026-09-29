import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Tag, Trash2 } from 'lucide-react';

import { assetUrl } from '../../lib/assets';
import { formatPrice } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { Badge, EmptyState, QuantityStepper } from '../../components/ui';
import { Skeleton } from '../../components/ui/Feedback';
import { useCart, useCartMutations } from '../../hooks/queries/useCart';
import { useAuthStore } from '../../store/authStore';
import { FREE_SHIPPING_THRESHOLD } from '../../lib/store';

export const CartPage = () => {
  const navigate = useNavigate();
  const isAuthed = useAuthStore((state) => Boolean(state.token));
  const cart = useCart();
  const { updateItem, removeItem, clear, applyCoupon, removeCoupon } = useCartMutations();
  const [coupon, setCoupon] = useState('');

  if (cart.isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 space-y-4">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title="Your cart is empty"
          description="Add a few things and they will show up here."
          action={
            <Link to="/products">
              <Button>Browse products</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const totals = cart.totals;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Your cart</h1>
          <p className="mt-1 text-sm text-ink-500">
            {cart.count} item{cart.count === 1 ? '' : 's'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => clear.mutate()}>
          Clear cart
        </Button>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <ul className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-200 bg-white">
            {cart.items.map((item) => (
              <li key={item.key} className="flex gap-4 p-4 sm:p-5">
                <Link to={`/products/${item.product.slug}`} className="shrink-0">
                  <img
                    src={assetUrl(item.product.image)}
                    alt={item.product.name}
                    loading="lazy"
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        to={`/products/${item.product.slug}`}
                        className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-brand-700"
                      >
                        {item.product.name}
                      </Link>
                      {item.variant?.label && <p className="mt-0.5 text-xs text-ink-500">{item.variant.label}</p>}
                      <p className="mt-1 text-xs text-ink-400">
                        {formatPrice(item.unitPrice)} each
                        {item.availableStock <= 5 && (
                          <span className="ml-2 text-amber-600">only {item.availableStock} left</span>
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-label={`Remove ${item.product.name}`}
                      onClick={() =>
                        removeItem.mutate({ itemId: item.id, productId: item.productId, variantId: item.variantId })
                      }
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-400 transition hover:bg-red-50 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <QuantityStepper
                      value={item.quantity}
                      max={Math.max(1, item.availableStock)}
                      onChange={(quantity) =>
                        updateItem.mutate({
                          itemId: item.id,
                          productId: item.productId,
                          variantId: item.variantId,
                          quantity,
                        })
                      }
                    />
                    <span className="text-base font-semibold text-ink-900">{formatPrice(item.lineTotal)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="lg:col-span-1">
          <div className="surface sticky top-24 p-5">
            <h2 className="text-base font-semibold text-ink-900">Order summary</h2>

            {isAuthed && (
              <form
                className="mt-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (coupon.trim()) applyCoupon.mutate(coupon.trim(), { onSuccess: () => setCoupon('') });
                }}
              >
                {cart.couponCode ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                      <Tag className="h-4 w-4" />
                      {cart.couponCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCoupon.mutate()}
                      className="text-xs font-medium text-emerald-700 underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Coupon code"
                      aria-label="Coupon code"
                      value={coupon}
                      onChange={(event) => setCoupon(event.target.value)}
                    />
                    <Button type="submit" variant="outline" loading={applyCoupon.isPending}>
                      Apply
                    </Button>
                  </div>
                )}
                {cart.couponMessage && <p className="mt-1.5 text-xs text-danger">{cart.couponMessage}</p>}
              </form>
            )}

            <dl className="mt-5 space-y-2.5 border-t border-ink-100 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="font-medium text-ink-900">{formatPrice(cart.subtotal)}</dd>
              </div>

              {totals && totals.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Discount</dt>
                  <dd>-{formatPrice(totals.discount)}</dd>
                </div>
              )}

              {totals && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Shipping</dt>
                    <dd className="font-medium text-ink-900">
                      {totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Tax</dt>
                    <dd className="font-medium text-ink-900">{formatPrice(totals.tax)}</dd>
                  </div>
                </>
              )}

              <div className="flex justify-between border-t border-ink-100 pt-3 text-base">
                <dt className="font-semibold text-ink-900">Total</dt>
                <dd className="font-semibold text-ink-900">{formatPrice(totals?.total ?? cart.subtotal)}</dd>
              </div>
            </dl>

            {!isAuthed && (
              <p className="mt-3 rounded-xl bg-ink-100 px-3 py-2.5 text-xs text-ink-600">
                Sign in to apply coupons and see exact shipping and tax.
              </p>
            )}

            <Button
              fullWidth
              size="lg"
              className="mt-5"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => navigate(isAuthed ? '/checkout' : '/login?redirect=/checkout')}
            >
              {isAuthed ? 'Checkout' : 'Sign in to checkout'}
            </Button>

            <Link to="/products" className="mt-3 block text-center text-sm text-ink-500 hover:text-brand-700">
              Continue shopping
            </Link>

            {totals && totals.shipping > 0 && (
              <p className="mt-4 text-center text-xs text-ink-400">
                Spend {formatPrice(FREE_SHIPPING_THRESHOLD - cart.subtotal)} more to unlock{' '}
                <Badge tone="success">free shipping</Badge>
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
