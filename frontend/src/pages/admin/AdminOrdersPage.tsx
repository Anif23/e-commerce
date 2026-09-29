import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';

import { formatDateTime, formatPrice } from '../../lib/format';
import { useDebounce } from '../../hooks/useDebounce';
import { Input, Select } from '../../components/ui/Field';
import { Badge, ErrorState, OrderStatusBadge, PageHeader, Pagination, StatCard } from '../../components/ui';
import { DataTable, type Column } from '../../components/ui/Table';
import { useAdminOrders, useOrderCounters } from '../../hooks/queries/useAdmin';
import type { Order, OrderStatus, PaymentStatus } from '../../types/api';

const PAYMENT_TONE: Record<PaymentStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
  REFUNDED: 'neutral',
};

const STATUSES: OrderStatus[] = [
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'EXPIRED',
];

export const AdminOrdersPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading, isError, refetch } = useAdminOrders({
    search: debouncedSearch || undefined,
    status: status || undefined,
    paymentStatus: paymentStatus || undefined,
    page,
    limit: 20,
  });
  const { data: counters } = useOrderCounters();

  const orders = data?.data ?? [];
  const pagination = data?.pagination;

  const columns: Column<Order>[] = [
    {
      key: 'id',
      header: 'Order',
      render: (order) => (
        <div>
          <Link to={`/admin/orders/${order.id}`} className="font-medium text-ink-900 hover:text-brand-700">
            #{order.id}
          </Link>
          <p className="text-xs text-ink-400">{formatDateTime(order.placedAt)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (order) => (
        <div>
          <p className="text-sm font-medium text-ink-900">{order.user?.username ?? '—'}</p>
          <p className="text-xs text-ink-400">{order.user?.email}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (order) => (
        <span className="text-sm text-ink-600">
          {order.items.reduce((sum, item) => sum + item.quantity, 0)} units
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (order) => <span className="font-medium text-ink-900">{formatPrice(order.totals.total)}</span>,
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (order) => (
        <div className="space-y-1">
          <Badge tone={order.payment ? PAYMENT_TONE[order.payment.status] : 'neutral'}>
            {order.payment?.provider ?? '—'} · {order.payment?.status ?? 'NONE'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => <OrderStatusBadge status={order.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description={`${pagination?.total ?? 0} orders match the current filters`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today"
          value={counters?.today?.orders ?? 0}
          hint={formatPrice(counters?.today?.revenue ?? 0)}
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <StatCard label="Awaiting payment" value={counters?.counters?.PENDING_PAYMENT ?? 0} tone="warning" />
        <StatCard label="To ship" value={counters?.counters?.PAID ?? 0} tone="brand" />
        <StatCard label="Delivered" value={counters?.counters?.DELIVERED ?? 0} tone="success" />
      </div>

      <div className="surface flex flex-wrap items-end gap-3 p-4">
        <Input
          className="min-w-56 flex-1"
          placeholder="Search by order number, name or email…"
          aria-label="Search orders"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <Select
          className="w-48"
          placeholder="Any status"
          aria-label="Filter by status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          options={STATUSES.map((value) => ({ value, label: value.toLowerCase().replace('_', ' ') }))}
        />

        <Select
          className="w-44"
          placeholder="Any payment"
          aria-label="Filter by payment status"
          value={paymentStatus}
          onChange={(event) => {
            setPaymentStatus(event.target.value);
            setPage(1);
          }}
          options={(['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'] as PaymentStatus[]).map((value) => ({
            value,
            label: value.toLowerCase(),
          }))}
        />
      </div>

      {isError ? (
        <ErrorState message="We could not load the orders." onRetry={() => refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={orders}
            loading={isLoading}
            rowKey={(order) => order.id}
            onRowClick={(order) => navigate(`/admin/orders/${order.id}`)}
            empty={<p className="py-6 text-center text-sm text-ink-500">No orders match those filters.</p>}
          />

          {pagination && (
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
          )}
        </>
      )}
    </div>
  );
};
