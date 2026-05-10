import { useWishlist } from "../../../../hooks/user/useWishlist";
import { useAuthStore } from "../../../../store/authStore";
import ProductCard from "../../../../components/Ecommerce/User/ProductCard";
import { useWishlistStore } from "../../../../store/wishlistStore";

const WishlistPage = () => {
  const token = useAuthStore((s) => s.token);
  const guestWishlist = useWishlistStore();

  const isGuest = !token;

  const { data: wishList, isLoading } = useWishlist();

  const items = isGuest
    ? guestWishlist.items
    : wishList || [];

  if (!isGuest && isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh] text-gray-500">
        Loading wishlist...
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] text-center">
        <div className="text-5xl mb-3">❤️</div>
        <h2 className="text-xl font-semibold">Your wishlist is empty</h2>
        <p className="text-gray-500 mt-1">
          Save products you love and view them here.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-6 py-8">
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-bold">My Wishlist</h1>
        <p className="text-gray-500 mt-1">
          {items.length} item{items.length > 1 ? "s" : ""} saved
        </p>
      </div>

      <div className="max-w-7xl mx-auto grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((product: any) => {
          return (
            <ProductCard
              key={product.id}
              product={product}
            />
          );
        })}
      </div>
    </div>
  );
};

export default WishlistPage;