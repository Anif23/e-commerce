import { useState } from "react";
import { useLogin } from "../../hooks/useAuth";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { useAuthStore } from "../../store/authStore";
import { useCartStore } from "../../store/cartStore";
import { useWishlistStore } from "../../store/wishlistStore";
import { useMergeCart, useMergeWishlist } from "../../hooks/user/useMerge";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from;

  const login = useLogin();

  const setAuth = useAuthStore((s) => s.setAuth);

  const cartStore =
    useCartStore();

  const wishlistStore =
    useWishlistStore();

  const mergeCart = useMergeCart();
  const mergeWishlist = useMergeWishlist();

  const [isMerging, setIsMerging] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    login.mutate(formData, {
      onSuccess: async (data) => {
        setAuth(data.token);

        setIsMerging(true);

        try {
          if (cartStore.items.length > 0) {
            await mergeCart.mutateAsync(
              cartStore.items.map(
                (item) => ({
                  productId:
                    item.product.id,
                  quantity:
                    item.quantity,
                })
              )
            );

            cartStore.clear();
          }

          if (
            wishlistStore.items.length >
            0
          ) {
            await mergeWishlist.mutateAsync(
              wishlistStore.items.map(
                (p) => ({
                  productId: p.id,
                })
              )
            );

            wishlistStore.clear();
          }
        } finally {
          setIsMerging(false);
        }
        const role = useAuthStore.getState().role;

        let finalRedirect = "/user/ecommerce";

        if (role === "ADMIN") {
          finalRedirect = "/admin/ecommerce";
        } else if (redirectTo && redirectTo !== "/login") {
          finalRedirect = redirectTo;
        }

        navigate(finalRedirect);
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-500 to-indigo-600 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

        <h2 className="text-2xl font-bold text-center mb-2">
          Welcome Back 👋
        </h2>

        <p className="text-gray-500 text-center mb-6">
          Login to continue
        </p>

        {login.isError && (
          <div className="bg-red-100 text-red-600 p-2 rounded text-center">
            {getErrorMessage(login.error)}
          </div>
        )}

        {isMerging && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow text-center">
              <p className="font-semibold">Merging your data...</p>
              <p className="text-sm text-gray-500">Please wait ⏳</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="text-sm text-gray-600">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
          >
            {login.isPending ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-6">
          Don’t have an account?{" "}
          <Link
            to="/register"
            state={{ from: redirectTo }}
            className="text-blue-500 hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}