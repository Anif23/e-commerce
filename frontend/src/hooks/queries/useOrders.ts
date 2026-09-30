import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { checkoutApi, ordersApi, paymentsApi, type Query } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/queryKeys';
import { getErrorMessage } from '../../lib/api/client';
import type { Address, ApiList, CheckoutPaymentProvider, Order } from '../../types/api';

export const useCheckoutSummary = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.checkoutSummary,
    queryFn: async () => (await checkoutApi.summary()).data.data,
    enabled,
    staleTime: 15_000,
  });

export const usePaymentMethods = () =>
  useQuery({
    queryKey: queryKeys.paymentMethods,
    queryFn: async () => (await paymentsApi.methods()).data.data,
    staleTime: 5 * 60_000,
  });

export interface CheckoutPayload {
  addressId?: number;
  paymentMethod: CheckoutPaymentProvider;
  customerNote?: string;
  address?: Partial<Address> & { save?: boolean };
}

export const useCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckoutPayload) => checkoutApi.place(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Checkout failed')),
  });
};

export const useConfirmPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, payload = {} }: { orderId: number; payload?: Record<string, unknown> }) =>
      paymentsApi.confirm(orderId, payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      if (response.data.success) toast.success(response.data.message);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Payment could not be confirmed')),
  });
};

export const useStartPayment = () =>
  useMutation({
    mutationFn: (orderId: number) => checkoutApi.pay(orderId),
    onError: (error) => toast.error(getErrorMessage(error, 'Could not start the payment')),
  });

export const useOrders = (params: Query = {}) =>
  useQuery<ApiList<Order>>({
    queryKey: queryKeys.orders(params),
    queryFn: async () => (await ordersApi.list(params)).data,
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.data.some((order) => ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED'].includes(order.status))
        ? 30_000
        : false,
  });

export interface OrderStats {
  total: number;
  byStatus: Record<string, number>;
  lifetimeSpend: number;
}

export const useOrderStats = () =>
  useQuery<OrderStats>({
    queryKey: queryKeys.orderStats,
    queryFn: async () => (await ordersApi.stats()).data.data,
  });

export const useOrder = (id?: number) =>
  useQuery({
    queryKey: queryKeys.order(id ?? 0),
    queryFn: async () => (await ordersApi.detail(id!)).data.data,
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data && ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED'].includes(query.state.data.status)
        ? 30_000
        : false,
  });

export const useOrderTracking = (id?: number) =>
  useQuery({
    queryKey: queryKeys.orderTrack(id ?? 0),
    queryFn: async () => (await ordersApi.track(id!)).data.data,
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Poll only while something can still change.
      return status && ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED'].includes(status) ? 30_000 : false;
    },
  });

export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => ordersApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      toast.success('Order cancelled');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not cancel that order')),
  });
};
