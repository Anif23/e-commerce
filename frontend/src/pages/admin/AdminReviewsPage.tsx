import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, EyeOff, Trash2 } from 'lucide-react';

import { formatDate } from '../../lib/format';
import { Button, IconButton } from '../../components/ui/Button';
import { Select } from '../../components/ui/Field';
import { Badge, ConfirmDialog, ErrorState, PageHeader, Pagination, Rating } from '../../components/ui';
import { DataTable, type Column } from '../../components/ui/Table';
import { useAdminReviewMutations, useAdminReviews, type AdminReview } from '../../hooks/queries/useAdmin';

export const AdminReviewsPage = () => {
  const [approved, setApproved] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useAdminReviews({
    approved: approved || undefined,
    page,
    limit: 20,
  });
  const { moderate, remove } = useAdminReviewMutations();
  const [deleting, setDeleting] = useState<AdminReview | null>(null);

  const columns: Column<AdminReview>[] = [
    {
      key: 'product',
      header: 'Product',
      render: (review) => (
        <Link
          to={`/products/${review.product.slug ?? review.product.id}`}
          className="font-medium text-ink-900 hover:text-brand-700"
        >
          {review.product.name}
        </Link>
      ),
    },
    {
      key: 'user',
      header: 'Customer',
      render: (review) => <span className="text-sm text-ink-600">{review.user.username}</span>,
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (review) => <Rating value={review.rating} showValue={false} />,
    },
    {
      key: 'review',
      header: 'Review',
      render: (review) => (
        <div>
          {review.title && <p className="text-sm font-medium text-ink-900">{review.title}</p>}
          {review.comment && <p className="text-sm text-ink-600">{review.comment}</p>}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (review) => <span className="text-xs text-ink-500">{formatDate(review.createdAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (review) => (
        <Badge tone={review.isApproved ? 'success' : 'warning'}>
          {review.isApproved ? 'Published' : 'Hidden'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (review) => (
        <div className="flex justify-end gap-1">
          <IconButton
            label={review.isApproved ? 'Hide review' : 'Publish review'}
            onClick={() => moderate.mutate({ id: review.id, isApproved: !review.isApproved })}
          >
            {review.isApproved ? <EyeOff className="h-4 w-4" /> : <Check className="h-4 w-4 text-emerald-600" />}
          </IconButton>
          <IconButton label="Delete review" onClick={() => setDeleting(review)}>
            <Trash2 className="h-4 w-4 text-danger" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" description="Moderate customer feedback before it goes live." />

      <div className="surface flex flex-wrap items-end gap-3 p-4">
        <Select
          className="w-48"
          aria-label="Filter by approval"
          value={approved}
          onChange={(event) => {
            setApproved(event.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All reviews' },
            { value: 'true', label: 'Published' },
            { value: 'false', label: 'Hidden' },
          ]}
        />

        <Button variant="ghost" size="sm" onClick={() => setApproved('')}>
          Reset
        </Button>
      </div>

      {isError ? (
        <ErrorState message="We could not load the reviews." onRetry={() => refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            loading={isLoading}
            rowKey={(review) => review.id}
            empty={<p className="py-6 text-center text-sm text-ink-500">No reviews here.</p>}
          />

          {data?.pagination && (
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onChange={setPage}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this review?"
        message="The product's average rating is recalculated immediately."
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => {
          if (!deleting) return;
          remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </div>
  );
};
