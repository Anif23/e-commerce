import {
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  useState,
} from "react";

import Sidebar from "./Sidebar";

import {
  Menu,
  Bell,
  Search,
  User,
} from "lucide-react";

import NotificationModal from "../NotificationModal";

import {
  useNotifications,
  useRealtimeNotifications,
} from "../../../hooks/admin/useAdminNotifications";

const AdminLayout = () => {

  const navigate =
    useNavigate();

  const [open, setOpen] =
    useState(false);

  const [
    showNotifications,
    setShowNotifications,
  ] = useState(false);

  const [search, setSearch] =
    useState("");

  useRealtimeNotifications();

  const {
    data: notifications = [],
  } = useNotifications();

  const unreadCount =
    notifications.filter(
      (n: any) => !n.isRead
    ).length;

  const handleSearch = (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    const value =
      search.trim();

    if (!value) {
      navigate(
        window.location.pathname
      );

      return;
    }

    navigate(
      !isNaN(Number(value))
        ? `/admin/ecommerce/orders?search=${value}`
        : `/admin/ecommerce/products?search=${value}`
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex">

      {/* MOBILE OVERLAY */}
      {open && (
        <div
          onClick={() =>
            setOpen(false)
          }
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <Sidebar
        open={open}
        setOpen={setOpen}
      />

      {/* RIGHT */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* HEADER */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200">

          <div className="h-20 px-4 md:px-8 flex items-center justify-between gap-4">

            {/* LEFT */}
            <div className="flex items-center gap-3">

              <button
                onClick={() =>
                  setOpen(true)
                }
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100"
              >
                <Menu size={20} />
              </button>

              <div>
                <h2 className="text-xl font-bold">
                  Welcome Back 👋
                </h2>

                <p className="text-sm text-gray-500">
                  Manage your store smartly
                </p>
              </div>

            </div>

            {/* SEARCH */}
            <form
              onSubmit={
                handleSearch
              }
              className="hidden md:flex flex-1 max-w-xl relative"
            >

              <input
                value={search}
                onChange={(e) => {

                  const value =
                    e.target.value;

                  setSearch(value);

                  if (!value.trim()) {
                    navigate(
                      window.location.pathname
                    );
                  }
                }}
                placeholder="Search products, orders..."
                className="w-full bg-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
              />

              <Search
                size={18}
                className="absolute left-4 top-3.5 text-gray-500"
              />

            </form>

            {/* RIGHT */}
            <div className="flex items-center gap-3">

              {/* NOTIFICATION */}
              <button
                onClick={() =>
                  setShowNotifications(
                    true
                  )
                }
                className="relative p-3 rounded-2xl bg-white border hover:bg-gray-50"
              >

                <Bell size={18} />

                {!!unreadCount && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 text-[10px] bg-red-500 text-white rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}

              </button>

              {/* PROFILE */}
              <button className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center">
                <User size={18} />
              </button>

            </div>

          </div>

        </header>

        {/* CONTENT */}
        <main className="p-4 md:p-8 flex-1">

          <div className="max-w-425 mx-auto">
            <Outlet />
          </div>

        </main>

      </div>

      {/* NOTIFICATIONS */}
      <NotificationModal
        open={
          showNotifications
        }
        onClose={() =>
          setShowNotifications(
            false
          )
        }
      />

    </div>
  );
};

export default AdminLayout;