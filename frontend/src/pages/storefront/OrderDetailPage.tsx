import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, CreditCard, LifeBuoy, MapPin, Package } from 'lucide-react';

import { assetUrl } from '../../lib/assets';
import { formatDate, formatDateTime, formatPrice, humanize } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog, ErrorState, OrderStatusBadge } from '../../components/ui';
import { Skeleton } from '../../components/ui/Feedback';
import { Textarea } from '../../components/ui/Field';
import { OrderEventList, OrderTrackingTimeline } from '../../components/order/OrderTrackingTimeline';
import { useCancelOrder, useConfirmPayment, useOrder, useOrderTracking, useStartPayment } from '../../hooks/queries/useOrders';
import { PaymentPanel, type PaymentSession } from '../../components/checkout/PaymentPanel';

export const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const justPlaced = searchParams.get('placed') === '1';
  const paymentProcessing = searchParams.get('payment') === 'processing';
  const paymentSetupFailed = searchParams.get('payment') === 'retry';
  const paymentLateFromUrl = searchParams.get('payment') === 'late';
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [gatewayProcessing, setGatewayProcessing] = useState(false);
  const [latePaymentReceived, setLatePaymentReceived] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const updateTime = () => setNow(Date.now());
    updateTime();
    const timer = window.setInterval(updateTime, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const orderId = Number(id);
  const { data: order, isLoading, isError, refetch } = useOrder(orderId);
  const { data: tracking } = useOrderTracking(orderId);
  const cancel = useCancelOrder();
  const startPayment = useStartPayment();
  const confirmPayment = useConfirmPayment();

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
  const waitingForGateway =
    (paymentProcessing || gatewayProcessing) && order.payment?.status === 'PENDING';
  const orderWindowOpen = !order.expiresAt || new Date(order.expiresAt).getTime() > now;
  const pendingOnlinePayment =
    order.status === 'PENDING_PAYMENT' &&
    ['RAZORPAY', 'STRIPE'].includes(order.payment?.provider ?? '') &&
    orderWindowOpen &&
    !waitingForGateway;
  const paymentLate = paymentLateFromUrl || latePaymentReceived;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {(justPlaced || paymentProcessing || paymentSetupFailed || paymentLate || gatewayProcessing) && (
        <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 animate-pop-in ${paymentProcessing || paymentSetupFailed || paymentLate || gatewayProcessing ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
          {paymentProcessing || paymentSetupFailed || paymentLate || gatewayProcessing ? (
            <Clock3 className="mt-0.5 h-5 w-5 text-amber-600" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
          )}
          <div>
            <p className={`text-sm font-semibold ${paymentProcessing || paymentSetupFailed || paymentLate || gatewayProcessing ? 'text-amber-900' : 'text-emerald-900'}`}>
              {paymentLate
                ? 'Payment captured; order needs review'
                : paymentSetupFailed
                  ? 'Payment setup needs another try'
                  : paymentProcessing || gatewayProcessing
                    ? 'Payment is still processing'
                    : 'Thanks — your order is confirmed'}
            </p>
            <p className={`text-xs ${paymentProcessing || paymentSetupFailed || paymentLate || gatewayProcessing ? 'text-amber-700' : 'text-emerald-700'}`}>
              {paymentLate
                ? `Order #${order.id} could not be completed after payment. Our team has been notified to review it and any refund.`
                : paymentSetupFailed
                  ? `Order #${order.id} is saved. Retry payment using the secure payment option below.`
                  : paymentProcessing || gatewayProcessing
                    ? `Order #${order.id} is awaiting gateway confirmation. This page will show the latest status.`
                    : `Order #${order.id} · follow its fulfilment timeline below for updates.`}
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
                  <dt className="text-ink-500">{order.totals.taxName} ({order.totals.taxRatePercent}%)</dt>
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
                  {order.payment.method && <p className="mt-1">Method: {humanize(order.payment.method)}</p>}
                  {order.payment.reference && <p className="mt-1">Transaction reference: {order.payment.reference}</p>}
                  {order.payment.gatewayOrderId && <p className="mt-1">Gateway order: {order.payment.gatewayOrderId}</p>}
                  {order.payment.payerEmail && <p className="mt-1">Receipt email: {order.payment.payerEmail}</p>}
                  {order.payment.payerContact && <p className="mt-1">Payer contact: {order.payment.payerContact}</p>}
                  {order.payment.capturedAt && <p className="mt-1">Captured {formatDateTime(order.payment.capturedAt)}</p>}
                  {order.payment.updatedAt && <p className="mt-1">Updated {formatDateTime(order.payment.updatedAt)}</p>}
                </div>
              )}
              {pendingOnlinePayment && (
                <div className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">Payment required</p>
                    <p className="mt-1 text-xs text-ink-600">Complete secure payment to confirm this order.</p>
                  </div>
                  {paymentSession ? (
                    <PaymentPanel
                      provider={order.payment!.provider}
                      payment={paymentSession}
                      onConfirm={async (payload) => {
                        const result = await confirmPayment.mutateAsync({ orderId: order.id, payload });
                        if (result.data.data.paymentLate) {
                          setLatePaymentReceived(true);
                          setGatewayProcessing(false);
                          setPaymentSession(null);
                          await refetch();
                          return;
                        }
                        if (result.data.data.paymentPending) {
                          setGatewayProcessing(true);
                          setPaymentSession(null);
                          return;
                        }
                        setGatewayProcessing(false);
                        setPaymentSession(null);
                        await refetch();
                      }}
                      onCancel={() => setPaymentSession(null)}
                    />
                  ) : (
                    <Button
                      loading={startPayment.isPending}
                      onClick={() => {
                        void startPayment.mutateAsync(order.id)
                          .then(({ data }) => setPaymentSession(data.data as PaymentSession))
                          .catch(() => {});
                      }}
                    >
                      Continue to payment
                    </Button>
                  )}
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
                {orderWindowOpen
                  ? `This order is held until ${formatDateTime(order.expiresAt)}. After that it expires.`
                  : `The payment window ended at ${formatDateTime(order.expiresAt)}. This order is closing; place a new order to try again.`}
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
