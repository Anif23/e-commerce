import { useState, type FormEvent } from 'react';
import { Save, Store } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Field';
import { ErrorState, PageHeader, Skeleton } from '../../components/ui';
import { assetUrl } from '../../lib/assets';
import { useAdminStoreSettings, useUpdateStoreSettings, useUploadStoreLogo } from '../../hooks/queries/useStoreSettings';
import type { StoreSettings } from '../../types/api';

export const AdminSettingsPage = () => {
  const { data, isLoading, isError, refetch } = useAdminStoreSettings();
  const update = useUpdateStoreSettings();
  const uploadLogo = useUploadStoreLogo();
  const [draft, setDraft] = useState<StoreSettings | null>(null);
  const values = draft ?? data;

  const set = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    if (!values) return;
    setDraft({ ...values, [key]: value });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values) return;

    update.mutate({
      storeName: values.storeName.trim(),
      tagline: values.tagline.trim(),
      logoUrl: values.logoUrl?.trim() || null,
      supportEmail: values.supportEmail.trim(),
      supportPhone: values.supportPhone.trim(),
      supportHours: values.supportHours.trim(),
      businessAddress: values.businessAddress.trim(),
      taxName: values.taxName.trim(),
      taxRatePercent: Number(values.taxRatePercent),
      shippingFee: Number(values.shippingFee),
      freeShippingThreshold: Number(values.freeShippingThreshold),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store settings"
        description="Manage storefront identity, customer contact details, tax, and delivery pricing."
      />

      {isError ? (
        <ErrorState message="We could not load store settings." onRetry={() => refetch()} />
      ) : isLoading || !values ? (
        <Skeleton className="h-[34rem] w-full" />
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <section className="surface space-y-5 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Store className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-ink-900">Branding</h2>
                <p className="text-sm text-ink-500">These values appear across the storefront and admin console.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Store name"
                required
                maxLength={120}
                value={values.storeName}
                onChange={(event) => set('storeName', event.target.value)}
              />
              <Input
                label="Logo image URL"
                type="url"
                placeholder="https://cdn.example.com/logo.png"
                value={values.logoUrl ?? ''}
                onChange={(event) => set('logoUrl', event.target.value || null)}
              />
              <div className="space-y-2">
                <label htmlFor="store-logo-upload" className="block text-sm font-medium text-ink-700">Upload logo</label>
                <input
                  id="store-logo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  disabled={uploadLogo.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadLogo.mutate(file, { onSuccess: ({ data }) => setDraft((current) => current ? { ...current, logoUrl: data.data.logoUrl } : data.data) });
                    event.target.value = '';
                  }}
                  className="block w-full cursor-pointer rounded-xl border border-ink-300 bg-white text-sm text-ink-700 file:mr-3 file:cursor-pointer file:border-0 file:bg-ink-100 file:px-3 file:py-2.5 file:text-sm file:font-medium hover:file:bg-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <p className="text-xs text-ink-500">Images are stored locally or in the configured S3-compatible bucket.</p>
              </div>
              <div className="md:col-span-2">
                <Textarea
                  label="Store tagline"
                  rows={2}
                  maxLength={240}
                  value={values.tagline}
                  onChange={(event) => set('tagline', event.target.value)}
                />
              </div>
              {values.logoUrl && (
                <div className="md:col-span-2">
                  <p className="mb-2 text-xs font-medium text-ink-500">Logo preview</p>
                  <img src={assetUrl(values.logoUrl)} alt="Store logo preview" className="h-16 max-w-48 rounded-lg border border-ink-200 bg-white object-contain p-2" />
                </div>
              )}
            </div>
          </section>

          <section className="surface space-y-5 p-5 sm:p-6">
            <div>
              <h2 className="font-semibold text-ink-900">Customer support</h2>
              <p className="text-sm text-ink-500">Displayed in the footer and policy pages.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Support email" type="email" required value={values.supportEmail} onChange={(event) => set('supportEmail', event.target.value)} />
              <Input label="Support phone" type="tel" value={values.supportPhone} onChange={(event) => set('supportPhone', event.target.value)} />
              <Input label="Support hours" value={values.supportHours} onChange={(event) => set('supportHours', event.target.value)} />
              <Input label="Business address" value={values.businessAddress} onChange={(event) => set('businessAddress', event.target.value)} />
            </div>
          </section>

          <section className="surface space-y-5 p-5 sm:p-6">
            <div>
              <h2 className="font-semibold text-ink-900">Tax and delivery</h2>
              <p className="text-sm text-ink-500">Rates are applied to new cart quotes and orders. Existing orders keep their original totals.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Tax label" required maxLength={32} value={values.taxName} onChange={(event) => set('taxName', event.target.value)} />
              <Input label="Tax rate (%)" type="number" min={0} max={100} step="0.01" value={values.taxRatePercent} onChange={(event) => set('taxRatePercent', Number(event.target.value))} />
              <Input label="Shipping fee" type="number" min={0} step="0.01" value={values.shippingFee} onChange={(event) => set('shippingFee', Number(event.target.value))} />
              <Input label="Free shipping from" type="number" min={0} step="0.01" value={values.freeShippingThreshold} onChange={(event) => set('freeShippingThreshold', Number(event.target.value))} />
            </div>
          </section>

          <div className="flex justify-end">
            <Button type="submit" loading={update.isPending} leftIcon={<Save className="h-4 w-4" />}>
              Save store settings
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
