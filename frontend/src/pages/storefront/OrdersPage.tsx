import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';

import { assetUrl } from '../../lib/assets';
import { formatDate, formatPrice } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, OrderStatusBadge, Pagination, Tabs } from '../../components/ui';
import { Skeleton } from '../../components/ui/Feedback';
import { useOrderStats, useOrders } from '../../hooks/queries/useOrders';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'PENDING_PAYMENT', label: 'Awaiting payment' },
  { id: 'PAID', label: 'Paid' },
  { id: 'PROCESSING', label: 'Processing' },
  { id: 'SHIPPED', label: 'Shipped' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CANCELLED', label: 'Cancelled' },
] as const;

export const OrdersPage = () => {
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useOrders({ status: status || undefined, page });
  const { data: stats } = useOrderStats();

  const orders = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">My orders</h1>
        <p className="mt-1 text-sm text-ink-500">
          {stats
            ? `${stats.total} order${stats.total === 1 ? '' : 's'} · ${formatPrice(stats.lifetimeSpend)} lifetime spend`
            : 'Loading your order history…'}
        </p>
      </header>

      <Tabs
        className="mb-6"
        value={status}
        onChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        tabs={FILTERS.map((filter) => ({
          id: filter.id as string,
          label: filter.label,
          ...(filter.id ? { count: stats?.byStatus[filter.id] ?? 0 } : {}),
        }))}
      />

      {isError ? (
        <ErrorState message="We could not load your orders." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-32 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title="No orders here yet"
          description="When you place an order it will appear here with live tracking."
          action={
            <Link to="/products">
              <Button>Start shopping</Button>
            </Link>
          }
        />
      ) : (
        <>
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  to={`/orders/${order.id}`}
                  className="surface hover-lift flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex -space-x-3">
                    {order.items.slice(0, 3).map((item) => (
                      <img
                        key={item.id}
                        src={assetUrl(item.image)}
                        alt={item.name}
                        loading="lazy"
                        className="h-14 w-14 rounded-xl border-2 border-white object-cover"
                      />
                    ))}
                    {order.items.length > 3 && (
                      <span className="grid h-14 w-14 place-items-center rounded-xl border-2 border-white bg-ink-100 text-xs font-semibold text-ink-600">
                        +{order.items.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink-900">Order #{order.id}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-xs text-ink-500">
                      Placed {formatDate(order.placedAt)} · {order.items.length} item
                      {order.items.length === 1 ? '' : 's'}
                      {order.tracking.number ? ` · ${order.tracking.number}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-semibold text-ink-900">{formatPrice(order.totals.total)}</span>
                    <ChevronRight className="h-4 w-4 text-ink-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {pagination && (
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
          )}
        </>
      )}
    </div>
  );
};
