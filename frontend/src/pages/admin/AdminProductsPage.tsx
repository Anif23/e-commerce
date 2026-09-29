import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';

import { assetUrl } from '../../lib/assets';
import { formatPrice } from '../../lib/format';
import { useDebounce } from '../../hooks/useDebounce';
import { Button, IconButton } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Field';
import { Badge, ConfirmDialog, ErrorState, PageHeader, Pagination } from '../../components/ui';
import { DataTable, type Column } from '../../components/ui/Table';
import { useAdminCategories, useAdminProductMutations, useAdminProducts } from '../../hooks/queries/useAdmin';
import type { Product } from '../../types/api';

export const AdminProductsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // The status dropdown maps onto the dedicated query flags the API understands.
  const statusFilter =
    status === 'active'
      ? { isActive: true }
      : status === 'inactive'
        ? { isActive: false }
        : status === 'low'
          ? { lowStock: true }
          : status === 'featured'
            ? { featured: true }
            : {};

  const { data, isLoading, isError, refetch } = useAdminProducts({
    search: debouncedSearch || undefined,
    category: category || undefined,
    ...statusFilter,
    page,
    limit: 10,
  });
  const { remove, restore } = useAdminProductMutations();
  const { data: categories } = useAdminCategories();

  const products = data?.data ?? [];
  const pagination = data?.pagination;

  const columns: Column<Product>[] = [
    {
      key: 'product',
      header: 'Product',
      render: (product) => (
        <div className="flex items-center gap-3">
          <img
            src={assetUrl(product.image)}
            alt={product.name}
            loading="lazy"
            className="h-11 w-11 shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-900">{product.name}</p>
            <p className="text-xs text-ink-400">
              {product.brand ? `${product.brand} · ` : ''}
              {product.sku ?? 'no SKU'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (product) => <span className="text-sm text-ink-600">{product.category?.name ?? '—'}</span>,
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      render: (product) => (
        <div className="text-right">
          <p className="font-medium text-ink-900">{formatPrice(product.price)}</p>
          {product.compareAtPrice && (
            <p className="text-xs text-ink-400 line-through">{formatPrice(product.compareAtPrice)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      render: (product) => (
        <Badge tone={product.stock === 0 ? 'danger' : product.stock <= (product.lowStock ?? 5) ? 'warning' : 'success'}>
          {product.stock}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (product) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={product.isActive ? 'success' : 'neutral'}>{product.isActive ? 'Active' : 'Hidden'}</Badge>
          {product.isFeatured && <Badge tone="brand">Featured</Badge>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (product) => (
        <div className="flex justify-end gap-1">
          <IconButton label="View product" onClick={() => navigate(`/products/${product.slug}`)}>
            <Eye className="h-4 w-4" />
          </IconButton>
          <IconButton label="Edit product" onClick={() => navigate(`/admin/products/${product.id}/edit`)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          {product.isActive ? (
            <IconButton label="Delete product" onClick={() => setDeleting(product)}>
              <Trash2 className="h-4 w-4 text-danger" />
            </IconButton>
          ) : (
            <IconButton label="Restore product" onClick={() => restore.mutate(product.id)}>
              <RotateCcw className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={`${pagination?.total ?? 0} products in the catalogue`}
        action={
          <Link to="/admin/products/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>New product</Button>
          </Link>
        }
      />

      <div className="surface flex flex-wrap items-end gap-3 p-4">
        <Input
          className="min-w-56 flex-1"
          placeholder="Search by name, brand or SKU…"
          aria-label="Search products"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <Select
          className="w-48"
          placeholder="All categories"
          aria-label="Filter by category"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}
          options={(categories?.data ?? []).map((entry) => ({ value: entry.id, label: entry.name }))}
        />

        <Select
          className="w-44"
          aria-label="Filter by status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'Any status' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Hidden' },
            { value: 'low', label: 'Low stock' },
            { value: 'featured', label: 'Featured' },
          ]}
        />
      </div>

      {isError ? (
        <ErrorState message="We could not load the products." onRetry={() => refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={products}
            loading={isLoading}
            rowKey={(product) => product.id}
            empty={<p className="py-6 text-center text-sm text-ink-500">No products match those filters.</p>}
          />

          {pagination && (
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Delete “${deleting?.name}”?`}
        message="Products are soft-deleted so order history stays intact. You can restore it later."
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
