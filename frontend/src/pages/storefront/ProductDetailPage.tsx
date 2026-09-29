import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  Heart,
  Minus,
  Package,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';

import { assetUrl } from '../../lib/assets';
import { cn } from '../../lib/cn';
import { formatDate, formatPrice } from '../../lib/format';
import { FREE_SHIPPING_THRESHOLD } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Badge, EmptyState, ErrorState, Rating, RatingInput, Tabs } from '../../components/ui';
import { Skeleton } from '../../components/ui/Feedback';
import { ProductGrid } from '../../components/common/ProductGrid';
import { SectionHeader } from '../../components/common/SectionHeader';
import { useProduct, useProductReviews } from '../../hooks/queries/useCatalog';
import { useCartMutations } from '../../hooks/queries/useCart';
import { useWishlist, useWishlistMutations, useReviewMutations } from '../../hooks/queries/useAccount';
import { useAuthStore } from '../../store/authStore';
import { reviewsApi } from '../../lib/api/endpoints';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import toast from 'react-hot-toast';
import type { Product } from '../../types/api';

const Gallery = ({ product }: { product: Product }) => {
  const images = product.images.length ? product.images : [product.image ?? ''];
  const [active, setActive] = useState(0);

  // Reset to the first image when a different product renders.
  const [shownProduct, setShownProduct] = useState(product.id);
  if (product.id !== shownProduct) {
    setShownProduct(product.id);
    setActive(0);
  }

  return (
    <div className="space-y-3">
      <div className="surface overflow-hidden">
        <img
          src={assetUrl(images[active])}
          alt={product.name}
          className="aspect-square w-full object-cover animate-fade-in"
          key={images[active]}
        />
      </div>

      {images.length > 1 && (
        <div className="no-scrollbar flex gap-3 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image + index}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show image ${index + 1}`}
              className={cn(
                'h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition',
                active === index ? 'border-brand-600' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <img src={assetUrl(image)} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const VariantPicker = ({
  product,
  selected,
  onSelect,
}: {
  product: Product;
  selected: Record<string, string>;
  onSelect: (name: string, value: string) => void;
}) => {
  const options = product.options ?? [];

  if (!options.length) return null;

  return (
    <div className="space-y-4">
      {options.map((option) => (
        <div key={option.id}>
          <p className="mb-2 text-sm font-medium text-ink-800">
            {option.name}
            {selected[option.name] && <span className="ml-2 text-ink-500">{selected[option.name]}</span>}
          </p>

          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const isSelected = selected[option.name] === value;
              const available = product.variants.some(
                (variant) => variant.combination[option.name] === value && variant.stock > 0,
              );

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onSelect(option.name, value)}
                  className={cn(
                    'min-w-12 rounded-xl border px-4 py-2 text-sm font-medium transition',
                    isSelected
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-ink-300 text-ink-700 hover:border-ink-400',
                    !available && !isSelected && 'opacity-40',
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const ReviewForm = ({ productId, onDone }: { productId: number; onDone: () => void }) => {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const { create } = useReviewMutations();

  return (
    <form
      className="space-y-4 rounded-2xl border border-ink-200 bg-ink-50 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate(
          { productId, rating, title: title || undefined, comment: comment || undefined },
          { onSuccess: onDone },
        );
      }}
    >
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-800">Your rating</p>
        <RatingInput value={rating} onChange={setRating} />
      </div>

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Headline (optional)"
        className="w-full rounded-xl border border-ink-300 bg-white px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
      />

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="What did you think of it?"
        rows={3}
        className="w-full resize-y rounded-xl border border-ink-300 bg-white px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
      />

      <Button type="submit" loading={create.isPending}>
        Submit review
      </Button>
    </form>
  );
};

export const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<'description' | 'reviews'>('description');
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [reviewPage, setReviewPage] = useState(1);

  const isAuthed = useAuthStore((state) => Boolean(state.token));
  const { data: product, isLoading, isError, refetch } = useProduct(slug);
  const { data: reviewData } = useProductReviews(slug, reviewPage);
  const { addItem } = useCartMutations();
  const { ids: wishlistIds } = useWishlist();
  const toggleWishlist = useWishlistMutations();

  const eligibility = useQuery({
    queryKey: queryKeys.reviewEligibility(product?.id ?? 0),
    queryFn: async () => (await reviewsApi.eligibility(product!.id)).data.data,
    enabled: isAuthed && Boolean(product?.id),
  });

  // Switching products resets the quantity and picks the first in-stock variant
  // (so the CTA is never dead). Both reset while rendering rather than in an
  // effect, which keeps the first paint correct.
  const [shownProduct, setShownProduct] = useState<string | number | null>(null);
  if (product?.id && product.id !== shownProduct) {
    setShownProduct(product.id);
    setQuantity(1);

    const first = product.variants?.find((variant) => variant.stock > 0) ?? product.variants?.[0];
    setSelected(
      first && product.options?.length
        ? Object.fromEntries(product.options.map((option) => [option.name, first.combination[option.name]]))
        : {},
    );
  }

  const activeVariant = useMemo(() => {
    if (!product?.hasVariants) return null;
    const names = Object.keys(selected);

    return (
      product.variants.find(
        (variant) => variant.stock > 0 && names.every((name) => variant.combination[name] === selected[name]),
      ) ?? product.variants.find((variant) => names.every((name) => variant.combination[name] === selected[name])) ?? null
    );
  }, [product, selected]);

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-1/2" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          title="Product not available"
          message="This product may have been removed or the link is incorrect."
          onRetry={() => refetch()}
        />
        <div className="mt-6 text-center">
          <Link to="/products" className="text-sm font-medium text-brand-700 hover:underline">
            Back to the catalogue
          </Link>
        </div>
      </div>
    );
  }

  const unitPrice = activeVariant ? activeVariant.price : product.price;
  const stock = activeVariant ? activeVariant.stock : product.stock;
  const wishlisted = wishlistIds.includes(product.id);
  const reviews = reviewData?.data.data ?? [];
  const distribution = reviewData?.data.distribution ?? [];

  const handleSelect = (name: string, value: string) => {
    setSelected((current) => ({ ...current, [name]: value }));
    setQuantity(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-ink-500">
        <Link to="/" className="hover:text-brand-700">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/products" className="hover:text-brand-700">
          Shop
        </Link>
        {product.category && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link to={`/products?category=${product.category.slug}`} className="hover:text-brand-700">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="truncate text-ink-800">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <Gallery product={product} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.brand && <Badge tone="neutral">{product.brand}</Badge>}
            {product.discountPercent > 0 && <Badge tone="danger">-{product.discountPercent}% off</Badge>}
            {product.hasVariants && <Badge tone="brand">{product.variants.length} variants</Badge>}
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">{product.name}</h1>

          <div className="mt-3 flex items-center gap-3">
            <Rating value={product.ratingAvg} count={product.ratingCount} size="md" />
            <span className="text-sm text-ink-400">· {product.soldCount} sold</span>
          </div>

          <div className="mt-5 flex items-end gap-3">
            <span className="text-3xl font-semibold text-ink-900">{formatPrice(unitPrice)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-base text-ink-400 line-through">{formatPrice(product.compareAtPrice)}</span>
            )}
          </div>

          {product.hasVariants && (
            <div className="mt-6">
              <VariantPicker product={product} selected={selected} onSelect={handleSelect} />
            </div>
          )}

          <div className="mt-6 flex items-center gap-2 text-sm">
            {stock > 0 ? (
              <>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-emerald-700">
                  In stock
                  {stock <= 10 && ` — only ${stock} left`}
                </span>
              </>
            ) : (
              <span className="text-danger">Out of stock</span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-ink-300 bg-white">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="grid h-11 w-11 place-items-center rounded-l-xl text-ink-600 transition hover:bg-ink-100 disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-semibold tabular-nums">{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={quantity >= stock}
                onClick={() => setQuantity((value) => Math.min(stock, value + 1))}
                className="grid h-11 w-11 place-items-center rounded-r-xl text-ink-600 transition hover:bg-ink-100 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Button
              size="lg"
              className="flex-1 sm:flex-none"
              leftIcon={<ShoppingBag className="h-4 w-4" />}
              disabled={stock <= 0}
              loading={addItem.isPending}
              onClick={() =>
                addItem.mutate({
                  product,
                  variantId: activeVariant?.id ?? null,
                  quantity,
                })
              }
            >
              {stock <= 0 ? 'Sold out' : 'Add to cart'}
            </Button>

            <Button
              size="lg"
              variant={wishlisted ? 'danger' : 'outline'}
              leftIcon={<Heart className={cn('h-4 w-4', wishlisted && 'fill-current')} />}
              onClick={() => toggleWishlist.mutate(product.id)}
            >
              {wishlisted ? 'Saved' : 'Save'}
            </Button>
          </div>

          <ul className="mt-8 grid gap-3 border-t border-ink-200 pt-6 text-sm sm:grid-cols-2">
            <li className="flex items-center gap-2 text-ink-600">
              <Truck className="h-4 w-4 text-brand-600" /> Free delivery over{' '}
              {formatPrice(FREE_SHIPPING_THRESHOLD)}
            </li>
            <li className="flex items-center gap-2 text-ink-600">
              <RotateCcw className="h-4 w-4 text-brand-600" /> 30-day returns
            </li>
            <li className="flex items-center gap-2 text-ink-600">
              <ShieldCheck className="h-4 w-4 text-brand-600" /> Secure checkout
            </li>
            <li className="flex items-center gap-2 text-ink-600">
              <Package className="h-4 w-4 text-brand-600" /> SKU {activeVariant?.sku ?? product.sku ?? '—'}
            </li>
          </ul>
        </div>
      </div>

      {/* Tabs */}
      <section className="mt-14">
        <Tabs
          className="max-w-md"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'description', label: 'Description' },
            { id: 'reviews', label: 'Reviews', count: product.ratingCount },
          ]}
        />

        <div className="mt-6">
          {tab === 'description' ? (
            <div className="surface prose max-w-none p-6 text-sm leading-relaxed text-ink-700">
              {product.description ? (
                <p className="whitespace-pre-line">{product.description}</p>
              ) : (
                <p className="text-ink-500">No description has been added for this product yet.</p>
              )}

              {product.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2 border-t border-ink-100 pt-4">
                  {product.tags.map((tag) => (
                    <Link key={tag} to={`/products?search=${encodeURIComponent(tag)}`}>
                      <Badge tone="neutral">#{tag}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <div className="surface p-5">
                  <p className="text-4xl font-semibold text-ink-900">{product.ratingAvg.toFixed(1)}</p>
                  <Rating value={product.ratingAvg} size="md" showValue={false} />
                  <p className="mt-1 text-sm text-ink-500">{product.ratingCount} reviews</p>

                  <div className="mt-4 space-y-1.5">
                    {[...distribution].reverse().map((bucket) => (
                      <div key={bucket.rating} className="flex items-center gap-2 text-xs text-ink-500">
                        <span className="w-3">{bucket.rating}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{
                              width: `${product.ratingCount ? (bucket.count / product.ratingCount) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="w-6 text-right">{bucket.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {isAuthed &&
                  (eligibility.data?.hasReviewed ? (
                    <p className="mt-4 rounded-xl bg-ink-100 px-4 py-3 text-sm text-ink-600">
                      You already reviewed this product — thanks!
                    </p>
                  ) : eligibility.data?.canReview ? (
                    <div className="mt-4">
                      <ReviewForm
                        productId={product.id}
                        onDone={() => {
                          toast.success('Review posted');
                          eligibility.refetch();
                        }}
                      />
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl bg-ink-100 px-4 py-3 text-sm text-ink-600">
                      Buy this product to leave a review.
                    </p>
                  ))}
              </div>

              <div className="lg:col-span-2">
                {reviews.length === 0 ? (
                  <EmptyState title="No reviews yet" description="Be the first to share your experience." />
                ) : (
                  <ul className="space-y-4">
                    {reviews.map((review) => (
                      <li key={review.id} className="surface p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                              {review.user.username.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-ink-900">{review.user.username}</p>
                              <p className="text-xs text-ink-400">{formatDate(review.createdAt)}</p>
                            </div>
                          </div>
                          {review.isVerifiedPurchase && <Badge tone="success">Verified purchase</Badge>}
                        </div>

                        <div className="mt-3">
                          <Rating value={review.rating} showValue={false} />
                          {review.title && <p className="mt-1.5 text-sm font-semibold text-ink-900">{review.title}</p>}
                          {review.comment && <p className="mt-1 text-sm text-ink-600">{review.comment}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {(reviewData?.data.pagination?.totalPages ?? 1) > 1 && (
                  <div className="flex justify-center gap-2 pt-6">
                    {Array.from({ length: reviewData!.data.pagination!.totalPages }).map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setReviewPage(index + 1)}
                        className={cn(
                          'h-8 w-8 rounded-lg text-sm font-medium transition',
                          reviewPage === index + 1
                            ? 'bg-brand-600 text-white'
                            : 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50',
                        )}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {product.related && product.related.length > 0 && (
        <section className="mt-16">
          <SectionHeader title="You may also like" description="More from this category." />
          <div className="mt-6">
            <ProductGrid products={product.related} />
          </div>
        </section>
      )}
    </div>
  );
};
