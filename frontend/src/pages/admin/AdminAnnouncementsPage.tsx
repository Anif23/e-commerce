import { useState } from 'react';
import { Megaphone, Pencil, Send, Trash2 } from 'lucide-react';

import { formatDate } from '../../lib/format';
import { Button, IconButton } from '../../components/ui/Button';
import { Checkbox, Input, Textarea } from '../../components/ui/Field';
import { Badge, ConfirmDialog, ErrorState, Modal, PageHeader } from '../../components/ui';
import { DataTable, type Column } from '../../components/ui/Table';
import { useAdminAnnouncementMutations, useAdminAnnouncements } from '../../hooks/queries/useAdmin';
import type { Announcement } from '../../types/api';

const emptyForm = { title: '', message: '', isActive: true, startAt: '', endAt: '' };

const toInputDate = (value?: string | null) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export const AdminAnnouncementsPage = () => {
  const { data, isLoading, isError, refetch } = useAdminAnnouncements();
  const { create, update, remove, send } = useAdminAnnouncementMutations();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);
  const [form, setForm] = useState(emptyForm);

  const set = (key: keyof typeof form) => (value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }) as typeof form);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (announcement: Announcement) => {
    setEditing(announcement);
    setForm({
      title: announcement.title,
      message: announcement.message,
      isActive: announcement.isActive,
      startAt: toInputDate(announcement.startAt),
      endAt: toInputDate(announcement.endAt),
    });
    setOpen(true);
  };

  const submit = () => {
    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      isActive: form.isActive,
      startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
      endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
    };

    const done = () => setOpen(false);

    if (editing) update.mutate({ id: editing.id, payload }, { onSuccess: done });
    else create.mutate(payload, { onSuccess: done });
  };

  const columns: Column<Announcement>[] = [
    {
      key: 'title',
      header: 'Announcement',
      render: (announcement) => (
        <div>
          <p className="font-medium text-ink-900">{announcement.title}</p>
          <p className="text-xs text-ink-500">{announcement.message}</p>
        </div>
      ),
    },
    {
      key: 'window',
      header: 'Window',
      render: (announcement) => (
        <span className="text-xs text-ink-500">
          {announcement.startAt ? formatDate(announcement.startAt) : 'now'} →{' '}
          {announcement.endAt ? formatDate(announcement.endAt) : 'open'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (announcement) => (
        <Badge tone={announcement.isActive ? 'success' : 'neutral'}>
          {announcement.isActive ? 'Live' : 'Hidden'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (announcement) => (
        <div className="flex justify-end gap-1">
          <IconButton label="Send as notification" onClick={() => send.mutate(announcement.id)}>
            <Send className="h-4 w-4 text-brand-600" />
          </IconButton>
          <IconButton label="Edit announcement" onClick={() => openEdit(announcement)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton label="Delete announcement" onClick={() => setDeleting(announcement)}>
            <Trash2 className="h-4 w-4 text-danger" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Banner copy shown at the top of the storefront."
        action={
          <Button leftIcon={<Megaphone className="h-4 w-4" />} onClick={openCreate}>
            New announcement
          </Button>
        }
      />

      {isError ? (
        <ErrorState message="We could not load the announcements." onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          rows={data ?? []}
          loading={isLoading}
          rowKey={(announcement) => announcement.id}
          empty={<p className="py-6 text-center text-sm text-ink-500">No announcements yet.</p>}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit announcement' : 'New announcement'}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={create.isPending || update.isPending} onClick={submit}>
              {editing ? 'Save changes' : 'Create announcement'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title" required value={form.title} onChange={(event) => set('title')(event.target.value)} />

          <Textarea
            label="Message"
            rows={3}
            required
            value={form.message}
            onChange={(event) => set('message')(event.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Starts"
              type="date"
              value={form.startAt}
              onChange={(event) => set('startAt')(event.target.value)}
            />
            <Input label="Ends" type="date" value={form.endAt} onChange={(event) => set('endAt')(event.target.value)} />
          </div>

          <Checkbox label="Show on the storefront" checked={form.isActive} onChange={(checked) => set('isActive')(checked)} />

          <p className="text-xs text-ink-500">
            Use the send button on a row to push it to every customer as a notification.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Delete “${deleting?.title}”?`}
        message="The banner disappears from the storefront immediately."
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
