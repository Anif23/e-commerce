import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { catalogApi, announcementsApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/queryKeys';
import { useDebounce } from '../useDebounce';

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string | number;
  categories?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  featured?: boolean;
  sort?: string;
  tags?: string;
}

export const useProducts = (params: ProductQuery) => {
  const search = useDebounce(params.search ?? '', 300);

  return useQuery({
    queryKey: queryKeys.products({ ...params, search }),
    queryFn: async () => (await catalogApi.products({ ...params, search })).data,
    placeholderData: keepPreviousData,
  });
};

export const useProductFilters = () =>
  useQuery({
    queryKey: queryKeys.productFilters,
    queryFn: async () => (await catalogApi.filters()).data,
    staleTime: 5 * 60_000,
  });

export const useCategories = () =>
  useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => (await catalogApi.categories()).data.data,
    staleTime: 5 * 60_000,
  });

export const useFeaturedProducts = () =>
  useQuery({
    queryKey: queryKeys.featured,
    queryFn: async () => (await catalogApi.featured(8)).data.data,
    staleTime: 60_000,
  });

export const useProduct = (idOrSlug?: string | number) =>
  useQuery({
    queryKey: queryKeys.product(idOrSlug ?? ''),
    queryFn: async () => (await catalogApi.product(idOrSlug!)).data.data,
    enabled: Boolean(idOrSlug),
  });

export const useProductReviews = (idOrSlug?: string | number, page = 1) =>
  useQuery({
    queryKey: queryKeys.productReviews(idOrSlug ?? '', page),
    queryFn: async () => await catalogApi.reviews(idOrSlug!, { page, limit: 10 }),
    enabled: Boolean(idOrSlug),
    placeholderData: keepPreviousData,
  });

export const useAnnouncement = () =>
  useQuery({
    queryKey: queryKeys.announcement,
    queryFn: async () => (await announcementsApi.active()).data.data,
    staleTime: 60_000,
  });
