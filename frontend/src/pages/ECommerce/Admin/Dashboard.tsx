import {
  Package,
  Layers3,
  Users,
  ShoppingBag,
  AlertTriangle,
  IndianRupee,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useAdminDashboard } from "../../../hooks/admin/useAdminDashboard";

const Dashboard = () => {

  const { data, isLoading } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="h-[70vh] flex items-center justify-center text-gray-400">
        Loading dashboard...
      </div>
    );
  }

  const cards = [
    {
      title: "Products",
      value: data.totalProducts,
      icon: Package,
    },
    {
      title: "Categories",
      value: data.totalCategories,
      icon: Layers3,
    },
    {
      title: "Users",
      value: data.totalUsers,
      icon: Users,
    },
    {
      title: "Orders",
      value: data.totalOrders,
      icon: ShoppingBag,
    },
    {
      title: "Revenue",
      value: `${data.totalRevenue}`,
      icon: IndianRupee,
    },
    {
      title: "Low Stock",
      value: data.lowStockProducts,
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <p className="text-sm text-gray-500 uppercase tracking-[0.3em]">
          Overview
        </p>

        <h1 className="text-3xl md:text-4xl font-bold mt-2">
          Admin Dashboard
        </h1>
      </div>

      {/* STATS */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {cards.map((item, i) => {
          const Icon = item.icon;

          return (
            <div
              key={i}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-sm">
                  {item.title}
                </p>

                <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center">
                  <Icon size={18} />
                </div>
              </div>

              <h2 className="text-3xl font-bold mt-4">
                {item.value}
              </h2>
            </div>
          );
        })}
      </div>

      {/* CHART */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="mb-6">
          <h2 className="text-xl font-bold">
            Revenue Trend
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Last 6 months sales
          </p>
        </div>

        <div className="h-80">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <AreaChart
              data={data.monthlySales}
            >
              <defs>
                <linearGradient
                  id="sales"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#111"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor="#111"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis dataKey="month" />

              <Tooltip />

              <Area
                type="monotone"
                dataKey="total"
                stroke="#111"
                fill="url(#sales)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* EXTRA */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white rounded-3xl p-6 shadow-sm border">
          <h3 className="font-semibold text-lg">
            Pending Orders
          </h3>

          <p className="text-4xl font-bold mt-4">
            {data.pendingOrders}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border">
          <h3 className="font-semibold text-lg">
            Delivered Orders
          </h3>

          <p className="text-4xl font-bold mt-4">
            {data.deliveredOrders}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;