import type { ReactNode } from 'react';

import { Reveal } from '../ui/Feedback';

export const SectionHeader = ({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) => (
  <Reveal className={className}>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{eyebrow}</p>
        )}
        <h2 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  </Reveal>
);
