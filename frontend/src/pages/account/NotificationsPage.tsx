import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';

import { cn } from '../../lib/cn';
import { formatRelative } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui';
import { Skeleton } from '../../components/ui/Feedback';
import { useNotificationMutations, useNotifications } from '../../hooks/queries/useAccount';

export const NotificationsPage = () => {
  const { data, isLoading } = useNotifications();
  const { markRead, markAllRead, remove, clearAll } = useNotificationMutations();

  const notifications = data?.notifications ?? [];

  return (
    <div className="surface p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink-900">Notifications</h2>
          <p className="mt-1 text-sm text-ink-500">
            {data?.unread ?? 0} unread of {notifications.length}
          </p>
        </div>

        {notifications.length > 0 && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" leftIcon={<CheckCheck className="h-4 w-4" />} onClick={() => markAllRead.mutate()}>
              Mark all read
            </Button>
            <Button size="sm" variant="ghost" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => clearAll.mutate()}>
              Clear all
            </Button>
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-16 w-full" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState icon={<Bell className="h-6 w-6" />} title="Nothing here yet" description="Order and support updates land here." />
      ) : (
        <ul className="mt-5 divide-y divide-ink-100">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={cn(
                'flex items-start gap-3 py-3.5 transition',
                notification.isRead ? 'opacity-70' : 'font-medium',
              )}
            >
              <span
                className={cn(
                  'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                  notification.isRead ? 'bg-ink-200' : 'bg-brand-600',
                )}
              />

              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-900">{notification.title}</p>
                <p className="text-sm text-ink-600">{notification.message}</p>
                <p className="mt-0.5 text-xs text-ink-400">{formatRelative(notification.createdAt)}</p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {notification.link && (
                  <Link to={notification.link} className="text-xs font-medium text-brand-700 hover:underline">
                    Open
                  </Link>
                )}
                {!notification.isRead && (
                  <button
                    type="button"
                    onClick={() => markRead.mutate(notification.id)}
                    className="rounded px-2 py-1 text-xs text-ink-500 transition hover:bg-ink-100"
                  >
                    Mark read
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Delete notification"
                  onClick={() => remove.mutate(notification.id)}
                  className="rounded p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
