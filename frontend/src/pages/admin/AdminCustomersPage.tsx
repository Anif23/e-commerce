import { useState } from 'react';
import { Ban, ShieldCheck, UserCheck } from 'lucide-react';

import { formatDate, formatPrice } from '../../lib/format';
import { useDebounce } from '../../hooks/useDebounce';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { Badge, ConfirmDialog, ErrorState, PageHeader, Pagination } from '../../components/ui';
import { DataTable, type Column } from '../../components/ui/Table';
import { useAdminCustomerMutations, useAdminCustomers } from '../../hooks/queries/useAdmin';
import type { AdminCustomer } from '../../types/api';

export const AdminCustomersPage = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [blocking, setBlocking] = useState<AdminCustomer | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading, isError, refetch } = useAdminCustomers({
    search: debouncedSearch || undefined,
    page,
    limit: 20,
  });

  const { setRole, setBlocked } = useAdminCustomerMutations();

  const customers = data?.data ?? [];
  const pagination = data?.pagination;

  const columns: Column<AdminCustomer>[] = [
    {
      key: 'customer',
      header: 'Customer',
      render: (customer) => (
        <div>
          <p className="font-medium text-ink-900">{customer.username}</p>
          <p className="text-xs text-ink-400">{customer.email}</p>
        </div>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (customer) => <span className="text-sm text-ink-600">{formatDate(customer.createdAt)}</span>,
    },
    {
      key: 'orders',
      header: 'Orders',
      align: 'right',
      render: (customer) => <span className="text-sm text-ink-600">{customer._count?.orders ?? 0}</span>,
    },
    {
      key: 'reviews',
      header: 'Reviews',
      align: 'right',
      render: (customer) => <span className="text-sm text-ink-600">{customer._count?.reviews ?? 0}</span>,
    },
    {
      key: 'spent',
      header: 'Lifetime spend',
      align: 'right',
      render: (customer) => (
        <span className="font-medium text-ink-900">{formatPrice(customer.totalSpent ?? 0)}</span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (customer) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={customer.role === 'ADMIN' ? 'brand' : 'neutral'}>{customer.role}</Badge>
          {customer.isBlocked && <Badge tone="danger">Blocked</Badge>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (customer) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={customer.role === 'ADMIN' ? <UserCheck className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            loading={setRole.isPending}
            onClick={() =>
              setRole.mutate({ id: customer.id, role: customer.role === 'ADMIN' ? 'USER' : 'ADMIN' })
            }
          >
            {customer.role === 'ADMIN' ? 'Revoke admin' : 'Make admin'}
          </Button>

          <Button
            size="sm"
            variant={customer.isBlocked ? 'outline' : 'danger'}
            leftIcon={<Ban className="h-3.5 w-3.5" />}
            onClick={() => (customer.isBlocked ? setBlocked.mutate({ id: customer.id, isBlocked: false }) : setBlocking(customer))}
          >
            {customer.isBlocked ? 'Unblock' : 'Block'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description={`${pagination?.total ?? 0} accounts`} />

      <div className="surface p-4">
        <Input
          className="max-w-md"
          placeholder="Search by name or email…"
          aria-label="Search customers"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {isError ? (
        <ErrorState message="We could not load the customers." onRetry={() => refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={customers}
            loading={isLoading}
            rowKey={(customer) => customer.id}
            empty={<p className="py-6 text-center text-sm text-ink-500">No customers match that search.</p>}
          />

          {pagination && (
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(blocking)}
        onClose={() => setBlocking(null)}
        title={`Block ${blocking?.username}?`}
        message="Blocked accounts cannot sign in until you unblock them."
        confirmLabel="Block account"
        loading={setBlocked.isPending}
        onConfirm={() => {
          if (!blocking) return;
          setBlocked.mutate({ id: blocking.id, isBlocked: true }, { onSuccess: () => setBlocking(null) });
        }}
      />
    </div>
  );
};
