import { useState } from 'react';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';

import { Button, IconButton } from '../../components/ui/Button';
import { Badge, ConfirmDialog, EmptyState, Modal } from '../../components/ui';
import { Skeleton } from '../../components/ui/Feedback';
import { AddressForm, toDraft, type AddressDraft } from '../../components/account/AddressForm';
import { useAddressMutations, useAddresses } from '../../hooks/queries/useAccount';
import type { Address } from '../../types/api';

export const AddressesPage = () => {
  const { data: addresses, isLoading } = useAddresses();
  const { create, update, remove, setDefault } = useAddressMutations();

  const [editing, setEditing] = useState<Address | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Address | null>(null);

  return (
    <div className="surface p-5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-ink-900">Address book</h2>
          <p className="mt-1 text-sm text-ink-500">Used at checkout — pick a default to speed things up.</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
          Add address
        </Button>
      </header>

      {isLoading ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[0, 1].map((key) => (
            <Skeleton key={key} className="h-36 w-full" />
          ))}
        </div>
      ) : (addresses ?? []).length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-6 w-6" />}
          title="No addresses saved"
          description="Add one so checkout is a single click next time."
          action={
            <Button onClick={() => setCreating(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Add address
            </Button>
          }
        />
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {(addresses ?? []).map((address) => (
            <article key={address.id} className="rounded-2xl border border-ink-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                    {address.fullName}
                    {address.isDefault && <Badge tone="brand">Default</Badge>}
                    {address.label && <Badge tone="neutral">{address.label}</Badge>}
                  </p>
                  <p className="mt-1.5 text-sm text-ink-600">
                    {address.address1}
                    {address.address2 ? `, ${address.address2}` : ''}
                  </p>
                  <p className="text-sm text-ink-600">
                    {address.city}, {address.state} {address.zipCode}
                  </p>
                  <p className="text-sm text-ink-600">{address.country}</p>
                  <p className="mt-1 text-xs text-ink-500">{address.phone}</p>
                </div>

                <div className="flex gap-1">
                  <IconButton label="Edit address" onClick={() => setEditing(address)}>
                    <Pencil className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="Delete address" onClick={() => setDeleting(address)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </IconButton>
                </div>
              </div>

              {!address.isDefault && (
                <button
                  type="button"
                  onClick={() => setDefault.mutate(address.id)}
                  className="mt-3 text-xs font-medium text-brand-700 hover:underline"
                >
                  Make default
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      <Modal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'Edit address' : 'New address'}
      >
        <AddressForm
          initial={editing ? toDraft(editing) : undefined}
          loading={create.isPending || update.isPending}
          submitLabel={editing ? 'Save address' : 'Add address'}
          onSubmit={(draft: AddressDraft) => {
            if (editing) {
              update.mutate({ id: editing.id, payload: draft }, { onSuccess: () => setEditing(null) });
            } else {
              create.mutate(draft, { onSuccess: () => setCreating(false) });
            }
          }}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this address?"
        message="Orders already placed keep their own copy of the address."
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
