import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { assetUrl } from '../../lib/assets';
import { formatDate, formatDateTime, formatPrice } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { Badge, ErrorState, OrderStatusBadge, PageHeader } from '../../components/ui';
import { Skeleton } from '../../components/ui/Feedback';
import { OrderEventList } from '../../components/order/OrderTrackingTimeline';
import { useAdminOrder, useAdminOrderMutations } from '../../hooks/queries/useAdmin';
import type { OrderStatus, PaymentStatus } from '../../types/api';

/** Which status transitions the API accepts from the current one. */
const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'PROCESSING', 'CANCELLED', 'EXPIRED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export const AdminOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const { data: order, isLoading, isError, refetch } = useAdminOrder(orderId);
  const { updateStatus, updatePayment } = useAdminOrderMutations();

  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCarrier, setTrackingCarrier] = useState('');
  const [note, setNote] = useState('');

  // Switch orders: reset the controls to that order's tracking details while
  // rendering instead of in an effect (no extra commit, no stale fields).
  const [syncedOrderId, setSyncedOrderId] = useState<string | null>(null);
  if (order && String(order.id) !== syncedOrderId) {
    setSyncedOrderId(String(order.id));
    setStatus('');
    setTrackingNumber(order.tracking.number ?? '');
    setTrackingCarrier(order.tracking.carrier ?? '');
    setNote('');
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  if (isError || !order) {
    return (
      <div className="py-10">
        <ErrorState title="Order not found" message="It may have been removed." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" />
        All orders
      </Link>

      <PageHeader
        title={`Order #${order.id}`}
        description={`Placed ${formatDate(order.placedAt)} by ${order.user?.username ?? 'a removed account'}`}
        action={<OrderStatusBadge status={order.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface p-5">
            <h2 className="text-sm font-semibold text-ink-900">Items</h2>

            <ul className="mt-4 divide-y divide-ink-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-3">
                  <img src={assetUrl(item.image)} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{item.name}</p>
                    <p className="text-xs text-ink-500">
                      {item.variantLabel ? `${item.variantLabel} · ` : ''}
                      {formatPrice(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-ink-900">{formatPrice(item.total)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-1.5 border-t border-ink-100 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd>{formatPrice(order.totals.subtotal)}</dd>
              </div>
              {order.totals.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Discount {order.couponCode && `(${order.couponCode})`}</dt>
                  <dd>-{formatPrice(order.totals.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-500">Shipping</dt>
                <dd>{formatPrice(order.totals.shipping)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">{order.totals.taxName} ({order.totals.taxRatePercent}%)</dt>
                <dd>{formatPrice(order.totals.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatPrice(order.totals.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="surface p-5">
            <h2 className="text-sm font-semibold text-ink-900">Timeline</h2>
            <div className="mt-4">
              <OrderEventList events={order.timeline} />
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="surface space-y-4 p-5">
            <h2 className="text-sm font-semibold text-ink-900">Update status</h2>

            {NEXT_STATUS[order.status].length === 0 ? (
              <p className="text-sm text-ink-500">This order is finished — no further transitions.</p>
            ) : (
              <>
                <Select
                  label="New status"
                  placeholder="Choose a status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as OrderStatus)}
                  options={NEXT_STATUS[order.status].map((value) => ({
                    value,
                    label: value.toLowerCase().replace('_', ' '),
                  }))}
                />

                {status === 'SHIPPED' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Tracking number"
                      value={trackingNumber}
                      onChange={(event) => setTrackingNumber(event.target.value)}
                    />
                    <Input
                      label="Carrier"
                      value={trackingCarrier}
                      onChange={(event) => setTrackingCarrier(event.target.value)}
                    />
                  </div>
                )}

                <Textarea
                  label="Note"
                  placeholder="Shown on the customer timeline"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />

                <Button
                  fullWidth
                  loading={updateStatus.isPending}
                  disabled={!status}
                  onClick={() =>
                    updateStatus.mutate({
                      id: order.id,
                      payload: {
                        status: status as OrderStatus,
                        trackingNumber: trackingNumber || undefined,
                        trackingCarrier: trackingCarrier || undefined,
                        note: note || undefined,
                      },
                    })
                  }
                >
                  Update order
                </Button>
              </>
            )}

            <div className="border-t border-ink-100 pt-4">
              <p className="mb-2 text-sm font-medium text-ink-800">Payment</p>

              <div className="flex flex-wrap gap-2">
                {(['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED'] as PaymentStatus[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={order.payment?.status === value}
                    onClick={() => updatePayment.mutate({ id: order.id, status: value })}
                    className={
                      order.payment?.status === value
                        ? 'rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white'
                        : 'rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:border-ink-300'
                    }
                  >
                    {value === 'REFUNDED' ? 'record refund' : value.toLowerCase()}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-400">Process refunds with the gateway first, then record the refund here.</p>

              {order.payment && (
                <p className="mt-3 text-xs text-ink-500">
                  {order.payment.provider} · transaction {order.payment.reference ?? 'pending'} · gateway order{' '}
                  {order.payment.gatewayOrderId ?? 'pending'} ·{' '}
                  {order.payment.updatedAt ? formatDateTime(order.payment.updatedAt) : 'not updated'}
                </p>
              )}
            </div>
          </section>

          <section className="surface p-5">
            <h2 className="text-sm font-semibold text-ink-900">Customer</h2>
            <div className="mt-3 space-y-1 text-sm">
              <p className="font-medium text-ink-900">{order.user?.username}</p>
              <p className="text-ink-600">{order.user?.email}</p>
              {order.user && (
                <Link
                  to={`/admin/customers?search=${encodeURIComponent(order.user.email)}`}
                  className="inline-block pt-1 text-xs font-medium text-brand-700 hover:underline"
                >
                  View customer →
                </Link>
              )}
            </div>

            {order.address && (
              <div className="mt-4 border-t border-ink-100 pt-4 text-sm text-ink-600">
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
            )}

            {order.customerNote && (
              <div className="mt-4 rounded-xl bg-ink-50 p-3 text-sm text-ink-600">
                <p className="text-xs font-semibold text-ink-700">Customer note</p>
                {order.customerNote}
              </div>
            )}
          </section>

          {order.tracking.url && (
            <a
              href={order.tracking.url}
              target="_blank"
              rel="noreferrer"
              className="surface flex items-center justify-between p-5 text-sm font-medium text-brand-700 transition hover:border-brand-300"
            >
              Open carrier tracking
              <Badge tone="brand">{order.tracking.carrier ?? 'carrier'}</Badge>
            </a>
          )}
        </aside>
      </div>
    </div>
  );
};
