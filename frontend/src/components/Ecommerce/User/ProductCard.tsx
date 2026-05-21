import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";
import { useCartStore } from "../../../store/cartStore";
import { useWishlistStore } from "../../../store/wishlistStore";
import { useAddToCart } from "../../../hooks/user/useCart";
import { useToggleWishlist } from "../../../hooks/user/useWishlist";

import toast from "react-hot-toast";

const ProductCard = ({ product }: any) => {
  const navigate = useNavigate();

  const token = useAuthStore((s) => s.token);

  const cartStore = useCartStore();
  const wishlistStore = useWishlistStore();

  const addToCart = useAddToCart();
  const toggleWishlistApi = useToggleWishlist();

  const [qty, setQty] = useState(1);

  const isWishlisted =
    wishlistStore.isWishlisted(product.id);

  const handleWishlist = () => {
    wishlistStore.toggle(product);

    if (token) {
      toggleWishlistApi.mutate(product);
    }
  };

  const handleAddToCart = () => {
    if (product.stock === 0) return;

    // guest
    if (!token) {
      cartStore.add(product, qty);

      toast.success("Added to cart 🛒");

      setQty(1);

      return;
    }

    // auth
    addToCart.mutate(
      { product, qty },
      {
        onSuccess: () => {
          setQty(1);
        },
      }
    );
  };

  const increase = () => {
    if (qty < product.stock) {
      setQty((q) => q + 1);
    }
  };

  const decrease = () => {
    if (qty > 1) {
      setQty((q) => q - 1);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-4 relative">

      <button
        onClick={handleWishlist}
        className="absolute right-3 top-3 text-lg"
      >
        {isWishlisted ? "❤️" : "🤍"}
      </button>

      <div
        className="h-40 bg-gray-100 rounded-lg mb-3 overflow-hidden cursor-pointer"
        onClick={() => navigate(`/user/ecommerce/products/${product.id}`)}
      >
        <img
          src={product.images?.[0]?.url || "/placeholder.png"}
          className="w-full h-full object-cover"
        />
      </div>

      {/* 📦 DETAILS */}
      <h2 className="font-semibold truncate">{product.name}</h2>

      <p className="text-sm text-gray-500">
        {product.category?.name}
      </p>

      <div className="flex justify-between mt-2">
        <span className="font-bold text-green-600">
          ₹{product.price}
        </span>

        <span
          className={`text-xs px-2 py-1 rounded ${product.stock > 0
            ? "bg-green-100 text-green-600"
            : "bg-red-100 text-red-600"
            }`}
        >
          {product.stock > 0 ? "In Stock" : "Out"}
        </span>
      </div>

      <div className="flex items-center justify-center gap-3 mt-3">
        <button onClick={decrease} className="px-2 bg-gray-200 rounded">
          -
        </button>

        <span>{qty}</span>

        <button onClick={increase} className="px-2 bg-gray-200 rounded">
          +
        </button>
      </div>

      <button
        disabled={product.stock === 0 || addToCart.isPending}
        onClick={handleAddToCart}
        className="mt-4 w-full bg-black text-white py-2 rounded-lg disabled:opacity-50"
      >
        {addToCart.isPending ? "Adding..." : "Add to Cart"}
      </button>
    </div>
  );
};

export default ProductCard;