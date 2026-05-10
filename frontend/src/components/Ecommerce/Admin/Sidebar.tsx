import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Shapes,
  ShoppingCart,
  Users,
  Bell,
  X,
} from "lucide-react";

const Sidebar = ({ open, setOpen }: any) => {
  const { pathname } = useLocation();

  const nav = [
    {
      name: "Dashboard",
      path: "/admin/ecommerce",
      icon: LayoutDashboard,
    },
    {
      name: "Products",
      path: "/admin/ecommerce/products",
      icon: Package,
    },
    {
      name: "Categories",
      path: "/admin/ecommerce/categories",
      icon: Shapes,
    },
    {
      name: "Orders",
      path: "/admin/ecommerce/orders",
      icon: ShoppingCart,
    },
    {
      name: "Customers",
      path: "/admin/ecommerce/customers",
      icon: Users,
    },
    {
      name: "Notifications",
      path: "/admin/ecommerce/notifications",
      icon: Bell,
    },
  ];

  return (
    <>
      <aside
        className={`fixed lg:static top-0 left-0 z-50 h-screen w-72 bg-white border-r border-gray-200 shadow-xl lg:shadow-none transition-transform duration-300 ${
          open
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* HEADER */}
        <div className="h-20 px-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              🛍️ Admin Panel
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Ecommerce Management
            </p>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* NAV */}
        <div className="p-4 space-y-2">
          {nav.map((item) => {
            const Icon = item.icon;

            const active = pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition ${
                  active
                    ? "bg-black text-white shadow-lg"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="rounded-2xl bg-black text-white p-4">
            <p className="text-sm font-semibold">
              Premium Admin
            </p>

            <p className="text-xs text-gray-300 mt-1">
              Manage products, orders &
              analytics easily.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;