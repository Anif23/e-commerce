import { Check, PackageCheck, Truck, X } from 'lucide-react';

import { cn } from '../../lib/cn';
import { formatDateTime, formatRelative } from '../../lib/format';
import type { OrderTracking } from '../../types/api';

/** Horizontal stepper driven by the server's tracking payload. */
export const OrderTrackingTimeline = ({ tracking }: { tracking: OrderTracking }) => {
  if (tracking.cancelled) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-red-100 text-danger">
          <X className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink-900">This order was cancelled</p>
          <p className="text-xs text-ink-600">No further updates will be posted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <ol className="relative flex flex-col gap-6 sm:flex-row sm:gap-0">
        {tracking.steps.map((step, index) => {
          const isCurrent = index === tracking.currentStep;

          return (
            <li key={step.key} className="relative flex flex-1 gap-3 sm:flex-col sm:items-center sm:gap-2">
              {index < tracking.steps.length - 1 && (
                <span
                  className={cn(
                    'absolute left-4 top-9 h-6 w-0.5 sm:left-1/2 sm:top-4 sm:h-0.5 sm:w-full',
                    step.done ? 'bg-brand-500' : 'bg-ink-200',
                  )}
                  style={index === tracking.steps.length - 1 ? undefined : { zIndex: 0 }}
                />
              )}

              <span
                className={cn(
                  'relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold transition',
                  step.done
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : isCurrent
                      ? 'border-brand-600 bg-white text-brand-700'
                      : 'border-ink-200 bg-white text-ink-400',
                )}
              >
                {step.done ? <Check className="h-4 w-4" /> : index + 1}
              </span>

              <div className="sm:text-center">
                <p className={cn('text-sm font-medium', step.done || isCurrent ? 'text-ink-900' : 'text-ink-400')}>
                  {step.label}
                </p>
                {isCurrent && <p className="text-xs text-brand-600">In progress</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {tracking.tracking.number && (
        <div className="mt-6 flex items-center gap-3 rounded-xl bg-ink-50 px-4 py-3">
          {tracking.status === 'DELIVERED' ? (
            <PackageCheck className="h-5 w-5 text-emerald-600" />
          ) : (
            <Truck className="h-5 w-5 text-brand-600" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-900">
              {tracking.tracking.carrier ?? 'Carrier'} · {tracking.tracking.number}
            </p>
            {tracking.tracking.url ? (
              <a
                href={tracking.tracking.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                Track on the carrier site
              </a>
            ) : (
              <p className="text-xs text-ink-500">Updates every time the parcel is scanned.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/** The full audit trail recorded against an order. */
export const OrderEventList = ({ events }: { events: OrderTracking['timeline'] }) => (
  <ol className="space-y-4">
    {[...events].reverse().map((event, index) => (
      <li key={`${event.status}-${event.createdAt}-${index}`} className="flex gap-3">
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
        <div>
          <p className="text-sm font-medium text-ink-900">{event.message}</p>
          <p className="text-xs text-ink-400">
            {formatDateTime(event.createdAt)} · {formatRelative(event.createdAt)} · by {event.actor}
          </p>
        </div>
      </li>
    ))}
  </ol>
);
