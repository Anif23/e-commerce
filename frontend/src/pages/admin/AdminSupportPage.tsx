import { useState } from 'react';
import { Send } from 'lucide-react';

import { cn } from '../../lib/cn';
import { formatDateTime, formatRelative } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Field';
import { Badge, EmptyState, ErrorState, PageHeader, Pagination, Tabs } from '../../components/ui';
import { Skeleton } from '../../components/ui/Feedback';
import { useAdminSupport, useAdminSupportMutations, useAdminSupportTicket } from '../../hooks/queries/useAdmin';
import type { SupportTicket } from '../../types/api';

const TONE: Record<SupportTicket['status'], 'warning' | 'brand' | 'success' | 'neutral'> = {
  OPEN: 'warning',
  PENDING: 'brand',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

export const AdminSupportPage = () => {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reply, setReply] = useState('');

  const { data, isLoading, isError, refetch } = useAdminSupport({ status: status || undefined, page, limit: 20 });
  const { data: ticket } = useAdminSupportTicket(selectedId ?? undefined);
  const { reply: sendReply, updateStatus } = useAdminSupportMutations();

  const tickets = data?.data ?? [];

  // Open the newest ticket by default so the queue never looks empty, and clear
  // the composer when the selection changes — both derived, not effect-driven.
  const [replyOwner, setReplyOwner] = useState<number | null>(null);
  if (!selectedId && tickets.length) setSelectedId(tickets[0].id);
  if (selectedId !== replyOwner) {
    setReplyOwner(selectedId);
    setReply('');
  }

  const submitReply = async () => {
    if (!selectedId || reply.trim().length < 1) return;

    const message = reply.trim();
    setReply('');
    await sendReply.mutateAsync({ id: selectedId, message });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Support" description="Answer customer tickets — replies notify the customer instantly." />

      <Tabs
        className="max-w-lg"
        value={status}
        onChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        tabs={[
          { id: '', label: 'All' },
          { id: 'OPEN', label: 'Open' },
          { id: 'PENDING', label: 'Pending' },
          { id: 'RESOLVED', label: 'Resolved' },
          { id: 'CLOSED', label: 'Closed' },
        ]}
      />

      {isError ? (
        <ErrorState message="We could not load the support queue." onRetry={() => refetch()} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="surface overflow-hidden p-0 lg:col-span-1">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[0, 1, 2, 3].map((key) => (
                  <Skeleton key={key} className="h-16 w-full" />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <EmptyState title="Queue is clear" description="No tickets with that status." />
            ) : (
              <ul className="max-h-[70vh] divide-y divide-ink-100 overflow-y-auto">
                {tickets.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(entry.id)}
                      className={cn(
                        'w-full px-4 py-3 text-left transition',
                        selectedId === entry.id ? 'bg-brand-50' : 'hover:bg-ink-50',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-medium text-ink-900">{entry.subject}</p>
                        <Badge tone={TONE[entry.status]}>{entry.status}</Badge>
                      </div>
                      <p className="text-xs text-ink-500">
                        {entry.user?.username ?? 'unknown'} · {formatRelative(entry.updatedAt)}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {entry.messages?.length ?? 0} messages
                        {entry.orderId ? ` · order #${entry.orderId}` : ''}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {data?.pagination && (
              <div className="border-t border-ink-100 p-3">
                <Pagination
                  page={data.pagination.page}
                  totalPages={data.pagination.totalPages}
                  onChange={setPage}
                />
              </div>
            )}
          </section>

          <section className="surface flex h-[70vh] flex-col p-0 lg:col-span-2">
            {!selectedId ? (
              <EmptyState title="Pick a ticket" description="Select a conversation on the left." />
            ) : !ticket ? (
              <Skeleton className="m-5 h-full" />
            ) : (
              <>
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-5 py-4">
                  <div>
                    <h2 className="text-sm font-semibold text-ink-900">{ticket.subject}</h2>
                    <p className="text-xs text-ink-500">
                      {ticket.user?.username} · {ticket.user?.email} · opened {formatDateTime(ticket.createdAt)}
                    </p>
                  </div>

                  <div className="w-40">
                    <Select
                      aria-label="Ticket status"
                      value={ticket.status}
                      onChange={(event) => updateStatus.mutate({ id: ticket.id, status: event.target.value })}
                      options={[
                        { value: 'OPEN', label: 'Open' },
                        { value: 'PENDING', label: 'Pending' },
                        { value: 'RESOLVED', label: 'Resolved' },
                        { value: 'CLOSED', label: 'Closed' },
                      ]}
                    />
                  </div>
                </header>

                <div className="flex-1 space-y-4 overflow-y-auto p-5">
                  {(ticket.messages ?? []).map((message) => (
                    <div key={message.id} className={cn('flex', message.isAdmin ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                          message.isAdmin ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-800',
                        )}
                      >
                        <p className="whitespace-pre-line">{message.message}</p>
                        <p className={cn('mt-1 text-[11px]', message.isAdmin ? 'text-brand-100' : 'text-ink-400')}>
                          {message.isAdmin ? 'You' : ticket.user?.username} · {formatDateTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-end gap-2 border-t border-ink-200 p-4">
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    rows={2}
                    placeholder="Write a reply…"
                    className="flex-1 resize-none rounded-xl border border-ink-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                  <Button
                    onClick={submitReply}
                    loading={sendReply.isPending}
                    disabled={reply.trim().length < 1}
                    leftIcon={<Send className="h-4 w-4" />}
                  >
                    Reply
                  </Button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
