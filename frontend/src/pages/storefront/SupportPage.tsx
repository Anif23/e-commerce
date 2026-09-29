import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, LifeBuoy, MessageSquare, Send } from 'lucide-react';

import { cn } from '../../lib/cn';
import { formatRelative } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { Badge, EmptyState } from '../../components/ui';
import { Skeleton } from '../../components/ui/Feedback';
import { useSupportFaq, useSupportMutations, useSupportTickets } from '../../hooks/queries/useSupport';
import { useOrders } from '../../hooks/queries/useOrders';
import type { SupportTicket } from '../../types/api';

const STATUS_TONE: Record<SupportTicket['status'], 'success' | 'warning' | 'brand' | 'neutral'> = {
  OPEN: 'warning',
  PENDING: 'brand',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

const Faq = () => {
  const { data, isLoading } = useSupportFaq();
  const [open, setOpen] = useState<number | null>(0);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data?.length) return null;

  return (
    <div className="space-y-2">
      {data.map((entry, index) => (
        <div key={entry.question} className="overflow-hidden rounded-xl border border-ink-200 bg-white">
          <button
            type="button"
            onClick={() => setOpen(open === index ? null : index)}
            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
          >
            <span className="text-sm font-medium text-ink-900">{entry.question}</span>
            <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-400 transition', open === index && 'rotate-180')} />
          </button>

          {open === index && (
            <p className="border-t border-ink-100 px-4 py-3 text-sm text-ink-600 animate-fade-in">{entry.answer}</p>
          )}
        </div>
      ))}
    </div>
  );
};

const TicketForm = ({ defaultOrderId }: { defaultOrderId?: number }) => {
  const isAuthed = useAuthStore((state) => Boolean(state.token));
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState<string>(defaultOrderId ? String(defaultOrderId) : '');
  const [priority, setPriority] = useState('NORMAL');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { create } = useSupportMutations();
  const { data: orders } = useOrders({ page: 1 });

  const orderOptions = useMemo(
    () => (orders?.data ?? []).map((order) => ({ value: order.id, label: `Order #${order.id}` })),
    [orders],
  );

  if (!isAuthed) {
    return (
      <div className="surface p-5 text-sm text-ink-600">
        <p>Sign in to open a support ticket — we attach your order history automatically.</p>
        <Link to="/login?redirect=/support" className="mt-3 inline-block">
          <Button size="sm">Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <form
      className="surface space-y-4 p-5"
      onSubmit={(event) => {
        event.preventDefault();

        const next: Record<string, string> = {};
        if (subject.trim().length < 4) next.subject = 'Give your request a short title';
        if (message.trim().length < 10) next.message = 'Tell us a little more (10+ characters)';
        setErrors(next);
        if (Object.keys(next).length) return;

        create.mutate(
          { subject: subject.trim(), message: message.trim(), orderId: orderId ? Number(orderId) : undefined, priority },
          {
            onSuccess: () => {
              setSubject('');
              setMessage('');
              setOrderId('');
            },
          },
        );
      }}
    >
      <Input
        label="Subject"
        required
        value={subject}
        error={errors.subject}
        onChange={(event) => setSubject(event.target.value)}
        placeholder="Where is my parcel?"
      />

      {orderOptions.length > 0 && (
        <Select
          label="Related order"
          placeholder="Not related to an order"
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
          options={orderOptions}
        />
      )}

      <Select
        label="Priority"
        value={priority}
        onChange={(event) => setPriority(event.target.value)}
        options={[
          { value: 'LOW', label: 'Low' },
          { value: 'NORMAL', label: 'Normal' },
          { value: 'HIGH', label: 'High' },
        ]}
      />

      <Textarea
        label="How can we help?"
        required
        rows={4}
        value={message}
        error={errors.message}
        onChange={(event) => setMessage(event.target.value)}
      />

      <Button type="submit" loading={create.isPending} leftIcon={<Send className="h-4 w-4" />}>
        Send request
      </Button>
    </form>
  );
};

const MyTickets = () => {
  const isAuthed = useAuthStore((state) => Boolean(state.token));
  const { data, isLoading } = useSupportTickets({ page: 1 });

  if (!isAuthed) return null;

  return (
    <div className="surface p-5">
      <h2 className="text-sm font-semibold text-ink-900">Your tickets</h2>

      {isLoading ? (
        <Skeleton className="mt-4 h-24 w-full" />
      ) : (data?.data ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-ink-500">You have not opened a ticket yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-ink-100">
          {(data?.data ?? []).map((ticket) => (
            <li key={ticket.id}>
              <Link
                to={`/support/${ticket.id}`}
                className="flex items-center justify-between gap-3 py-3 transition hover:text-brand-700"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{ticket.subject}</p>
                  <p className="text-xs text-ink-500">
                    #{ticket.id} · updated {formatRelative(ticket.updatedAt)}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[ticket.status]}>{ticket.status}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const SupportPage = () => {
  const [params] = useSearchParams();
  const defaultOrderId = params.get('order') ? Number(params.get('order')) : undefined;
  const isAuthed = useAuthStore((state) => Boolean(state.token));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink-900">
          <LifeBuoy className="h-6 w-6 text-brand-600" />
          Customer support
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Answers to the common questions first — otherwise send us a ticket and a human will reply.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Frequently asked</h2>
          <Faq />
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
              <MessageSquare className="h-4 w-4" />
              Contact us
            </h2>
            <TicketForm defaultOrderId={defaultOrderId} />
          </div>

          {isAuthed ? (
            <MyTickets />
          ) : (
            <EmptyState
              title="Not signed in"
              description="Sign in to see your tickets and their replies."
              action={
                <Link to="/login">
                  <Button>Sign in</Button>
                </Link>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
};
