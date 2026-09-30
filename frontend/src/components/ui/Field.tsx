import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

const control =
  'relative z-0 block w-full min-w-0 cursor-text select-text rounded-xl border border-ink-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 transition-colors ' +
  'placeholder:text-ink-400 hover:border-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ' +
  'disabled:bg-ink-100 disabled:text-ink-500';

export const Field = ({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (props: { id: string; 'aria-invalid': boolean }) => ReactNode;
  className?: string;
}) => {
  const id = useId();

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-ink-700">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}

      {children({ id, 'aria-invalid': Boolean(error) })}

      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
};

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, required, ...props },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(field) => (
        <input
          ref={ref}
          {...field}
          className={cn(control, error && 'border-danger focus:border-danger focus:ring-danger/20')}
          {...props}
        />
      )}
    </Field>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, required, ...props },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(field) => (
        <textarea
          ref={ref}
          {...field}
          className={cn(control, 'min-h-24 resize-y', error && 'border-danger')}
          {...props}
        />
      )}
    </Field>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, options, placeholder, className, required, ...props },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(field) => (
        <select ref={ref} {...field} className={cn(control, 'appearance-none pr-9')} {...props}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
});

export const Checkbox = ({
  label,
  checked,
  onChange,
  className,
  description,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  description?: string;
}) => (
  <label className={cn('flex cursor-pointer items-start gap-3', className)}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 accent-brand-600"
    />
    <span className="text-sm">
      <span className="font-medium text-ink-800">{label}</span>
      {description && <span className="block text-xs text-ink-500">{description}</span>}
    </span>
  </label>
);

export const Switch = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={cn(
      'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200',
      checked ? 'bg-brand-600' : 'bg-ink-300',
    )}
  >
    <span
      className={cn(
        'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200',
        checked ? 'translate-x-5.5' : 'translate-x-0.5',
      )}
    />
  </button>
);
