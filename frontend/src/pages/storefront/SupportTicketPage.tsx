import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Send } from 'lucide-react';

import { cn } from '../../lib/cn';
import { formatDateTime } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Badge, EmptyState, ErrorState } from '../../components/ui';
import { Skeleton } from '../../components/ui/Feedback';
import { useSupportMutations, useSupportTicket } from '../../hooks/queries/useSupport';

export const SupportTicketPage = () => {
  const { id } = useParams<{ id: string }>();
  const ticketId = Number(id);
  const userId = useAuthStore((state) => state.user?.id);
  const { data: ticket, isLoading, isError } = useSupportTicket(ticketId);
  const { reply, close } = useSupportMutations();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  const messages = ticket?.messages ?? [];

  useEffect(() => {
    setMessage('');
  }, [ticketId]);

  if (isLoading) return <Skeleton className="mx-auto mt-10 h-96 max-w-3xl" />;

  if (isError || !ticket) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState title="Ticket not found" message="It may have been removed or belongs to another account." />
        <div className="mt-6 text-center">
          <Link to="/support" className="text-sm font-medium text-brand-700 hover:underline">
            Back to support
          </Link>
        </div>
      </div>
    );
  }

  const send = async () => {
    if (message.trim().length < 2 || pending) return;

    setPending(true);
    try {
      await reply.mutateAsync({ id: ticketId, message: message.trim() });
      setMessage('');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to="/support" className="text-sm text-ink-500 hover:text-brand-700">
        ← All tickets
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink-900">{ticket.subject}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-500">
            Ticket #{ticket.id} · opened {formatDateTime(ticket.createdAt)}
            <Badge tone={ticket.status === 'CLOSED' ? 'neutral' : 'brand'}>{ticket.status}</Badge>
            <Badge tone={ticket.priority === 'HIGH' ? 'danger' : 'neutral'}>{ticket.priority}</Badge>
          </p>
        </div>

        {ticket.status !== 'CLOSED' && (
          <Button variant="outline" size="sm" loading={close.isPending} onClick={() => close.mutate(ticket.id)}>
            Close ticket
          </Button>
        )}
      </header>

      <div className="surface mt-6 flex max-h-[60vh] flex-col p-5">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyState title="No messages yet" description="We will reply shortly." />
          ) : (
            messages.map((entry) => {
              const mine = entry.userId != null && entry.userId === userId;
              const isAdmin = entry.isAdmin;

              return (
                <div key={entry.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                      mine
                        ? 'bg-brand-600 text-white'
                        : isAdmin
                          ? 'bg-ink-100 text-ink-800'
                          : 'bg-ink-50 text-ink-700',
                    )}
                  >
                    <p className="whitespace-pre-line">{entry.message}</p>
                    <p className={cn('mt-1 text-[11px]', mine ? 'text-brand-100' : 'text-ink-400')}>
                      {isAdmin ? 'Support' : mine ? 'You' : 'Customer'} · {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {ticket.status !== 'CLOSED' && (
          <div className="mt-5 flex items-end gap-2 border-t border-ink-100 pt-4">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={2}
              placeholder="Write a reply…"
              className="flex-1 resize-none rounded-xl border border-ink-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <Button onClick={send} loading={pending || reply.isPending} leftIcon={<Send className="h-4 w-4" />}>
              Send
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
