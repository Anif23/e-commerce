import { Link } from 'react-router-dom';
import { Star, Trash2 } from 'lucide-react';

import { assetUrl } from '../../lib/assets';
import { formatDate } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Badge, EmptyState, Rating } from '../../components/ui';
import { Skeleton } from '../../components/ui/Feedback';
import { useMyReviews, useReviewMutations } from '../../hooks/queries/useAccount';

export const ReviewsPage = () => {
  const { data: reviews, isLoading } = useMyReviews();
  const { remove } = useReviewMutations();

  return (
    <div className="surface p-5">
      <header>
        <h2 className="text-base font-semibold text-ink-900">My reviews</h2>
        <p className="mt-1 text-sm text-ink-500">Reviews you have written on products you bought.</p>
      </header>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {[0, 1].map((key) => (
            <Skeleton key={key} className="h-24 w-full" />
          ))}
        </div>
      ) : (reviews ?? []).length === 0 ? (
        <EmptyState
          icon={<Star className="h-6 w-6" />}
          title="No reviews yet"
          description="Buy something and share what you thought — it helps other shoppers."
          action={
            <Link to="/account/orders">
              <Button>Go to my orders</Button>
            </Link>
          }
        />
      ) : (
        <ul className="mt-5 divide-y divide-ink-100">
          {(reviews ?? []).map((review) => (
            <li key={review.id} className="flex gap-4 py-4">
              {review.product && (
                <Link to={`/products/${review.product.slug}`} className="shrink-0">
                  <img
                    src={assetUrl(review.product.image)}
                    alt={review.product.name}
                    loading="lazy"
                    className="h-16 w-16 rounded-xl object-cover"
                  />
                </Link>
              )}

              <div className="min-w-0 flex-1">
                {review.product && (
                  <Link
                    to={`/products/${review.product.slug}`}
                    className="text-sm font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {review.product.name}
                  </Link>
                )}

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Rating value={review.rating} showValue={false} />
                  {review.isVerifiedPurchase && <Badge tone="success">Verified purchase</Badge>}
                  <span className="text-xs text-ink-400">{formatDate(review.createdAt)}</span>
                </div>

                {review.title && <p className="mt-1.5 text-sm font-medium text-ink-900">{review.title}</p>}
                {review.comment && <p className="text-sm text-ink-600">{review.comment}</p>}
              </div>

              <button
                type="button"
                aria-label="Delete review"
                onClick={() => remove.mutate(review.id)}
                className="h-8 w-8 shrink-0 rounded-lg text-ink-400 transition hover:bg-red-50 hover:text-danger"
              >
                <Trash2 className="mx-auto h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
