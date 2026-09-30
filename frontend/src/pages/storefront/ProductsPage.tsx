import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Checkbox, Input, Select } from '../../components/ui/Field';
import { Drawer, EmptyState, ErrorState, Pagination } from '../../components/ui';
import { ProductGrid } from '../../components/common/ProductGrid';
import { useProductFilters, useProducts } from '../../hooks/queries/useCatalog';
import { useDebounce } from '../../hooks/useDebounce';
import type { ProductQuery } from '../../hooks/queries/useCatalog';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'best_selling', label: 'Best selling' },
  { value: 'name_asc', label: 'Name: A–Z' },
];

const Filters = ({
  query,
  setParam,
  onClear,
}: {
  query: URLSearchParams;
  setParam: (key: string, value: string | null) => void;
  onClear: () => void;
}) => {
  const { data: filters, isLoading } = useProductFilters();
  const rating = query.get('rating') ?? '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Filters</h2>
        <button type="button" onClick={onClear} className="text-xs font-medium text-brand-700 hover:underline">
          Reset all
        </button>
      </div>

      <section>
        <h3 className="mb-2.5 text-sm font-semibold text-ink-900">Category</h3>
        <div className="space-y-2">
          {isLoading && <div className="h-4 w-24 animate-pulse rounded bg-ink-100" />}
          {(filters?.data?.categories ?? []).map((category) => (
            <Checkbox
              key={category.id}
              label={category.name}
              description={`${category.count} products`}
              checked={query.get('category') === category.slug}
              onChange={(checked) => setParam('category', checked ? category.slug : null)}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2.5 text-sm font-semibold text-ink-900">Price range</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            placeholder="Min"
            aria-label="Minimum price"
            defaultValue={query.get('minPrice') ?? ''}
            onBlur={(event) => setParam('minPrice', event.target.value || null)}
          />
          <span className="text-ink-400">–</span>
          <Input
            type="number"
            min={0}
            placeholder="Max"
            aria-label="Maximum price"
            defaultValue={query.get('maxPrice') ?? ''}
            onBlur={(event) => setParam('maxPrice', event.target.value || null)}
          />
        </div>
      </section>

      {(filters?.data?.brands ?? []).length > 0 && (
        <section>
          <h3 className="mb-2.5 text-sm font-semibold text-ink-900">Brand</h3>
          <Select
            placeholder="All brands"
            value={query.get('brand') ?? ''}
            onChange={(event) => setParam('brand', event.target.value || null)}
            options={(filters?.data?.brands ?? []).map((brand) => ({ value: brand, label: brand }))}
          />
        </section>
      )}

      <section>
        <h3 className="mb-2.5 text-sm font-semibold text-ink-900">Rating</h3>
        <div className="space-y-2">
          {[4, 3, 2].map((value) => (
            <Checkbox
              key={value}
              label={`${value} stars & above`}
              checked={rating === String(value)}
              onChange={(checked) => setParam('rating', checked ? String(value) : null)}
            />
          ))}
        </div>
      </section>

      <section>
        <Checkbox
          label="In stock only"
          checked={query.get('inStock') === 'true'}
          onChange={(checked) => setParam('inStock', checked ? 'true' : null)}
        />
        <Checkbox
          className="mt-2"
          label="Featured only"
          checked={query.get('featured') === 'true'}
          onChange={(checked) => setParam('featured', checked ? 'true' : null)}
        />
      </section>
    </div>
  );
};

export const ProductsPage = () => {
  const [query, setQuery] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const params: ProductQuery = {
    page: Number(query.get('page') ?? 1),
    search: query.get('search') ?? undefined,
    category: query.get('category') ?? undefined,
    brand: query.get('brand') ?? undefined,
    minPrice: query.get('minPrice') ? Number(query.get('minPrice')) : undefined,
    maxPrice: query.get('maxPrice') ? Number(query.get('maxPrice')) : undefined,
    rating: query.get('rating') ? Number(query.get('rating')) : undefined,
    inStock: query.get('inStock') === 'true' ? true : undefined,
    featured: query.get('featured') === 'true' ? true : undefined,
    sort: query.get('sort') ?? 'newest',
  };

  const { data, isLoading, isError, refetch, isPlaceholderData } = useProducts(params);
  const debouncedSearch = useDebounce(params.search ?? '', 300);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(query);

    if (value === null || value === '') next.delete(key);
    else next.set(key, value);

    // Any filter change resets pagination.
    if (key !== 'page') next.delete('page');

    setQuery(next, { replace: true });
  };

  const clearAll = () => setQuery(new URLSearchParams(), { replace: true });

  const products = data?.data ?? [];
  const pagination = data?.pagination;
  const activeFilters = ['category', 'brand', 'minPrice', 'maxPrice', 'rating', 'inStock', 'featured'].filter((key) =>
    query.get(key),
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          {params.search ? `Results for “${debouncedSearch}”` : 'All products'}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {pagination ? `${pagination.total} product${pagination.total === 1 ? '' : 's'} available` : 'Loading…'}
          {activeFilters > 0 && ` · ${activeFilters} filter${activeFilters === 1 ? '' : 's'} applied`}
        </p>
      </header>

      <div className="flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="surface sticky top-24 p-5">
            <Filters query={query} setParam={setParam} onClear={clearAll} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              leftIcon={<SlidersHorizontal className="h-4 w-4" />}
              onClick={() => setFiltersOpen(true)}
            >
              Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
            </Button>

            <div className="ml-auto w-48">
              <Select
                aria-label="Sort products"
                value={params.sort ?? 'newest'}
                onChange={(event) => setParam('sort', event.target.value)}
                options={SORTS}
              />
            </div>
          </div>

          {isError ? (
            <ErrorState message="We could not load these products." onRetry={() => refetch()} />
          ) : products.length === 0 && !isLoading ? (
            <EmptyState
              title="No matches"
              description="Try loosening a filter or searching for something else."
              action={
                <Button variant="outline" onClick={clearAll}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                <ProductGrid products={products} loading={isLoading} />
              </div>

              {pagination && (
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  onChange={(page) => setParam('page', String(page))}
                />
              )}
            </>
          )}
        </div>
      </div>

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        side="left"
        title="Filters"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={clearAll}>
              Reset
            </Button>
            <Button fullWidth onClick={() => setFiltersOpen(false)}>
              Show results
            </Button>
          </div>
        }
      >
        <Filters query={query} setParam={setParam} onClear={clearAll} />
      </Drawer>
    </div>
  );
};
