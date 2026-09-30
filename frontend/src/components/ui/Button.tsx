import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'subtle';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const base =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 ' +
  'disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-55 active:scale-[0.98] select-none';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 hover:shadow-md',
  secondary: 'bg-ink-900 text-white hover:bg-ink-800',
  outline: 'border border-ink-300 bg-white text-ink-800 hover:border-ink-400 hover:bg-ink-50',
  subtle: 'bg-ink-100 text-ink-800 hover:bg-ink-200',
  ghost: 'text-ink-700 hover:bg-ink-100',
  danger: 'bg-danger text-white hover:brightness-110',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, leftIcon, rightIcon, fullWidth, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

export const ButtonLink = ({
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: {
  to: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) => (
  <Link to={to} className={cn(base, variants[variant], sizes[size], className)}>
    {children}
  </Link>
);

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: Variant }
>(function IconButton({ label, variant = 'ghost', className, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(base, variants[variant], 'h-10 w-10 rounded-full', className)}
      {...props}
    >
      {children}
    </button>
  );
});
