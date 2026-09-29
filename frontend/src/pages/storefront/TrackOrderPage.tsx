import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { EmptyState, ErrorState } from '../../components/ui';
import { Skeleton } from '../../components/ui/Feedback';
import { OrderEventList, OrderTrackingTimeline } from '../../components/order/OrderTrackingTimeline';
import { useOrderTracking, useOrders } from '../../hooks/queries/useOrders';
import { formatDate, formatPrice } from '../../lib/format';

export const TrackOrderPage = () => {
  const [value, setValue] = useState('');
  const [orderId, setOrderId] = useState<number | null>(null);

  const { data: tracking, isLoading, isError } = useOrderTracking(orderId ?? undefined);
  const { data: recent } = useOrders({ page: 1 });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Track your order</h1>
        <p className="mt-1 text-sm text-ink-500">Enter the order number from your confirmation email.</p>
      </header>

      <form
        className="mx-auto mt-6 flex max-w-md gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = Number(value.trim());
          if (Number.isInteger(parsed) && parsed > 0) setOrderId(parsed);
        }}
      >
        <Input
          type="number"
          min={1}
          placeholder="e.g. 1042"
          aria-label="Order number"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button type="submit" leftIcon={<Search className="h-4 w-4" />}>
          Track
        </Button>
      </form>

      <div className="mt-8">
        {orderId === null ? (
          <div className="surface p-5">
            <h2 className="text-sm font-semibold text-ink-900">Or pick one of your recent orders</h2>
            <ul className="mt-3 divide-y divide-ink-100">
              {(recent?.data ?? []).slice(0, 5).map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setValue(String(order.id));
                      setOrderId(order.id);
                    }}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm transition hover:text-brand-700"
                  >
                    <span>
                      <span className="font-medium text-ink-900">Order #{order.id}</span>
                      <span className="ml-2 text-xs text-ink-500">{formatDate(order.placedAt)}</span>
                    </span>
                    <span className="font-medium text-ink-900">{formatPrice(order.totals.total)}</span>
                  </button>
                </li>
              ))}
              {(recent?.data ?? []).length === 0 && (
                <li className="py-3 text-sm text-ink-500">
                  No orders yet.{' '}
                  <Link to="/products" className="font-medium text-brand-700 hover:underline">
                    Browse the catalogue
                  </Link>
                </li>
              )}
            </ul>
          </div>
        ) : isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : isError ? (
          <ErrorState
            title="We could not find that order"
            message="Check the number and try again — orders are only visible to the account that placed them."
          />
        ) : tracking ? (
          <div className="space-y-6">
            <OrderTrackingTimeline tracking={tracking} />

            <div className="surface p-5">
              <h2 className="text-sm font-semibold text-ink-900">Updates</h2>
              <div className="mt-4">
                {tracking.timeline.length ? (
                  <OrderEventList events={tracking.timeline} />
                ) : (
                  <EmptyState title="No updates yet" description="We will post the first update once it is packed." />
                )}
              </div>
            </div>

            <div className="text-center">
              <Link to={`/orders/${tracking.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                View the full order →
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
