import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import { formatDate, formatPrice } from '../../lib/format';
import { Button, IconButton } from '../../components/ui/Button';
import { Checkbox, Input, Select, Textarea } from '../../components/ui/Field';
import { Badge, ConfirmDialog, ErrorState, Modal, PageHeader } from '../../components/ui';
import { DataTable, type Column } from '../../components/ui/Table';
import { useAdminCouponMutations, useAdminCoupons } from '../../hooks/queries/useAdmin';
import type { Coupon } from '../../types/api';

const emptyForm = {
  code: '',
  description: '',
  type: 'PERCENTAGE',
  value: '10',
  minOrder: '',
  maxDiscount: '',
  usageLimit: '',
  perUserLimit: '1',
  isActive: true,
  startAt: '',
  endAt: '',
};

const toInputDate = (value?: string | null) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export const AdminCouponsPage = () => {
  const { data, isLoading, isError, refetch } = useAdminCoupons({ limit: 100 });
  const { create, update, remove } = useAdminCouponMutations();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyForm);

  const set = (key: keyof typeof form) => (value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }) as typeof form);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description ?? '',
      type: coupon.type,
      value: String(coupon.value),
      minOrder: coupon.minOrder ? String(coupon.minOrder) : '',
      maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : '',
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
      perUserLimit: String(coupon.perUserLimit ?? 1),
      isActive: coupon.isActive,
      startAt: toInputDate(coupon.startAt),
      endAt: toInputDate(coupon.endAt),
    });
    setOpen(true);
  };

  const submit = () => {
    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description || undefined,
      type: form.type,
      value: Number(form.value || 0),
      minOrder: form.minOrder ? Number(form.minOrder) : null,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      perUserLimit: Number(form.perUserLimit || 1),
      isActive: form.isActive,
      startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
      endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
    };

    const done = () => setOpen(false);

    if (editing) update.mutate({ id: editing.id, payload }, { onSuccess: done });
    else create.mutate(payload, { onSuccess: done });
  };

  const columns: Column<Coupon>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (coupon) => (
        <div>
          <p className="font-mono text-sm font-semibold text-ink-900">{coupon.code}</p>
          {coupon.description && <p className="text-xs text-ink-500">{coupon.description}</p>}
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Discount',
      render: (coupon) => (
        <Badge tone="brand">
          {coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : formatPrice(coupon.value)}
        </Badge>
      ),
    },
    {
      key: 'limits',
      header: 'Limits',
      render: (coupon) => (
        <div className="text-xs text-ink-500">
          <p>Min order: {coupon.minOrder ? formatPrice(coupon.minOrder) : '—'}</p>
          <p>Max discount: {coupon.maxDiscount ? formatPrice(coupon.maxDiscount) : '—'}</p>
        </div>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      align: 'right',
      render: (coupon) => (
        <span className="text-sm text-ink-600">
          {coupon.usedCount}
          {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
        </span>
      ),
    },
    {
      key: 'window',
      header: 'Window',
      render: (coupon) => (
        <span className="text-xs text-ink-500">
          {coupon.startAt ? formatDate(coupon.startAt) : 'now'} → {coupon.endAt ? formatDate(coupon.endAt) : 'open'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (coupon) => (
        <Badge tone={coupon.isActive ? 'success' : 'neutral'}>{coupon.isActive ? 'Active' : 'Disabled'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (coupon) => (
        <div className="flex justify-end gap-1">
          <IconButton label="Edit coupon" onClick={() => openEdit(coupon)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton label="Delete coupon" onClick={() => setDeleting(coupon)}>
            <Trash2 className="h-4 w-4 text-danger" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons"
        description="Discount codes validated at cart and checkout."
        action={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            New coupon
          </Button>
        }
      />

      {isError ? (
        <ErrorState message="We could not load the coupons." onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          loading={isLoading}
          rowKey={(coupon) => coupon.id}
          empty={<p className="py-6 text-center text-sm text-ink-500">No coupons yet.</p>}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.code}` : 'New coupon'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={create.isPending || update.isPending} onClick={submit}>
              {editing ? 'Save changes' : 'Create coupon'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Code" required value={form.code} onChange={(event) => set('code')(event.target.value)} />
            <Select
              label="Type"
              value={form.type}
              onChange={(event) => set('type')(event.target.value)}
              options={[
                { value: 'PERCENTAGE', label: 'Percentage off' },
                { value: 'FIXED', label: 'Fixed amount off' },
              ]}
            />
          </div>

          <Textarea
            label="Description"
            rows={2}
            value={form.description}
            onChange={(event) => set('description')(event.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Value"
              type="number"
              min={0}
              step="0.01"
              required
              value={form.value}
              onChange={(event) => set('value')(event.target.value)}
            />
            <Input
              label="Minimum order"
              type="number"
              min={0}
              step="0.01"
              value={form.minOrder}
              onChange={(event) => set('minOrder')(event.target.value)}
            />
            <Input
              label="Max discount"
              type="number"
              min={0}
              step="0.01"
              value={form.maxDiscount}
              onChange={(event) => set('maxDiscount')(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Total usage limit"
              type="number"
              min={0}
              value={form.usageLimit}
              onChange={(event) => set('usageLimit')(event.target.value)}
            />
            <Input
              label="Uses per customer"
              type="number"
              min={1}
              value={form.perUserLimit}
              onChange={(event) => set('perUserLimit')(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Starts"
              type="date"
              value={form.startAt}
              onChange={(event) => set('startAt')(event.target.value)}
            />
            <Input label="Ends" type="date" value={form.endAt} onChange={(event) => set('endAt')(event.target.value)} />
          </div>

          <Checkbox label="Active" checked={form.isActive} onChange={(checked) => set('isActive')(checked)} />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.code}?`}
        message="Orders that already used it keep their discount."
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
