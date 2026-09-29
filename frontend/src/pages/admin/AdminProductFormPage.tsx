import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2, X } from 'lucide-react';

import { assetUrl } from '../../lib/assets';
import { cn } from '../../lib/cn';
import { Button, IconButton } from '../../components/ui/Button';
import { Checkbox, Input, Select, Switch, Textarea } from '../../components/ui/Field';
import { Badge, ErrorState, PageHeader } from '../../components/ui';
import { Skeleton } from '../../components/ui/Feedback';
import { useAdminCategories, useAdminProduct, useAdminProductMutations } from '../../hooks/queries/useAdmin';

interface OptionRow {
  name: string;
  values: string[];
}

const toDateInput = (value?: string | null) => (value ? new Date(value).toISOString().slice(0, 16) : '');

export const AdminProductFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const productId = Number(id);

  const { data: product, isLoading, isError } = useAdminProduct(isEdit ? productId : undefined);
  const { data: categories } = useAdminCategories({ limit: 100 });
  const {
    create,
    update,
    createVariant,
    deleteVariant,
    setOptions: saveOptions,
  } = useAdminProductMutations();

  const [form, setForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    price: '',
    stock: '0',
    lowStock: '5',
    sku: '',
    brand: '',
    tags: '',
    discountType: '',
    discountValue: '',
    discountStart: '',
    discountEnd: '',
    isActive: true,
    isFeatured: false,
  });

  const [files, setFiles] = useState<File[]>([]);
  const [deleteImageIds, setDeleteImageIds] = useState<number[]>([]);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [variantDraft, setVariantDraft] = useState({ sku: '', price: '', stock: '0', combination: '{}' });
  const [savingOptions, setSavingOptions] = useState(false);

  useEffect(() => {
    if (!product) return;

    setForm({
      name: product.name,
      description: product.description ?? '',
      categoryId: String(product.category?.id ?? ''),
      price: String(product.compareAtPrice ?? product.price),
      stock: String(product.stock),
      lowStock: String(product.lowStock ?? 5),
      sku: product.sku ?? '',
      brand: product.brand ?? '',
      tags: (product.tags ?? []).join(', '),
      discountType: product.discountType ?? '',
      discountValue: product.discountValue ? String(product.discountValue) : '',
      discountStart: toDateInput(product.discountStart),
      discountEnd: toDateInput(product.discountEnd),
      isActive: product.isActive,
      isFeatured: product.isFeatured,
    });

    setOptions((product.options ?? []).map((option) => ({ name: option.name, values: option.values })));
  }, [product]);

  const set = (key: keyof typeof form) => (value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }) as typeof form);

  const categoryOptions = useMemo(
    () => (categories?.data ?? []).map((category) => ({ value: category.id, label: category.name })),
    [categories],
  );

  const buildFormData = () => {
    const payload = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) return;
      payload.append(key, String(value));
    });

    files.forEach((file) => payload.append('images', file));
    deleteImageIds.forEach((imageId) => payload.append('deleteImages[]', String(imageId)));

    return payload;
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (isEdit) {
      update.mutate({ id: productId, form: buildFormData() }, { onSuccess: () => navigate('/admin/products') });
    } else {
      create.mutate(buildFormData(), { onSuccess: () => navigate('/admin/products') });
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isEdit && (isError || !product)) {
    return <ErrorState title="Product not found" message="It may have been deleted." />;
  }

  const busy = create.isPending || update.isPending;

  return (
    <form onSubmit={submit} className="space-y-6">
      <PageHeader
        title={isEdit ? `Edit “${product?.name}”` : 'New product'}
        description={isEdit ? 'Update pricing, stock, media and variants.' : 'Add a product to the catalogue.'}
        action={
          <div className="flex gap-2">
            <Link to="/admin/products">
              <Button type="button" variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </Button>
            </Link>
            <Button type="submit" loading={busy} leftIcon={<Save className="h-4 w-4" />}>
              {isEdit ? 'Save changes' : 'Create product'}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface space-y-4 p-5">
            <h2 className="text-sm font-semibold text-ink-900">Basics</h2>

            <Input label="Name" required value={form.name} onChange={(event) => set('name')(event.target.value)} />

            <Textarea
              label="Description"
              rows={5}
              value={form.description}
              onChange={(event) => set('description')(event.target.value)}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Category"
                required
                placeholder="Choose a category"
                value={form.categoryId}
                onChange={(event) => set('categoryId')(event.target.value)}
                options={categoryOptions}
              />
              <Input label="Brand" value={form.brand} onChange={(event) => set('brand')(event.target.value)} />
            </div>

            <Input
              label="Tags"
              hint="Comma separated — used by search"
              value={form.tags}
              onChange={(event) => set('tags')(event.target.value)}
            />
          </section>

          <section className="surface space-y-4 p-5">
            <h2 className="text-sm font-semibold text-ink-900">Pricing & stock</h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Price (list)"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.price}
                onChange={(event) => set('price')(event.target.value)}
              />
              <Input
                label="Stock"
                type="number"
                min={0}
                value={form.stock}
                onChange={(event) => set('stock')(event.target.value)}
              />
              <Input
                label="Low-stock alert at"
                type="number"
                min={0}
                value={form.lowStock}
                onChange={(event) => set('lowStock')(event.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Discount type"
                placeholder="None"
                value={form.discountType}
                onChange={(event) => set('discountType')(event.target.value)}
                options={[
                  { value: 'PERCENTAGE', label: 'Percentage' },
                  { value: 'FIXED', label: 'Fixed amount' },
                ]}
              />
              <Input
                label="Discount value"
                type="number"
                min={0}
                step="0.01"
                value={form.discountValue}
                onChange={(event) => set('discountValue')(event.target.value)}
              />
              <Input label="SKU" value={form.sku} onChange={(event) => set('sku')(event.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Discount starts"
                type="datetime-local"
                value={form.discountStart}
                onChange={(event) => set('discountStart')(event.target.value)}
              />
              <Input
                label="Discount ends"
                type="datetime-local"
                value={form.discountEnd}
                onChange={(event) => set('discountEnd')(event.target.value)}
              />
            </div>
          </section>

          <section className="surface space-y-4 p-5">
            <h2 className="text-sm font-semibold text-ink-900">Images</h2>

            {isEdit && (product?.imageRows ?? []).length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {(product?.imageRows ?? []).map((image) => {
                  const marked = deleteImageIds.includes(image.id);

                  return (
                    <div key={image.id} className={cn('group relative', marked && 'opacity-40')}>
                      <img
                        src={assetUrl(image.url)}
                        alt=""
                        className="aspect-square w-full rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        aria-label={marked ? 'Keep image' : 'Remove image'}
                        onClick={() =>
                          setDeleteImageIds((current) =>
                            current.includes(image.id)
                              ? current.filter((entry) => entry !== image.id)
                              : [...current, image.id],
                          )
                        }
                        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-ink-700 shadow transition hover:bg-white"
                      >
                        {marked ? <Plus className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              className="block w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />

            {files.length > 0 && (
              <p className="text-xs text-ink-500">{files.length} new image(s) will be uploaded on save.</p>
            )}
          </section>

          {isEdit && (
            <section className="surface space-y-4 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink-900">Variants</h2>
                <Badge tone={product?.hasVariants ? 'brand' : 'neutral'}>
                  {product?.variants.length ?? 0} variants
                </Badge>
              </div>

              <div className="space-y-3">
                {(product?.variants ?? []).map((variant) => (
                  <div
                    key={variant.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900">{variant.label || variant.sku}</p>
                      <p className="text-xs text-ink-500">
                        {variant.sku} · {variant.stock} in stock
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-ink-900">${variant.price.toFixed(2)}</span>
                      <IconButton
                        label="Delete variant"
                        onClick={() => deleteVariant.mutate({ id: productId, variantId: variant.id })}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </IconButton>
                    </div>
                  </div>
                ))}

                {(product?.variants ?? []).length === 0 && (
                  <p className="text-sm text-ink-500">
                    No variants yet — define the option axes below, then add each combination.
                  </p>
                )}
              </div>

              <div className="grid gap-3 rounded-xl bg-ink-50 p-4 sm:grid-cols-4">
                <Input
                  label="SKU"
                  value={variantDraft.sku}
                  onChange={(event) => setVariantDraft((current) => ({ ...current, sku: event.target.value }))}
                />
                <Input
                  label="Price"
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  value={variantDraft.price}
                  onChange={(event) => setVariantDraft((current) => ({ ...current, price: event.target.value }))}
                />
                <Input
                  label="Stock"
                  type="number"
                  value={variantDraft.stock}
                  onChange={(event) => setVariantDraft((current) => ({ ...current, stock: event.target.value }))}
                />
                <Input
                  label="Combination (JSON)"
                  placeholder='{"Size":"M"}'
                  value={variantDraft.combination}
                  onChange={(event) =>
                    setVariantDraft((current) => ({ ...current, combination: event.target.value }))
                  }
                />

                <div className="sm:col-span-4">
                  <Button
                    type="button"
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    loading={createVariant.isPending}
                    onClick={() => {
                      let combination = {};

                      try {
                        combination = JSON.parse(variantDraft.combination || '{}');
                      } catch {
                        return;
                      }

                      createVariant.mutate(
                        {
                          id: productId,
                          payload: {
                            sku: variantDraft.sku || undefined,
                            price: variantDraft.price || undefined,
                            stock: Number(variantDraft.stock || 0),
                            combination,
                          },
                        },
                        {
                          onSuccess: () => setVariantDraft({ sku: '', price: '', stock: '0', combination: '{}' }),
                        },
                      );
                    }}
                  >
                    Add variant
                  </Button>
                </div>
              </div>

              <div className="space-y-3 border-t border-ink-100 pt-4">
                <h3 className="text-sm font-semibold text-ink-900">Option axes</h3>

                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      aria-label="Option name"
                      placeholder="Size"
                      value={option.name}
                      onChange={(event) =>
                        setOptions((current) =>
                          current.map((entry, position) =>
                            position === index ? { ...entry, name: event.target.value } : entry,
                          ),
                        )
                      }
                    />
                    <Input
                      aria-label="Option values"
                      placeholder="S, M, L"
                      value={option.values.join(', ')}
                      onChange={(event) =>
                        setOptions((current) =>
                          current.map((entry, position) =>
                            position === index
                              ? {
                                  ...entry,
                                  values: event.target.value.split(',').map((value) => value.trim()).filter(Boolean),
                                }
                              : entry,
                          ),
                        )
                      }
                    />
                    <IconButton
                      label="Remove option"
                      onClick={() => setOptions((current) => current.filter((_, position) => position !== index))}
                    >
                      <X className="h-4 w-4" />
                    </IconButton>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => setOptions((current) => [...current, { name: '', values: [] }])}
                  >
                    Add option
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    loading={savingOptions || saveOptions.isPending}
                    onClick={async () => {
                      setSavingOptions(true);
                      try {
                        await saveOptions.mutateAsync({
                          id: productId,
                          options: options.filter((option) => option.name.trim() && option.values.length),
                        });
                      } finally {
                        setSavingOptions(false);
                      }
                    }}
                  >
                    Save options
                  </Button>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="surface space-y-4 p-5">
            <h2 className="text-sm font-semibold text-ink-900">Visibility</h2>

            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-700">Active</span>
              <Switch checked={form.isActive} onChange={(checked) => set('isActive')(checked)} label="Active" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-700">Featured</span>
              <Switch checked={form.isFeatured} onChange={(checked) => set('isFeatured')(checked)} label="Featured" />
            </div>

            <Checkbox
              label="Show in search results"
              description="Hidden products stay reachable by direct link."
              checked={form.isActive}
              onChange={(checked) => set('isActive')(checked)}
            />
          </section>

          {isEdit && product && (
            <section className="surface space-y-2 p-5 text-sm">
              <h2 className="mb-3 text-sm font-semibold text-ink-900">Summary</h2>
              <div className="flex justify-between text-ink-500">
                <span>Slug</span>
                <span className="text-ink-800">{product.slug}</span>
              </div>
              <div className="flex justify-between text-ink-500">
                <span>Sold</span>
                <span className="text-ink-800">{product.soldCount}</span>
              </div>
              <div className="flex justify-between text-ink-500">
                <span>Rating</span>
                <span className="text-ink-800">
                  {product.ratingAvg.toFixed(1)} ({product.ratingCount})
                </span>
              </div>
              <Link
                to={`/products/${product.slug}`}
                className="mt-3 inline-block text-xs font-medium text-brand-700 hover:underline"
              >
                View in storefront →
              </Link>
            </section>
          )}
        </aside>
      </div>
    </form>
  );
};
