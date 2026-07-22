import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, use } from "react";
import {
  Search,
  Heart,
  ShoppingCart,
  User,
  Menu,
  X,
  LogOut,
  Package,
  DollarSign,
  Home,
  Bell,
} from "lucide-react";

import { useAuthStore } from "../../../store/authStore";
import { useCartStore } from "../../../store/cartStore";
import { useWishlistStore } from "../../../store/wishlistStore";
import { useProfile } from "../../../hooks/user/useProfile";
import NotificationModal from "../NotificationModal";
import { useNotifications } from "../../../hooks/user/useNotifications";
import { userAPI } from "../../../api/user";

const UserHeader = () => {
  const { search: urlSearch } =
    useLocation();

  const navigate = useNavigate();

  const { token } =
    useAuthStore();

  const { data: profile } =
    useProfile();

  const [open, setOpen] =
    useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [show, setShow] =
    useState(true);

  const [lastScroll, setLastScroll] =
    useState(0);

  const [showNotifications, setShowNotifications] =
    useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }

      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const params =
    new URLSearchParams(
      urlSearch
    );

  const searchFromUrl =
    params.get("search") || "";

  const [search, setSearch] =
    useState(searchFromUrl);

  useEffect(() => {
    setSearch(searchFromUrl);
  }, [searchFromUrl]);

  const {
    data: notifications = [],
  } = useNotifications();

  const notificationCount =
    notifications.filter(
      (n: any) => !n.isRead
    ).length;

  const cartStore =
    useCartStore();

  const wishlistCount =
    useWishlistStore((s) => s.items.length);

  const cartCount =
    cartStore.getCount();

  const nav = [
    {
      name: "Home",
      path: "/user/ecommerce",
      icon: Home,
    },
    {
      name: "Products",
      path:
        "/user/ecommerce/products",
      icon: Package,
    },
    {
      name: "Orders",
      path:
        "/user/ecommerce/orders",
      icon: Package,
      private: true,
    },
  ];

  const filteredNav = nav.filter(
    (item) =>
      item.private
        ? token
        : true
  );

  useEffect(() => {
    const handleScroll = () => {
      const current =
        window.scrollY;

      if (
        current > lastScroll &&
        current > 80
      ) {
        setShow(false);
      } else {
        setShow(true);
      }

      setLastScroll(current);
    };

    window.addEventListener(
      "scroll",
      handleScroll
    );

    return () =>
      window.removeEventListener(
        "scroll",
        handleScroll
      );
  }, [lastScroll]);

  const handleSearch = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const value =
      search.trim();

    // ✅ if empty remove search param
    if (!value) {
      navigate(
        "/user/ecommerce/products"
      );

      setOpen(false);
      return;
    }

    navigate(
      `/user/ecommerce/products?search=${encodeURIComponent(
        value
      )}&page=1`
    );

    setOpen(false);
  };

  const handleInputChange = (
    value: string
  ) => {
    setSearch(value);

    // ✅ instantly clear URL if empty
    if (!value.trim()) {
      navigate(
        "/user/ecommerce/products"
      );
    }
  };

  const handleLogout =
    async () => {
      try {
        await userAPI.logout();
      } finally {
        useAuthStore
          .getState()
          .logout();

        window.location.href =
          "/";
      }
    };

  return (
    <>
      <NotificationModal
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        type="user"
      />
      {/* HEADER */}
      <header
        className={`fixed top-0 left-0 w-full z-50 border-b border-white/20 bg-white/80 backdrop-blur-xl transition-transform duration-300 ${show
          ? "translate-y-0"
          : "-translate-y-full"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* LOGO */}
          <Link
            to="/user/ecommerce"
            className="text-xl font-bold tracking-tight"
          >
            🛍️ Asnif Store
          </Link>

          {/* SEARCH DESKTOP */}
          <form
            onSubmit={
              handleSearch
            }
            className="hidden md:flex flex-1 max-w-xl relative"
          >
            <input
              value={search}
              onChange={(e) =>
                handleInputChange(
                  e.target.value
                )
              }
              placeholder="Search products..."
              className="w-full bg-gray-100 rounded-full pl-11 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
            />

            <Search
              size={18}
              className="absolute left-4 top-2.5 text-gray-500"
            />
          </form>

          {/* RIGHT */}
          <div className="flex items-center gap-3">
            {/* WISHLIST */}
            <Link
              to="/user/ecommerce/wishlist"
              className="relative p-2 rounded-full hover:bg-gray-100"
            >
              <Heart size={20} />

              {wishlistCount >
                0 && (
                  <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 text-[10px] px-1 bg-red-500 text-white rounded-full flex items-center justify-center">
                    {
                      wishlistCount
                    }
                  </span>
                )}
            </Link>

            {/* CART */}
            <Link
              to="/user/ecommerce/cart"
              className="relative p-2 rounded-full hover:bg-gray-100"
            >
              <ShoppingCart
                size={20}
              />

              {cartCount >
                0 && (
                  <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 text-[10px] px-1 bg-black text-white rounded-full flex items-center justify-center">
                    {
                      cartCount
                    }
                  </span>
                )}
            </Link>

            {/* NOTIFICATIONS */}
            <button
              onClick={() =>
                setShowNotifications(true)
              }
              className="relative p-2 rounded-full hover:bg-gray-100"
            >
              <Bell size={20} />

              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 text-[10px] px-1 bg-red-500 text-white rounded-full flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </button>

            {/* PROFILE */}
            {token ? (
              <div ref={profileRef} className="relative hidden md:block">
                <button
                  onClick={() =>
                    setProfileOpen(
                      !profileOpen
                    )
                  }
                  className="w-10 h-10 rounded-full bg-black text-white font-semibold flex items-center justify-center cursor-pointer"
                >
                  {profile?.username?.charAt(
                    0
                  ) ||
                    "U"}
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-xl border p-2">
                    <div className="px-3 py-2 border-b">
                      <p className="font-semibold">
                        {
                          profile?.username
                        }
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {
                          profile?.email
                        }
                      </p>
                    </div>

                    <Link
                      to="/user/ecommerce/orders"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
                    >
                      <Package size={16} />
                      Orders
                    </Link>

                    <Link
                      to="/user/ecommerce/payments"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
                    >
                      <DollarSign size={16} />
                      Transaction History
                    </Link>

                    <Link
                      to="/user/ecommerce/profile"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
                    >
                      <User size={16} />
                      Profile
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:block bg-black text-white px-5 py-2 rounded-full text-sm"
              >
                Login
              </Link>
            )}

            {/* MOBILE */}
            <button
              onClick={() =>
                setOpen(true)
              }
              className="md:hidden p-2"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE SIDEBAR */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white z-50 shadow-2xl transition-transform duration-300 md:hidden
          ${open
            ? "translate-x-0"
            : "translate-x-full"
          }`}
        ref={menuRef}
      >
        <div className="h-16 px-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">
            Menu
          </h2>

          <button
            onClick={() =>
              setOpen(false)
            }
          >
            <X />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* MOBILE SEARCH */}
          <form
            onSubmit={
              handleSearch
            }
            className="relative"
          >
            <input
              value={search}
              onChange={(e) =>
                handleInputChange(
                  e.target.value
                )
              }
              placeholder="Search..."
              className="w-full bg-gray-100 rounded-full pl-10 pr-4 py-2"
            />

            <Search
              size={18}
              className="absolute left-3 top-2.5 text-gray-500"
            />
          </form>

          {/* NAV */}
          <div className="space-y-2">
            {filteredNav.map(
              (item) => {
                const Icon =
                  item.icon;

                return (
                  <Link
                    key={
                      item.path
                    }
                    to={
                      item.path
                    }
                    onClick={() =>
                      setOpen(
                        false
                      )
                    }
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100"
                  >
                    <Icon
                      size={
                        18
                      }
                    />
                    {
                      item.name
                    }
                  </Link>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* SPACER */}
      <div className="h-16" />
    </>
  );
};

export default UserHeader;