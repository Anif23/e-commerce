import { useState } from 'react';
import { Package, RotateCcw, Search } from 'lucide-react';

import { assetUrl } from '../../lib/assets';
import { formatDateTime, formatPrice } from '../../lib/format';
import { useDebounce } from '../../hooks/useDebounce';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Field';
import { Badge, ErrorState, Modal, PageHeader, Pagination, StatCard } from '../../components/ui';
import { DataTable, type Column } from '../../components/ui/Table';
import { useAdjustInventory, useInventoryReport, useAdminInventory } from '../../hooks/queries/useAdmin';
import type { InventoryRow } from '../../types/api';

const STATUS_TONE: Record<InventoryRow['status'], 'success' | 'warning' | 'danger'> = {
  HEALTHY: 'success',
  LOW: 'warning',
  OUT_OF_STOCK: 'danger',
};

export const AdminInventoryPage = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [adjusting, setAdjusting] = useState<InventoryRow | null>(null);
  const [change, setChange] = useState('10');
  const [reason, setReason] = useState('');

  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading, isError, refetch } = useAdminInventory({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
    limit: 15,
  });
  const { data: report } = useInventoryReport();
  const adjust = useAdjustInventory();

  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  const columns: Column<InventoryRow>[] = [
    {
      key: 'product',
      header: 'Product',
      render: (row) => (
        <div className="flex items-center gap-3">
          <img src={assetUrl(row.image)} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-900">{row.name}</p>
            <p className="text-xs text-ink-400">{row.sku ?? 'no SKU'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => <span className="text-sm text-ink-600">{row.category?.name ?? '—'}</span>,
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (row) => (
        <Badge tone={STATUS_TONE[row.status]}>
          {row.stock} {row.status === 'LOW' && `(≤ ${row.lowStock})`}
        </Badge>
      ),
    },
    {
      key: 'variants',
      header: 'Variants',
      render: (row) =>
        row.variants.length ? (
          <span className="text-sm text-ink-600">{row.variants.length} combos</span>
        ) : (
          <span className="text-sm text-ink-400">—</span>
        ),
    },
    {
      key: 'sold',
      header: 'Sold',
      align: 'right',
      render: (row) => <span className="text-sm text-ink-600">{row.soldCount}</span>,
    },
    {
      key: 'value',
      header: 'Stock value',
      align: 'right',
      render: (row) => (
        <span className="font-medium text-ink-900">{formatPrice(row.price * row.stock)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          onClick={() => {
            setAdjusting(row);
            setChange('10');
            setReason('');
          }}
        >
          Adjust
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Stock levels, valuation and adjustments." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Stock valuation"
          value={formatPrice(report?.valuation ?? 0)}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          label="Low stock"
          value={report?.lowStock ?? 0}
          hint="At or below the alert threshold"
          tone="warning"
        />
        <StatCard
          label="Out of stock"
          value={report?.outOfStock ?? 0}
          hint="Hidden from search"
          tone="danger"
        />
      </div>

      <div className="surface flex flex-wrap items-end gap-3 p-4">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-[19px] h-4 w-4 text-ink-400" />
          <Input
            className="pl-9"
            placeholder="Search by name or SKU…"
            aria-label="Search inventory"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <Select
          className="w-48"
          aria-label="Filter by stock status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All stock levels' },
            { value: 'low', label: 'Low stock' },
            { value: 'out', label: 'Out of stock' },
          ]}
        />
      </div>

      {isError ? (
        <ErrorState message="We could not load the inventory." onRetry={() => refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            loading={isLoading}
            rowKey={(row) => row.id}
            empty={<p className="py-6 text-center text-sm text-ink-500">No products match that search.</p>}
          />

          {pagination && (
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
          )}
        </>
      )}

      <Modal
        open={Boolean(adjusting)}
        onClose={() => setAdjusting(null)}
        title={`Adjust stock — ${adjusting?.name ?? ''}`}
        description="Every change is written to the stock log with a reason."
        footer={
          <>
            <Button variant="outline" onClick={() => setAdjusting(null)}>
              Cancel
            </Button>
            <Button
              loading={adjust.isPending}
              onClick={() => {
                if (!adjusting) return;

                adjust.mutate(
                  { id: adjusting.id, payload: { change: Number(change || 0), reason: reason || undefined } },
                  { onSuccess: () => setAdjusting(null) },
                );
              }}
            >
              Apply change
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-500">
            Current stock: <span className="font-semibold text-ink-900">{adjusting?.stock ?? 0}</span>
          </p>

          <Input
            label="Change"
            hint="Use a negative number to remove stock"
            type="number"
            value={change}
            onChange={(event) => setChange(event.target.value)}
          />

          <Input
            label="Reason"
            placeholder="Restocked from supplier"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />

          {adjusting?.variants.length ? (
            <div className="rounded-xl bg-ink-50 p-3 text-xs text-ink-600">
              <p className="font-semibold text-ink-800">Variant stock</p>
              <ul className="mt-1.5 space-y-1">
                {adjusting.variants.map((variant) => (
                  <li key={variant.id}>
                    {variant.sku}: {variant.stock}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-ink-500">
                Adjusting here moves the product total — edit variant stock from the product form.
              </p>
            </div>
          ) : null}

          <p className="text-xs text-ink-400">Last updated {formatDateTime(new Date().toISOString())}</p>
        </div>
      </Modal>
    </div>
  );
};
