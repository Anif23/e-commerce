import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, DollarSign, Download, Receipt, Users } from 'lucide-react';
import toast from 'react-hot-toast';

import { formatPrice } from '../../lib/format';
import { adminApi } from '../../lib/api/endpoints';
import { getErrorMessage } from '../../lib/api/client';
import { Badge, EmptyState, ErrorState, PageHeader, StatCard, Tabs } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { Skeleton } from '../../components/ui/Feedback';
import { useAdminReports } from '../../hooks/queries/useAdmin';

const COLOURS = ['#6366f1', '#8b5cf6', '#22c55e', '#f97316', '#06b6d4', '#ef4444'];

const RANGES = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: '12m', label: '12 months' },
];

const Delta = ({ value }: { value: number }) => (
  <span
    className={
      value >= 0
        ? 'inline-flex items-center text-xs font-medium text-emerald-600'
        : 'inline-flex items-center text-xs font-medium text-danger'
    }
  >
    {value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
    {Math.abs(value)}%
  </span>
);

export const AdminReportsPage = () => {
  const [range, setRange] = useState('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloading, setDownloading] = useState<'csv' | 'pdf' | null>(null);
  const { data, isLoading, isError, refetch } = useAdminReports(range);

  const customWindow = Boolean(from && to);

  const downloadReport = async (format: 'csv' | 'pdf') => {
    setDownloading(format);
    try {
      const response = await adminApi.exportReport(
        customWindow ? { format, from, to } : { format, range },
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales-report-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not download the report'));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Revenue, best sellers and coupon performance."
        action={<Tabs className="w-80" value={range} onChange={setRange} tabs={RANGES} />}
      />

      <section className="surface flex flex-wrap items-end gap-3 p-4">
        <div className="mr-auto">
          <h2 className="text-sm font-semibold text-ink-900">Download report</h2>
          <p className="text-xs text-ink-500">
            {customWindow ? `Custom period ${from} → ${to}` : `Using the selected range (${range}).`} Pick a custom
            period or download the current range as CSV or PDF.
          </p>
        </div>

        <Input
          type="date"
          aria-label="From date"
          className="w-44"
          value={from}
          max={to || undefined}
          onChange={(event) => setFrom(event.target.value)}
        />
        <Input
          type="date"
          aria-label="To date"
          className="w-44"
          value={to}
          min={from || undefined}
          onChange={(event) => setTo(event.target.value)}
        />
        {customWindow && (
          <Button
            variant="ghost"
            onClick={() => {
              setFrom('');
              setTo('');
            }}
          >
            Clear
          </Button>
        )}

        <Button
          variant="outline"
          leftIcon={<Download className="h-4 w-4" />}
          loading={downloading === 'csv'}
          disabled={downloading !== null}
          onClick={() => downloadReport('csv')}
        >
          CSV
        </Button>
        <Button
          leftIcon={<Download className="h-4 w-4" />}
          loading={downloading === 'pdf'}
          disabled={downloading !== null}
          onClick={() => downloadReport('pdf')}
        >
          PDF
        </Button>
      </section>

      {isError ? (
        <ErrorState message="We could not build that report." onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Revenue"
              value={formatPrice(data.summary.revenue)}
              hint={<Delta value={data.summary.revenueChangePercent} />}
              icon={<DollarSign className="h-5 w-5" />}
              tone="success"
            />
            <StatCard
              label="Orders"
              value={data.summary.orders}
              hint={<Delta value={data.summary.ordersChangePercent} />}
              icon={<Receipt className="h-5 w-5" />}
            />
            <StatCard
              label="Average order"
              value={formatPrice(data.summary.averageOrderValue)}
              icon={<Users className="h-5 w-5" />}
              tone="warning"
            />
            <StatCard
              label="New customers"
              value={data.summary.newCustomers}
              hint={`${formatPrice(data.summary.discountsGiven)} given in discounts`}
            />
          </div>

          <section className="surface p-5">
            <h2 className="text-sm font-semibold text-ink-900">Revenue over time</h2>

            <div className="mt-5 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={56} />
                  <Tooltip
                    formatter={(value) => formatPrice(Number(value))}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend
                    formatter={(value: string) => <span className="text-xs capitalize text-ink-600">{value}</span>}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} name="revenue" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="surface p-5">
              <h2 className="text-sm font-semibold text-ink-900">Best sellers</h2>

              {data.topProducts.length === 0 ? (
                <EmptyState title="No sales in this range" />
              ) : (
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topProducts} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={140}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value) => [`${value} units`, 'Units']}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      />
                      <Bar dataKey="units" radius={[0, 6, 6, 0]} barSize={18}>
                        {data.topProducts.map((entry, index) => (
                          <Cell key={entry.id} fill={COLOURS[index % COLOURS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="surface p-5">
              <h2 className="text-sm font-semibold text-ink-900">Revenue by category</h2>

              {data.categories.length === 0 ? (
                <EmptyState title="Nothing to chart" />
              ) : (
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.categories}
                        dataKey="revenue"
                        nameKey="category"
                        innerRadius={56}
                        outerRadius={92}
                        paddingAngle={2}
                      >
                        {data.categories.map((entry, index) => (
                          <Cell key={entry.category} fill={COLOURS[index % COLOURS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatPrice(Number(value))}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={32}
                        formatter={(value: string) => <span className="text-xs text-ink-600">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          <section className="surface p-5">
            <h2 className="text-sm font-semibold text-ink-900">Coupon usage</h2>

            {data.coupons.length === 0 ? (
              <EmptyState title="No coupons used" description="Nothing redeemed in this period." />
            ) : (
              <ul className="mt-4 divide-y divide-ink-100">
                {data.coupons.map((coupon) => (
                  <li key={coupon.code} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="font-mono text-sm font-semibold text-ink-900">{coupon.code}</p>
                      <p className="text-xs text-ink-500">
                        {coupon.type === 'PERCENTAGE' ? `${coupon.value}% off` : `${formatPrice(coupon.value)} off`}
                      </p>
                    </div>
                    <Badge tone="brand">{coupon.uses} uses</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
};
