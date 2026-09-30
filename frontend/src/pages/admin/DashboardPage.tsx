import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from 'recharts';
import {
  ArrowRight,
  Boxes,
  CircleAlert,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';

import { formatPrice, formatRelative, humanize } from '../../lib/format';
import { Badge, EmptyState, ErrorState, OrderStatusBadge, PageHeader, StatCard } from '../../components/ui';
import { Skeleton } from '../../components/ui/Feedback';
import { useAdminActivity, useAdminDashboard } from '../../hooks/queries/useAdmin';

const STATUS_COLOURS = ['#6366f1', '#8b5cf6', '#22c55e', '#f97316', '#ef4444', '#94a3b8', '#64748b'];

export const DashboardPage = () => {
  const { data, isLoading, isError, refetch } = useAdminDashboard();
  const { data: activity } = useAdminActivity();

  if (isError) {
    return (
      <div className="py-10">
        <ErrorState message="The dashboard could not load." onRetry={() => refetch()} />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const cards = data.cards;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Live numbers from the store."
        action={
          <Link to="/admin/orders" className="text-sm font-medium text-brand-700 hover:underline">
            Open orders →
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatPrice(cards.revenue)}
          hint={`${formatPrice(cards.revenueThisMonth)} this month`}
          icon={<DollarSign className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Orders"
          value={cards.orders}
          hint={`${cards.pendingOrders} awaiting action`}
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <StatCard
          label="Customers"
          value={cards.customers}
          hint={`${formatPrice(cards.averageOrderValue)} average order`}
          icon={<Users className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Products"
          value={`${cards.activeProducts}/${cards.products}`}
          hint={`${cards.lowStockCount} low · ${cards.outOfStock} out of stock`}
          icon={<Package className="h-5 w-5" />}
          tone={cards.outOfStock > 0 ? 'danger' : 'brand'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="surface xl:col-span-2 p-5">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Monthly sales</h2>
              <p className="text-xs text-ink-500">Revenue and order volume</p>
            </div>
            {cards.revenueGrowthPercent !== 0 && (
              <Badge tone={cards.revenueGrowthPercent > 0 ? 'success' : 'danger'}>
                <TrendingUp className="h-3 w-3" />
                {cards.revenueGrowthPercent > 0 ? '+' : ''}
                {cards.revenueGrowthPercent}%
              </Badge>
            )}
          </header>

          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlySales} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={56} />
                <Tooltip
                  formatter={(value) => formatPrice(Number(value))}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#revenueFill)"
                  name="Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="text-sm font-semibold text-ink-900">Orders by status</h2>
          <p className="text-xs text-ink-500">Current pipeline</p>

          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.ordersByStatus}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {data.ordersByStatus.map((entry, index) => (
                    <Cell key={entry.status} fill={STATUS_COLOURS[index % STATUS_COLOURS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} orders`, humanize(String(name))]}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  formatter={(value: string) => <span className="text-xs text-ink-600">{humanize(value)}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="surface xl:col-span-2 p-5">
          <header className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Top products</h2>
            <Link to="/admin/products" className="text-xs font-medium text-brand-700 hover:underline">
              Manage products →
            </Link>
          </header>

          <div className="mt-4 h-64">
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
                  formatter={(value) => [`${value} units`, 'Units sold']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="units" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="surface p-5">
          <header className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <CircleAlert className="h-4 w-4 text-amber-500" />
              Low stock
            </h2>
          </header>

          {data.lowStock.length === 0 ? (
            <EmptyState title="Stock is healthy" description="Nothing is running low right now." />
          ) : (
            <ul className="mt-4 divide-y divide-ink-100">
              {data.lowStock.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link to={`/admin/products/${product.id}`} className="truncate text-sm font-medium text-ink-900 hover:text-brand-700">
                      {product.name}
                    </Link>
                    <p className="text-xs text-ink-400">{product.soldCount} sold</p>
                  </div>
                  <Badge tone={product.stock === 0 ? 'danger' : 'warning'}>
                    {product.stock} / {product.lowStock}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="surface xl:col-span-2 overflow-hidden p-0">
          <header className="border-b border-ink-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-ink-900">Recent orders</h2>
          </header>

          <table className="w-full text-left text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Order</th>
                <th className="px-5 py-2.5 font-semibold">Customer</th>
                <th className="px-5 py-2.5 font-semibold">Status</th>
                <th className="px-5 py-2.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {data.recentOrders.map((order) => (
                <tr key={order.id} className="transition hover:bg-ink-50">
                  <td className="px-5 py-3">
                    <Link to={`/admin/orders/${order.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                      #{order.id}
                    </Link>
                    <p className="text-xs text-ink-400">{formatRelative(order.createdAt)}</p>
                  </td>
                  <td className="px-5 py-3 text-ink-600">{order.customer.username}</td>
                  <td className="px-5 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-ink-900">{formatPrice(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="surface p-5">
          <header className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Boxes className="h-4 w-4 text-brand-600" />
              Activity
            </h2>
          </header>

          <ul className="mt-4 space-y-3">
            {(activity ?? []).slice(0, 8).map((entry) => (
              <li key={entry.id} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                <div>
                  <p className="text-sm font-medium text-ink-900">{entry.title}</p>
                  <p className="text-xs text-ink-500">{entry.message}</p>
                  <p className="text-[11px] text-ink-400">{formatRelative(entry.createdAt)}</p>
                </div>
              </li>
            ))}
            {(activity ?? []).length === 0 && (
              <li className="text-sm text-ink-500">No admin notifications yet.</li>
            )}
          </ul>

          <Link
            to="/admin/support"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
          >
            Open support queue <ArrowRight className="h-3 w-3" />
          </Link>
        </section>
      </div>
    </div>
  );
};
