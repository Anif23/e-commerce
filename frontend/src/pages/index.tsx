import { ShoppingBag, ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  const open = (path: string) => {
    navigate("/login", {
      state: { redirectTo: path },
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-indigo-50">

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center max-w-3xl mx-auto">

          <span className="px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium">
            Modern Ecommerce Platform
          </span>

          <h1 className="mt-6 text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight">
            Build. Shop.
            <span className="text-indigo-600"> Manage.</span>
          </h1>

          <p className="mt-6 text-lg text-gray-600">
            A complete ecommerce platform with customer shopping,
            secure checkout, PayPal integration, order tracking,
            inventory management and an admin dashboard.
          </p>

        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-8 mt-20">

          {/* User */}
          <div
            onClick={() => open("/user/ecommerce")}
            className="group cursor-pointer bg-white rounded-3xl border shadow-sm hover:shadow-2xl transition p-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
              <ShoppingBag className="text-green-600" size={30} />
            </div>

            <h2 className="text-2xl font-bold mt-6">
              Customer Store
            </h2>

            <p className="text-gray-600 mt-3">
              Browse products, wishlist, shopping cart,
              PayPal & COD checkout, order history,
              reviews and profile management.
            </p>

            <div className="mt-8 flex items-center gap-2 text-green-600 font-semibold group-hover:gap-4 transition-all">
              Shop Now
              <ArrowRight size={18} />
            </div>
          </div>

          {/* Admin */}
          <div
            onClick={() => open("/admin/ecommerce")}
            className="group cursor-pointer bg-gray-900 rounded-3xl shadow-xl text-white p-8 hover:scale-[1.02] transition"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
              <ShieldCheck size={30} />
            </div>

            <h2 className="text-2xl font-bold mt-6">
              Admin Dashboard
            </h2>

            <p className="text-gray-300 mt-3">
              Manage products, categories, users,
              inventory, orders, payments,
              analytics and reports from one place.
            </p>

            <div className="mt-8 flex items-center gap-2 text-indigo-300 font-semibold group-hover:gap-4 transition-all">
              Open Dashboard
              <ArrowRight size={18} />
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};

export default Home;