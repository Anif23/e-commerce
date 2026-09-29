import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import { assetUrl } from '../../lib/assets';
import { Button, IconButton } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Field';
import { Badge, ConfirmDialog, ErrorState, Modal, PageHeader } from '../../components/ui';
import { DataTable, type Column } from '../../components/ui/Table';
import { useAdminCategories, useAdminCategoryMutations } from '../../hooks/queries/useAdmin';
import type { Category } from '../../types/api';

export const AdminCategoriesPage = () => {
  const { data, isLoading, isError, refetch } = useAdminCategories({ limit: 100 });
  const { create, update, remove } = useAdminCategoryMutations();

  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const categories = data?.data ?? [];

  const openCreate = () => {
    setEditing(null);
    setName('');
    setParentId('');
    setFile(null);
    setCreating(true);
  };

  const openEdit = (category: Category) => {
    setCreating(false);
    setEditing(category);
    setName(category.name);
    setParentId(category.parentId ? String(category.parentId) : '');
    setFile(null);
  };

  const submit = () => {
    const payload = new FormData();
    payload.append('name', name.trim());
    if (parentId) payload.append('parentId', parentId);
    if (file) payload.append('image', file);

    const done = () => {
      setCreating(false);
      setEditing(null);
    };

    if (editing) update.mutate({ id: editing.id, form: payload }, { onSuccess: done });
    else create.mutate(payload, { onSuccess: done });
  };

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Category',
      render: (category) => (
        <div className="flex items-center gap-3">
          <img
            src={assetUrl(category.image)}
            alt=""
            className="h-11 w-11 shrink-0 rounded-lg object-cover"
          />
          <div>
            <p className="font-medium text-ink-900">{category.name}</p>
            <p className="text-xs text-ink-400">/{category.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'products',
      header: 'Products',
      render: (category) => <Badge tone="neutral">{category.productCount ?? 0}</Badge>,
    },
    {
      key: 'children',
      header: 'Sub-categories',
      render: (category) =>
        (category.children ?? []).length ? (
          <span className="text-sm text-ink-600">
            {(category.children ?? []).map((child) => child.name).join(', ')}
          </span>
        ) : (
          <span className="text-sm text-ink-400">—</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (category) => (
        <div className="flex justify-end gap-1">
          <IconButton label="Edit category" onClick={() => openEdit(category)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton label="Delete category" onClick={() => setDeleting(category)}>
            <Trash2 className="h-4 w-4 text-danger" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Group the catalogue — used for navigation and filters."
        action={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            New category
          </Button>
        }
      />

      {isError ? (
        <ErrorState message="We could not load the categories." onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={categories}
          loading={isLoading}
          rowKey={(category) => category.id}
          empty={<p className="py-6 text-center text-sm text-ink-500">No categories yet.</p>}
        />
      )}

      <Modal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'Edit category' : 'New category'}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button loading={create.isPending || update.isPending} onClick={submit}>
              {editing ? 'Save changes' : 'Create category'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" required value={name} onChange={(event) => setName(event.target.value)} />

          <Select
            label="Parent category"
            placeholder="Top level"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
            options={categories
              .filter((category) => category.id !== editing?.id)
              .map((category) => ({ value: category.id, label: category.name }))}
          />

          <div>
            <p className="mb-1.5 block text-sm font-medium text-ink-700">Image</p>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Delete “${deleting?.name}”?`}
        message="Products in this category stay in the catalogue but lose the category link."
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
