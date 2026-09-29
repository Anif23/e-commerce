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
import { ArrowDownRight, ArrowUpRight, DollarSign, Receipt, Users } from 'lucide-react';

import { formatPrice } from '../../lib/format';
import { Badge, EmptyState, ErrorState, PageHeader, StatCard, Tabs } from '../../components/ui';
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
  const { data, isLoading, isError, refetch } = useAdminReports(range);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Revenue, best sellers and coupon performance."
        action={<Tabs className="w-80" value={range} onChange={setRange} tabs={RANGES} />}
      />

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
