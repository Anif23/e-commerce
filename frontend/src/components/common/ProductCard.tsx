import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';

import { cn } from '../../lib/cn';
import { useCartMutations } from '../../hooks/queries/useCart';
import { useWishlist, useWishlistMutations } from '../../hooks/queries/useAccount';
import { Badge, Price, Rating } from '../ui';
import { SmartImage } from './SmartImage';
import type { Product } from '../../types/api';

export const ProductCard = ({ product }: { product: Product }) => {
  const { addItem } = useCartMutations();
  const { ids: wishlistIds } = useWishlist();
  const toggleWishlist = useWishlistMutations();

  const wishlisted = wishlistIds.includes(product.id);
  const outOfStock = product.stock <= 0;

  return (
    <article className="group surface hover-lift reveal is-revealed flex flex-col overflow-hidden">
      <div className="relative overflow-hidden bg-ink-100">
        <Link to={`/products/${product.slug}`} aria-label={product.name}>
          <SmartImage
            src={product.image}
            alt={product.name}
            className="aspect-4/3 w-full transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {product.discountPercent > 0 && <Badge tone="danger">-{product.discountPercent}%</Badge>}
          {product.isFeatured && <Badge tone="brand">Featured</Badge>}
          {outOfStock && <Badge tone="neutral">Sold out</Badge>}
        </div>

        <button
          type="button"
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wishlisted}
          onClick={() => toggleWishlist.mutate(product.id)}
          className={cn(
            'absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition',
            'hover:scale-110',
            wishlisted ? 'text-danger' : 'text-ink-500 hover:text-ink-800',
          )}
        >
          <Heart className={cn('h-4 w-4', wishlisted && 'fill-current')} />
        </button>

        {/* Products with variants need a choice first, so quick-add opens the PDP. */}
        <div className="absolute inset-x-3 bottom-3 translate-y-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {product.hasVariants ? (
            <Link
              to={`/products/${product.slug}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink-900/90 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-ink-900"
            >
              <ShoppingBag className="h-4 w-4" />
              {outOfStock ? 'Sold out' : 'Choose options'}
            </Link>
          ) : (
            <button
              type="button"
              disabled={outOfStock || addItem.isPending}
              onClick={() => addItem.mutate({ product, quantity: 1 })}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink-900/90 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShoppingBag className="h-4 w-4" />
              {outOfStock ? 'Sold out' : 'Add to cart'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.category && (
          <span className="text-xs font-medium uppercase tracking-wide text-ink-400">{product.category.name}</span>
        )}

        <Link to={`/products/${product.slug}`} className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-brand-700">
          {product.name}
        </Link>

        <Rating value={product.ratingAvg} count={product.ratingCount} />

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <Price value={product.price} compareAt={product.compareAtPrice} />
          {product.hasVariants && <span className="text-xs text-ink-400">{product.variants.length} options</span>}
        </div>
      </div>
    </article>
  );
};
