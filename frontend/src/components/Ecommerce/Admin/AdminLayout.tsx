import {
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Sidebar from "./Sidebar";

import {
  Menu,
  Bell,
  Search,
  User,
  LogOut,
  Settings
} from "lucide-react";
import { useAuthStore } from "../../../store/authStore";

import NotificationModal from "../NotificationModal";

import {
  useNotifications,
  useRealtimeNotifications,
} from "../../../hooks/admin/useAdminNotifications";

import { useRealtimeAdminOrders } from "../../../hooks/admin/useAdminOrders";

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

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  const logout = useAuthStore((s) => s.logout);

  useRealtimeNotifications();
  useRealtimeAdminOrders();

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

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
              <div className="relative" ref={profileRef}>

                <button
                  onClick={() =>
                    setShowProfileMenu((prev) => !prev)
                  }
                  className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center"
                >
                  <User size={18} />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-3 w-52 rounded-2xl border bg-white shadow-xl overflow-hidden">

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate("/admin/ecommerce/profile");
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 text-sm"
                    >
                      <Settings size={17} />
                      Profile
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        navigate("/login");
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 text-sm"
                    >
                      <LogOut size={17} />
                      Logout
                    </button>

                  </div>
                )}

              </div>

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
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        type="admin"
      />

    </div>
  );
};

export default AdminLayout;