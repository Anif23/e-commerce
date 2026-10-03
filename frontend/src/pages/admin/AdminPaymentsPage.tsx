import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard } from 'lucide-react';

import { formatDateTime, formatPrice } from '../../lib/format';
import { useDebounce } from '../../hooks/useDebounce';
import { Input, Select } from '../../components/ui/Field';
import { Badge, ErrorState, PageHeader, Pagination, StatCard } from '../../components/ui';
import { DataTable, type Column } from '../../components/ui/Table';
import { useAdminPayments, useAdminPaymentStats } from '../../hooks/queries/useAdmin';
import type { AdminPayment, PaymentProvider, PaymentStatus } from '../../types/api';

const STATUS_TONE: Record<PaymentStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
  REFUNDED: 'neutral',
};

const STATUSES: PaymentStatus[] = ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'];
const PROVIDERS: PaymentProvider[] = ['COD', 'RAZORPAY', 'STRIPE', 'PAYPAL', 'MOCK'];
const RANGES = [
  { value: '', label: 'All time' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export const AdminPaymentsPage = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState('');
  const [range, setRange] = useState('30d');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 300);
  const params = {
    q: debouncedSearch || undefined,
    status: status || undefined,
    provider: provider || undefined,
    range: range || undefined,
    page,
    limit: 20,
  };

  const { data, isLoading, isError, refetch } = useAdminPayments(params);
  const { data: stats } = useAdminPaymentStats({ range: range || undefined });

  const payments = data?.data ?? [];
  const pagination = data?.pagination;

  const columns: Column<AdminPayment>[] = [
    {
      key: 'order',
      header: 'Payment',
      render: (payment) => (
        <div>
          <Link to={`/admin/orders/${payment.orderId}`} className="font-medium text-ink-900 hover:text-brand-700">
            Order #{payment.orderId}
          </Link>
          <p className="text-xs text-ink-400">{payment.reference ?? payment.gatewayOrderId ?? 'no gateway ref'}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (payment) => (
        <div>
          <p className="text-sm font-medium text-ink-900">{payment.order?.customer?.username ?? '—'}</p>
          <p className="text-xs text-ink-400">{payment.payerEmail ?? payment.order?.customer?.email ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'provider',
      header: 'Method',
      render: (payment) => (
        <div className="space-y-1">
          <Badge tone="neutral">{payment.provider}</Badge>
          {payment.method && <p className="text-xs text-ink-400">{payment.method}</p>}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (payment) => <span className="font-medium text-ink-900">{formatPrice(payment.amount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (payment) => (
        <div className="space-y-1">
          <Badge tone={STATUS_TONE[payment.status]}>{payment.status}</Badge>
          {payment.failureCode && <p className="text-xs text-danger">{payment.failureCode}</p>}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Created',
      render: (payment) => <span className="text-sm text-ink-600">{formatDateTime(payment.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description={`${pagination?.total ?? 0} payments match the current filters — see how every order was paid.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Captured"
          value={formatPrice(stats?.totals.captured ?? 0)}
          hint={`${stats?.byStatus.SUCCESS ?? 0} successful`}
          icon={<CreditCard className="h-5 w-5" />}
          tone="success"
        />
        <StatCard label="Pending" value={formatPrice(stats?.totals.pending ?? 0)} hint={`${stats?.byStatus.PENDING ?? 0} awaiting`} tone="warning" />
        <StatCard label="Failed" value={stats?.byStatus.FAILED ?? 0} hint="needs attention" tone="danger" />
        <StatCard label="Refunded" value={formatPrice(stats?.totals.refunded ?? 0)} hint={`${stats?.byStatus.REFUNDED ?? 0} refunds`} />
      </div>

      <div className="surface flex flex-wrap items-end gap-3 p-4">
        <Input
          className="min-w-56 flex-1"
          placeholder="Search by reference, gateway id, email or order #…"
          aria-label="Search payments"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <Select
          className="w-44"
          placeholder="Any status"
          aria-label="Filter by status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          options={STATUSES.map((value) => ({ value, label: value.toLowerCase() }))}
        />

        <Select
          className="w-44"
          placeholder="Any provider"
          aria-label="Filter by provider"
          value={provider}
          onChange={(event) => {
            setProvider(event.target.value);
            setPage(1);
          }}
          options={PROVIDERS.map((value) => ({ value, label: value }))}
        />

        <Select
          className="w-48"
          aria-label="Filter by period"
          value={range}
          onChange={(event) => {
            setRange(event.target.value);
            setPage(1);
          }}
          options={RANGES}
        />
      </div>

      {isError ? (
        <ErrorState message="We could not load the payments." onRetry={() => refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={payments}
            loading={isLoading}
            rowKey={(payment) => payment.id}
            empty={<p className="py-6 text-center text-sm text-ink-500">No payments match those filters.</p>}
          />

          {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />}
        </>
      )}
    </div>
  );
};
