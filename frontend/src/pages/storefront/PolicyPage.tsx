import { Link, useParams } from 'react-router-dom';
import { ArrowRight, FileText, Mail, PhoneCall, ShieldCheck } from 'lucide-react';

import { NotFoundPage } from '../../components/common/NotFoundPage';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Display';
import { Badge, Reveal } from '../../components/ui/Feedback';
import { POLICIES, getPolicy, type Policy, type PolicyBlock } from '../../content/policies';
import { useCookieConsent } from '../../providers/CookieConsentProvider';
import { POLICY_LAST_UPDATED, SUPPORT_EMAIL, SUPPORT_HOURS, SUPPORT_PHONE, STORE_NAME } from '../../lib/store';
import { cn } from '../../lib/cn';

const Block = ({ block }: { block: PolicyBlock }) => {
  if (block.kind === 'list') {
    return (
      <ul className="mt-3 space-y-2">
        {block.items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-ink-600">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === 'table') {
    return (
      <div className="mt-4 overflow-x-auto rounded-xl border border-ink-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink-50">
            <tr>
              {block.head.map((cell) => (
                <th key={cell} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {block.rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, index) => (
                  <td
                    key={index}
                    className={cn('px-4 py-3', index === 0 ? 'font-medium text-ink-800' : 'text-ink-600')}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <p className="mt-3 text-sm leading-relaxed text-ink-600">{block.body}</p>;
};

const PolicyCard = ({ policy }: { policy: Policy }) => (
  <Link
    to={`/policies/${policy.slug}`}
    className="group rounded-2xl border border-ink-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
  >
    <div className="flex items-start justify-between gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
        <FileText className="h-4.5 w-4.5" />
      </span>
      <ArrowRight className="h-4 w-4 text-ink-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-600" />
    </div>
    <h3 className="mt-4 text-base font-semibold text-ink-900">{policy.title}</h3>
    <p className="mt-1.5 text-sm text-ink-500">{policy.summary}</p>
  </Link>
);

const PolicyIndex = () => (
  <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
    <Reveal>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">Policies</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-500">
        Everything {STORE_NAME} promises — how we handle your data, how returns and refunds work, when your parcel
        arrives, and the terms you accept when you shop with us. Last updated {POLICY_LAST_UPDATED}.
      </p>
    </Reveal>

    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      {POLICIES.map((policy) => (
        <PolicyCard key={policy.slug} policy={policy} />
      ))}
    </div>
  </div>
);

export const PolicyPage = () => {
  const { slug } = useParams<{ slug?: string }>();
  const policy = getPolicy(slug);
  const { reopen } = useCookieConsent();

  if (!slug) return <PolicyIndex />;
  if (!policy) return <NotFoundPage />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <nav className="text-xs text-ink-400" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link to="/policies" className="hover:text-brand-700">
          Policies
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-600">{policy.title}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
        <article>
          <Reveal>
            <h1 className="text-3xl font-semibold tracking-tight text-ink-900">{policy.title}</h1>
            <p className="mt-2 text-sm text-ink-500">{policy.audience}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge tone="neutral">Last updated {POLICY_LAST_UPDATED}</Badge>
              {policy.slug === 'cookies' && (
                <Button variant="outline" size="sm" onClick={reopen}>
                  Cookie preferences
                </Button>
              )}
            </div>
            <p className="mt-5 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-ink-700">{policy.summary}</p>
          </Reveal>

          <div className="mt-8 space-y-8">
            {policy.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-lg font-semibold text-ink-900">{section.heading}</h2>
                {section.blocks.map((block, index) => (
                  <Block key={index} block={block} />
                ))}
              </section>
            ))}
          </div>

          <Card className="mt-10 border-brand-100 bg-brand-50/50 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <div>
                <p className="text-sm font-semibold text-ink-900">Questions about this policy?</p>
                <p className="mt-1 text-sm text-ink-600">
                  Raise a ticket from the support page or write to us directly — we answer within one working day,{' '}
                  {SUPPORT_HOURS}.
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-700">
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center gap-2 hover:text-brand-700">
                    <Mail className="h-4 w-4" /> {SUPPORT_EMAIL}
                  </a>
                  <a
                    href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`}
                    className="inline-flex items-center gap-2 hover:text-brand-700"
                  >
                    <PhoneCall className="h-4 w-4" /> {SUPPORT_PHONE}
                  </a>
                </div>
              </div>
            </div>
          </Card>
        </article>

        {/* Table of contents + cross links, sticky on desktop. */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-2xl border border-ink-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">On this page</p>
              <ul className="mt-3 space-y-2">
                {policy.sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="text-sm text-ink-500 transition hover:text-brand-700">
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-ink-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Other policies</p>
              <ul className="mt-3 space-y-2">
                {POLICIES.filter((entry) => entry.slug !== policy.slug).map((entry) => (
                  <li key={entry.slug}>
                    <Link to={`/policies/${entry.slug}`} className="text-sm text-ink-500 transition hover:text-brand-700">
                      {entry.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile cross-links: the sidebar is hidden below lg. */}
      <div className="mt-10 lg:hidden">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Other policies</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {POLICIES.filter((entry) => entry.slug !== policy.slug).map((entry) => (
            <PolicyCard key={entry.slug} policy={entry} />
          ))}
        </div>
      </div>
    </div>
  );
};
