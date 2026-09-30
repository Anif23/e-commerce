/** Formatting helpers shared across storefront and admin. */

/* The store trades in Indian rupees, so every amount is formatted en-IN. */
export const CURRENCY_CODE = 'INR';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: CURRENCY_CODE,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });

export const formatPrice = (value?: number | null) => currency.format(Number(value ?? 0));

export const formatCompact = (value?: number | null) => compact.format(Number(value ?? 0));

export const formatDate = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

export const formatDateTime = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';

export const formatRelative = (value?: string | Date | null) => {
  if (!value) return '—';

  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;

  return formatDate(value);
};

export const initialsOf = (name?: string) =>
  (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

/** "PENDING_PAYMENT" -> "Pending payment" */
export const humanize = (value?: string | null) =>
  (value ?? '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const truncate = (value: string, length = 90) =>
  value.length > length ? `${value.slice(0, length).trimEnd()}…` : value;
