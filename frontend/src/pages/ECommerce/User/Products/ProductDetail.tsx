import { useParams } from "react-router-dom";
import { useProduct } from "../../../../hooks/user/useProducts";
import { useAddToCart } from "../../../../hooks/user/useCart";
import { useToggleWishlist } from "../../../../hooks/user/useWishlist";
import { useWishlistStore } from "../../../../store/wishlistStore";
import { useState, useMemo } from "react";
import ProductGallery from "../../../../components/Ecommerce/User/ProductGallery";

const ProductDetail = () => {
  const { id } = useParams();

  const { data: product, isLoading } = useProduct(Number(id));

  const addToCart = useAddToCart();
  const toggleWishlist = useToggleWishlist();
  const isWishlisted = useWishlistStore((s) => s.isWishlisted(Number(id)));

  const [qty, setQty] = useState(1);

  const pricing = useMemo(() => {
    const now = new Date();

    const isActiveDiscount =
      product?.discountValue &&
      (!product?.discountStart || new Date(product?.discountStart) <= now) &&
      (!product?.discountEnd || new Date(product?.discountEnd) >= now);

    let finalPrice = product?.price;
    let discountAmount = 0;

    if (isActiveDiscount) {
      if (product?.discountType === "PERCENTAGE") {
        discountAmount = (product?.price * product?.discountValue) / 100;
      }

      if (product?.discountType === "FIXED") {
        discountAmount = product?.discountValue;
      }

      finalPrice = product?.price - discountAmount;
    }

    return {
      finalPrice,
      discountAmount,
      hasDiscount: !!isActiveDiscount,
    };
  }, [product]);

  const increase = () => {
    if (qty < product.stock) setQty(q => q + 1);
  };

  const decrease = () => {
    if (qty > 1) setQty(q => q - 1);
  };

  if (isLoading) return <div className="text-center mt-20">Loading...</div>;
  if (!product) return <div className="text-center mt-20">Not found</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 grid md:grid-cols-2 gap-10">

      <ProductGallery images={product?.images} />

      <div>
        <div className="flex items-center gap-3 mb-2">
          {product?.brand && (
            <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
              {product?.brand}
            </span>
          )}

          {product?.sku && (
            <span className="text-xs text-gray-500">
              SKU: {product?.sku}
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold mb-2">{product?.name}</h1>

        <p className="text-gray-500 mb-4">{product?.category?.name}</p>

        <div className="mb-4">

          {pricing.hasDiscount ? (
            <div className="flex items-end gap-3">

              <div className="text-3xl font-bold text-green-600">
                ${pricing?.finalPrice.toLocaleString()}
              </div>

              <div className="text-gray-400 line-through">
                ${product?.price.toLocaleString()}
              </div>

              <span className="text-sm text-red-500 font-semibold">
                Save ${pricing?.discountAmount.toLocaleString()}
              </span>

            </div>
          ) : (
            <div className="text-3xl font-bold text-green-600">
              ${product?.price.toLocaleString()}
            </div>
          )}
        </div>

        {pricing?.hasDiscount && (
          <div className="mb-4">
            <span className="bg-red-100 text-red-600 text-xs px-3 py-1 rounded-full">
              🔥 {product?.discountType === "PERCENTAGE"
                ? `${product?.discountValue}% OFF`
                : `$${product?.discountValue} OFF`}
            </span>
          </div>
        )}

        <div className="mb-4">
          {product?.stock > 0 ? (
            <span className="text-green-600 font-medium">
              ✓ In Stock ({product?.stock} available)
            </span>
          ) : (
            <span className="text-red-500 font-medium">
              ✕ Out of Stock
            </span>
          )}
        </div>

        <p className="text-gray-600 mb-6">{product?.description}</p>

        <div className="flex items-center gap-3 mb-6">
          <button onClick={decrease} className="px-3 py-1 bg-gray-200 rounded">-</button>
          <span className="font-medium">{qty}</span>
          <button onClick={increase} className="px-3 py-1 bg-gray-200 rounded">+</button>
        </div>

        <div className="flex gap-4">

          <button
            onClick={() => {
              if (product) {
                toggleWishlist.mutate(product);
              }
            }}
            className="px-4 py-2 border rounded-lg"
          >
            {isWishlisted ? "❤️ Wishlisted" : "🤍 Wishlist"}
          </button>

          <button
            disabled={product.stock === 0}
            onClick={() =>
              addToCart.mutate(
                { product, qty },
                {
                  onSuccess: () => { setQty(1) },
                }
              )
            }
            className={`px-6 py-2 rounded-lg text-white ${product?.stock === 0 || addToCart.isPending
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-black text-white"
              }`}
          >
            {addToCart.isPending ? "Adding..." : "Add to Cart"}
          </button>

        </div>

      </div>
    </div>
  );
};

export default ProductDetail;