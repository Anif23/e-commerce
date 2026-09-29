import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, Star } from 'lucide-react';

import { cn } from '../../lib/cn';
import { formatPrice } from '../../lib/format';
import type { OrderStatus } from '../../types/api';

/* ---------------------------------- card ---------------------------------- */

export const Card = ({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('surface p-5', className)} {...rest}>
    {children}
  </div>
);

/* ---------------------------------- price --------------------------------- */

export const Price = ({
  value,
  compareAt,
  size = 'md',
  className,
}: {
  value: number;
  compareAt?: number | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl' };

  return (
    <span className={cn('flex items-baseline gap-2', className)}>
      <span className={cn('font-semibold text-ink-900', sizes[size])}>{formatPrice(value)}</span>
      {compareAt && compareAt > value && (
        <span className="text-xs text-ink-400 line-through">{formatPrice(compareAt)}</span>
      )}
    </span>
  );
};

/* --------------------------------- rating --------------------------------- */

export const Rating = ({
  value,
  count,
  size = 'sm',
  showValue = true,
}: {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  showValue?: boolean;
}) => {
  const dimension = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';

  return (
    <span className="flex items-center gap-1">
      <span className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              dimension,
              star <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-ink-300',
            )}
          />
        ))}
      </span>
      {showValue && <span className="text-xs text-ink-500">{value.toFixed(1)}</span>}
      {count !== undefined && <span className="text-xs text-ink-400">({count})</span>}
    </span>
  );
};

/** Interactive star picker used in the review form. */
export const RatingInput = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        aria-label={`${star} star${star > 1 ? 's' : ''}`}
        onClick={() => onChange(star)}
        className="rounded p-0.5 transition-transform hover:scale-110"
      >
        <Star className={cn('h-7 w-7', star <= value ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
      </button>
    ))}
  </div>
);

/* ----------------------------- quantity stepper ---------------------------- */

export const QuantityStepper = ({
  value,
  onChange,
  max = 99,
  min = 1,
  disabled,
  size = 'md',
}: {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  min?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) => {
  const dimension = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';

  return (
    <div className="inline-flex items-center rounded-xl border border-ink-300 bg-white">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(dimension, 'grid place-items-center rounded-l-xl text-ink-600 transition hover:bg-ink-100 disabled:opacity-40')}
      >
        <Minus className="h-4 w-4" />
      </button>

      <span className={cn('grid place-items-center text-sm font-semibold tabular-nums', size === 'sm' ? 'w-8' : 'w-10')}>
        {value}
      </span>

      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cn(dimension, 'grid place-items-center rounded-r-xl text-ink-600 transition hover:bg-ink-100 disabled:opacity-40')}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
};

/* ---------------------------------- tabs ---------------------------------- */

export const Tabs = <T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) => (
  <div className={cn('flex gap-1 overflow-x-auto rounded-xl bg-ink-100 p-1 no-scrollbar', className)}>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        className={cn(
          'flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
          value === tab.id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800',
        )}
      >
        {tab.label}
        {tab.count !== undefined && <span className="ml-1.5 text-xs text-ink-400">{tab.count}</span>}
      </button>
    ))}
  </div>
);

/* -------------------------------- pagination ------------------------------ */

export const Pagination = ({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (item) => item === 1 || item === totalPages || Math.abs(item - page) <= 1,
  );

  return (
    <nav className="flex items-center justify-center gap-1 pt-8" aria-label="Pagination">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 bg-white text-ink-600 transition hover:bg-ink-50 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((item, index) => (
        <span key={item} className="flex items-center gap-1">
          {index > 0 && pages[index - 1] !== item - 1 && <span className="px-1 text-ink-400">…</span>}
          <button
            onClick={() => onChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              'h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition',
              item === page ? 'bg-brand-600 text-white' : 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50',
            )}
          >
            {item}
          </button>
        </span>
      ))}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 bg-white text-ink-600 transition hover:bg-ink-50 disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
};

/* -------------------------------- stat card ------------------------------- */

export const StatCard = ({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: 'brand' | 'success' | 'warning' | 'danger';
}) => {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
  };

  return (
    <div className="surface hover-lift p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink-500">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
        </div>
        {icon && <span className={cn('grid h-10 w-10 place-items-center rounded-xl', tones[tone])}>{icon}</span>}
      </div>
    </div>
  );
};

/* ------------------------------ status badge ------------------------------ */

const statusTones: Record<OrderStatus, 'neutral' | 'brand' | 'success' | 'warning' | 'danger'> = {
  PENDING_PAYMENT: 'warning',
  PAID: 'brand',
  PROCESSING: 'brand',
  SHIPPED: 'brand',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  EXPIRED: 'neutral',
};

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <span
    className={cn(
      'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
      statusTones[status] === 'success' && 'bg-emerald-50 text-emerald-700',
      statusTones[status] === 'brand' && 'bg-brand-50 text-brand-700',
      statusTones[status] === 'warning' && 'bg-amber-50 text-amber-700',
      statusTones[status] === 'danger' && 'bg-red-50 text-red-700',
      statusTones[status] === 'neutral' && 'bg-ink-100 text-ink-600',
    )}
  >
    {status.toLowerCase().replace('_', ' ')}
  </span>
);

export const PageHeader = ({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) => (
  <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
      {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
    </div>
    {action}
  </div>
);
