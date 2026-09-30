import type { ReactNode } from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

import { cn } from '../../lib/cn';
import { useReveal } from '../../hooks/useReveal';

export const Spinner = ({ className }: { className?: string }) => (
  <Loader2 className={cn('h-5 w-5 animate-spin text-brand-600', className)} />
);

export const LoadingBlock = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-500">
    <Spinner className="h-7 w-7" />
    <p className="text-sm">{label}</p>
  </div>
);

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('skeleton rounded-lg', className)} />
);

export const SkeletonGrid = ({ count = 8, className }: { count?: number; className?: string }) => (
  <div className={cn('grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="surface overflow-hidden">
        <Skeleton className="aspect-4/3 rounded-none" />
        <div className="space-y-3 p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) => (
  <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-16 text-center', className)}>
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
      {icon ?? <Inbox className="h-6 w-6" />}
    </div>
    <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
    {description && <p className="max-w-md text-sm text-ink-500">{description}</p>}
    {action && <div className="pt-2">{action}</div>}
  </div>
);

export const ErrorState = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) => (
  <div
    role="alert"
    className={cn('flex flex-col items-center justify-center gap-3 rounded-2xl border border-danger/20 bg-danger/5 px-6 py-12 text-center', className)}
  >
    <AlertCircle className="h-7 w-7 text-danger" />
    <h3 className="text-base font-semibold text-ink-900">{title}</h3>
    {message && <p className="max-w-md text-sm text-ink-600">{message}</p>}
    {onRetry && (
      <button onClick={onRetry} className="mt-1 text-sm font-medium text-brand-700 underline underline-offset-4">
        Try again
      </button>
    )}
  </div>
);

const badgeTones = {
  neutral: 'bg-ink-100 text-ink-700',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
} as const;

export type BadgeTone = keyof typeof badgeTones;

export const Badge = ({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
      badgeTones[tone],
      className,
    )}
  >
    {children}
  </span>
);

/** Fades content in as it scrolls into the viewport. */
export const Reveal = ({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'article';
}) => {
  const { ref, revealed } = useReveal<HTMLDivElement>();

  return (
    <Tag
      ref={ref as never}
      className={cn('reveal', revealed && 'is-revealed', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
};
