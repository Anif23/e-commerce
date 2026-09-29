import { Heart, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState } from '../../components/ui';
import { Skeleton } from '../../components/ui/Feedback';
import { ProductGrid } from '../../components/common/ProductGrid';
import { useWishlist } from '../../hooks/queries/useAccount';
import { useAuthStore } from '../../store/authStore';

export const WishlistPage = () => {
  const isAuthed = useAuthStore((state) => Boolean(state.token));
  const { products, isLoading, isError } = useWishlist();

  const items = products.map((entry) => entry.product);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Wishlist</h1>
        <p className="mt-1 text-sm text-ink-500">
          {isAuthed ? 'Saved to your account.' : 'Saved on this device — sign in to keep them everywhere.'}
        </p>
      </header>

      {isError ? (
        <ErrorState message="We could not load your wishlist." />
      ) : isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-72 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-6 w-6" />}
          title="Nothing saved yet"
          description="Tap the heart on any product to keep it here."
          action={
            <Link to="/products">
              <Button leftIcon={<ShoppingBag className="h-4 w-4" />}>Browse products</Button>
            </Link>
          }
        />
      ) : (
        <>
          <ProductGrid products={items} />
          <p className="mt-6 text-center text-xs text-ink-400">
            Tip: add everything to your cart straight from the product cards.
          </p>
        </>
      )}
    </div>
  );
};
