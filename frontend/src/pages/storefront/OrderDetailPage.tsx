import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, CreditCard, LifeBuoy, MapPin, Package } from 'lucide-react';

import { assetUrl } from '../../lib/assets';
import { formatDate, formatDateTime, formatPrice, humanize } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog, ErrorState, OrderStatusBadge } from '../../components/ui';
import { Skeleton } from '../../components/ui/Feedback';
import { Textarea } from '../../components/ui/Field';
import { OrderEventList, OrderTrackingTimeline } from '../../components/order/OrderTrackingTimeline';
import { useCancelOrder, useOrder, useOrderTracking } from '../../hooks/queries/useOrders';

export const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const justPlaced = searchParams.get('placed') === '1';
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');

  const orderId = Number(id);
  const { data: order, isLoading, isError, refetch } = useOrder(orderId);
  const { data: tracking } = useOrderTracking(orderId);
  const cancel = useCancelOrder();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-6 h-32 w-full" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          title="Order not found"
          message="This order may not exist or it does not belong to your account."
          onRetry={() => refetch()}
        />
        <div className="mt-6 text-center">
          <Link to="/account/orders" className="text-sm font-medium text-brand-700 hover:underline">
            Back to my orders
          </Link>
        </div>
      </div>
    );
  }

  const cancellable = !['CANCELLED', 'DELIVERED', 'EXPIRED'].includes(order.status);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {justPlaced && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 animate-pop-in">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">Thanks — your order is confirmed</p>
            <p className="text-xs text-emerald-700">
              Order #{order.id} · we emailed a receipt and will notify you on every status change.
            </p>
          </div>
        </div>
      )}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Order #{order.id}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-500">
            Placed {formatDate(order.placedAt)}
            <OrderStatusBadge status={order.status} />
          </p>
        </div>

        <div className="flex gap-3">
          {cancellable && (
            <Button variant="outline" onClick={() => setConfirmOpen(true)}>
              Cancel order
            </Button>
          )}
          <Link to={`/support?order=${order.id}`}>
            <Button variant="ghost" leftIcon={<LifeBuoy className="h-4 w-4" />}>
              Get help
            </Button>
          </Link>
        </div>
      </header>

      <div className="mt-8 space-y-6">
        {tracking && <OrderTrackingTimeline tracking={tracking} />}

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="surface p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Package className="h-4 w-4 text-brand-600" />
                Items
              </h2>

              <ul className="mt-4 divide-y divide-ink-100">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-4 py-3">
                    <img
                      src={assetUrl(item.image)}
                      alt={item.name}
                      loading="lazy"
                      className="h-16 w-16 rounded-xl object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      {item.slug ? (
                        <Link to={`/products/${item.slug}`} className="text-sm font-medium text-ink-900 hover:text-brand-700">
                          {item.name}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-ink-900">{item.name}</p>
                      )}
                      {item.variantLabel && <p className="text-xs text-ink-500">{item.variantLabel}</p>}
                      <p className="text-xs text-ink-400">
                        {formatPrice(item.price)} × {item.quantity}
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-ink-900">{formatPrice(item.total)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {tracking && tracking.timeline.length > 0 && (
              <div className="surface mt-6 p-5">
                <h2 className="text-sm font-semibold text-ink-900">History</h2>
                <div className="mt-4">
                  <OrderEventList events={tracking.timeline} />
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="surface p-5">
              <h2 className="text-sm font-semibold text-ink-900">Payment</h2>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-500">Subtotal</dt>
                  <dd className="font-medium text-ink-900">{formatPrice(order.totals.subtotal)}</dd>
                </div>
                {order.totals.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <dt>Discount {order.couponCode ? `(${order.couponCode})` : ''}</dt>
                    <dd>-{formatPrice(order.totals.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-ink-500">Shipping</dt>
                  <dd className="font-medium text-ink-900">
                    {order.totals.shipping === 0 ? 'Free' : formatPrice(order.totals.shipping)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-500">Tax</dt>
                  <dd className="font-medium text-ink-900">{formatPrice(order.totals.tax)}</dd>
                </div>
                <div className="flex justify-between border-t border-ink-100 pt-2 text-base">
                  <dt className="font-semibold text-ink-900">Total</dt>
                  <dd className="font-semibold text-ink-900">{formatPrice(order.totals.total)}</dd>
                </div>
              </dl>

              {order.payment && (
                <div className="mt-4 rounded-xl bg-ink-50 p-3 text-xs text-ink-600">
                  <p className="flex items-center gap-2 font-medium text-ink-800">
                    <CreditCard className="h-3.5 w-3.5" />
                    {humanize(order.payment.provider)} · {humanize(order.payment.status)}
                  </p>
                  {order.payment.reference && <p className="mt-1">Reference: {order.payment.reference}</p>}
                  {order.payment.updatedAt && <p className="mt-1">Updated {formatDateTime(order.payment.updatedAt)}</p>}
                </div>
              )}
            </div>

            {order.address && (
              <div className="surface p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <MapPin className="h-4 w-4 text-brand-600" />
                  Delivery address
                </h2>
                <div className="mt-3 text-sm text-ink-600">
                  <p className="font-medium text-ink-900">{order.address.fullName}</p>
                  <p>
                    {order.address.address1}
                    {order.address.address2 ? `, ${order.address.address2}` : ''}
                  </p>
                  <p>
                    {order.address.city}, {order.address.state} {order.address.zipCode}
                  </p>
                  <p>{order.address.country}</p>
                  <p className="mt-1 text-xs text-ink-500">{order.address.phone}</p>
                </div>
              </div>
            )}

            {order.customerNote && (
              <div className="surface p-5">
                <h2 className="text-sm font-semibold text-ink-900">Delivery note</h2>
                <p className="mt-2 text-sm text-ink-600">{order.customerNote}</p>
              </div>
            )}

            {order.status === 'PENDING_PAYMENT' && order.expiresAt && (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
                This order is held until {formatDateTime(order.expiresAt)}. After that it expires and the stock is
                released.
              </p>
            )}
          </aside>
        </section>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Cancel this order?"
        message={
          cancellable
            ? 'Any reserved stock will be released back to the catalogue. This cannot be undone.'
            : 'This order can no longer be cancelled.'
        }
        confirmLabel="Cancel order"
        loading={cancel.isPending}
        onConfirm={() => {
          cancel.mutate(
            { id: order.id, reason: reason || 'Cancelled by customer' },
            { onSuccess: () => setConfirmOpen(false) },
          );
        }}
      >
        <Textarea
          label="Reason (optional)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Let us know why…"
        />
      </ConfirmDialog>
    </div>
  );
};
