import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { adminApi, type Query } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/queryKeys';
import { getErrorMessage } from '../../lib/api/client';
import type {
  AdminCustomer,
  Announcement,
  ApiList,
  Category,
  Coupon,
  DashboardStats,
  InventoryRow,
  Notification,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  ProductReview,
  SupportTicket,
} from '../../types/api';

/* ------------------------------- dashboard ------------------------------- */

export const useAdminDashboard = () =>
  useQuery<DashboardStats>({
    queryKey: queryKeys.admin.dashboard,
    queryFn: async () => (await adminApi.dashboard()).data.data,
    staleTime: 30_000,
  });

export const useAdminActivity = () =>
  useQuery<Notification[]>({
    queryKey: queryKeys.admin.activity,
    queryFn: async () => (await adminApi.activity()).data.data,
  });

export const useAdminReports = (range: string) =>
  useQuery({
    queryKey: queryKeys.admin.reports(range),
    queryFn: async () => (await adminApi.reports(range)).data.data,
    placeholderData: keepPreviousData,
  });

export const useInventoryReport = () =>
  useQuery({
    queryKey: queryKeys.admin.inventoryReport,
    queryFn: async () => (await adminApi.inventoryReport()).data.data,
  });

/* -------------------------------- products -------------------------------- */

export const useAdminProducts = (params: Query = {}) =>
  useQuery<ApiList<Product>>({
    queryKey: queryKeys.admin.products(params),
    queryFn: async () => (await adminApi.products(params)).data,
    placeholderData: keepPreviousData,
  });

export const useAdminProduct = (id?: number) =>
  useQuery({
    queryKey: queryKeys.admin.product(id ?? 0),
    queryFn: async () => (await adminApi.product(id!)).data.data,
    enabled: Boolean(id),
  });

export const useAdminCategories = (params: Query = {}) =>
  useQuery<ApiList<Category>>({
    queryKey: queryKeys.admin.categories(params),
    queryFn: async () => (await adminApi.categories(params)).data,
  });

export const useAdminCustomers = (params: Query = {}) =>
  useQuery<ApiList<AdminCustomer>>({
    queryKey: queryKeys.admin.customers(params),
    queryFn: async () => (await adminApi.customers(params)).data,
    placeholderData: keepPreviousData,
  });

export const useAdminCustomer = (id?: number) =>
  useQuery({
    queryKey: queryKeys.admin.customer(id ?? 0),
    queryFn: async () => (await adminApi.customer(id!)).data.data,
    enabled: Boolean(id),
  });

/* --------------------------------- orders -------------------------------- */

export const useAdminOrders = (params: Query = {}) =>
  useQuery<ApiList<Order>>({
    queryKey: queryKeys.admin.orders(params),
    queryFn: async () => (await adminApi.orders(params)).data,
    placeholderData: keepPreviousData,
  });

export const useAdminOrder = (id?: number) =>
  useQuery({
    queryKey: queryKeys.admin.order(id ?? 0),
    queryFn: async () => (await adminApi.order(id!)).data.data,
    enabled: Boolean(id),
  });

export const useOrderCounters = () =>
  useQuery({
    queryKey: queryKeys.admin.orderCounters,
    queryFn: async () => (await adminApi.orderCounters()).data.data,
    staleTime: 30_000,
  });

/* -------------------------------- mutations ------------------------------ */

export type AdminReview = ProductReview & { product: { id: number; name: string; slug?: string } };

const useInvalidate = () => {
  const queryClient = useQueryClient();
  return (...keys: QueryKey[]) => keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
};

export const useAdminProductMutations = () => {
  const invalidate = useInvalidate();

  const create = useMutation({
    mutationFn: (form: FormData) => adminApi.createProduct(form),
    onSuccess: () => {
      invalidate(queryKeys.admin.products({}), queryKeys.admin.dashboard);
      toast.success('Product created');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not create that product')),
  });

  const update = useMutation({
    mutationFn: ({ id, form }: { id: number; form: FormData }) => adminApi.updateProduct(id, form),
    onSuccess: () => {
      invalidate(queryKeys.admin.products({}), queryKeys.admin.dashboard);
      toast.success('Product updated');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update that product')),
  });

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteProduct(id),
    onSuccess: () => {
      invalidate(queryKeys.admin.products({}), queryKeys.admin.dashboard);
      toast.success('Product deleted');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete that product')),
  });

  const restore = useMutation({
    mutationFn: (id: number) => adminApi.restoreProduct(id),
    onSuccess: () => {
      invalidate(queryKeys.admin.products({}));
      toast.success('Product restored');
    },
  });

  const adjustStock = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { change: number; reason?: string; variantId?: number | null } }) =>
      adminApi.adjustStock(id, payload),
    onSuccess: () => {
      invalidate(queryKeys.admin.products({}), queryKeys.admin.inventory({}), queryKeys.admin.dashboard);
      toast.success('Stock updated');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not adjust stock')),
  });

  const createVariant = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      adminApi.createVariant(id, payload),
    onSuccess: () => {
      invalidate(queryKeys.admin.products({}));
      toast.success('Variant added');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not add that variant')),
  });

  const updateVariant = useMutation({
    mutationFn: ({ id, variantId, payload }: { id: number; variantId: number; payload: Record<string, unknown> }) =>
      adminApi.updateVariant(id, variantId, payload),
    onSuccess: () => {
      invalidate(queryKeys.admin.products({}));
      toast.success('Variant updated');
    },
  });

  const deleteVariant = useMutation({
    mutationFn: ({ id, variantId }: { id: number; variantId: number }) => adminApi.deleteVariant(id, variantId),
    onSuccess: () => {
      invalidate(queryKeys.admin.products({}));
      toast.success('Variant removed');
    },
  });

  const setOptions = useMutation({
    mutationFn: ({ id, options }: { id: number; options: { name: string; values: string[] }[] }) =>
      adminApi.setOptions(id, options),
    onSuccess: () => {
      invalidate(queryKeys.admin.products({}));
      toast.success('Options saved');
    },
  });

  return { create, update, remove, restore, adjustStock, createVariant, updateVariant, deleteVariant, setOptions };
};

export const useAdminCategoryMutations = () => {
  const invalidate = useInvalidate();

  const create = useMutation({
    mutationFn: (form: FormData) => adminApi.createCategory(form),
    onSuccess: () => {
      invalidate(queryKeys.admin.categories({}), queryKeys.categories, queryKeys.admin.dashboard);
      toast.success('Category created');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not create that category')),
  });

  const update = useMutation({
    mutationFn: ({ id, form }: { id: number; form: FormData }) => adminApi.updateCategory(id, form),
    onSuccess: () => {
      invalidate(queryKeys.admin.categories({}), queryKeys.categories);
      toast.success('Category updated');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update that category')),
  });

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteCategory(id),
    onSuccess: () => {
      invalidate(queryKeys.admin.categories({}), queryKeys.categories);
      toast.success('Category deleted');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete that category')),
  });

  return { create, update, remove };
};

export const useAdminOrderMutations = () => {
  const invalidate = useInvalidate();

  const updateStatus = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: { status: OrderStatus; trackingNumber?: string; trackingCarrier?: string; note?: string };
    }) => adminApi.updateOrderStatus(id, payload),
    onSuccess: () => {
      invalidate(queryKeys.admin.orders({}), queryKeys.admin.dashboard, queryKeys.admin.orderCounters);
      toast.success('Order updated');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update that order')),
  });

  const updatePayment = useMutation({
    mutationFn: ({ id, status }: { id: number; status: PaymentStatus }) => adminApi.updatePaymentStatus(id, status),
    onSuccess: () => {
      invalidate(queryKeys.admin.orders({}), queryKeys.admin.dashboard);
      toast.success('Payment updated');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update the payment')),
  });

  return { updateStatus, updatePayment };
};

export const useAdminCustomerMutations = () => {
  const invalidate = useInvalidate();

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: 'USER' | 'ADMIN' }) => adminApi.setCustomerRole(id, role),
    onSuccess: () => {
      invalidate(queryKeys.admin.customers({}));
      toast.success('Role updated');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not change that role')),
  });

  const setBlocked = useMutation({
    mutationFn: ({ id, isBlocked }: { id: number; isBlocked: boolean }) => adminApi.setCustomerBlocked(id, isBlocked),
    onSuccess: () => {
      invalidate(queryKeys.admin.customers({}));
      toast.success('Account updated');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update that account')),
  });

  return { setRole, setBlocked };
};

export const useAdminInventory = (params: Query = {}) =>
  useQuery<ApiList<InventoryRow>>({
    queryKey: queryKeys.admin.inventory(params),
    queryFn: async () => (await adminApi.inventory(params)).data,
    placeholderData: keepPreviousData,
  });

export const useStockLogs = (id?: number) =>
  useQuery({
    queryKey: queryKeys.admin.stockLogs(id ?? 0, {}),
    queryFn: async () => (await adminApi.stockLogs(id!)).data.data,
    enabled: Boolean(id),
  });

export const useAdjustInventory = () => {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { change: number; reason?: string; variantId?: number | null } }) =>
      adminApi.adjustInventory(id, payload),
    onSuccess: () => {
      invalidate(queryKeys.admin.inventory({}), queryKeys.admin.inventoryReport, queryKeys.admin.dashboard);
      toast.success('Stock updated');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not adjust stock')),
  });
};

export const useAdminCoupons = (params: Query = {}) =>
  useQuery<ApiList<Coupon>>({
    queryKey: queryKeys.admin.coupons(params),
    queryFn: async () => (await adminApi.coupons(params)).data,
  });

export const useAdminCouponMutations = () => {
  const invalidate = useInvalidate();

  const create = useMutation({
    mutationFn: (payload: Query) => adminApi.createCoupon(payload),
    onSuccess: () => {
      invalidate(queryKeys.admin.coupons({}));
      toast.success('Coupon created');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not create that coupon')),
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Query }) => adminApi.updateCoupon(id, payload),
    onSuccess: () => {
      invalidate(queryKeys.admin.coupons({}));
      toast.success('Coupon updated');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update that coupon')),
  });

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteCoupon(id),
    onSuccess: () => {
      invalidate(queryKeys.admin.coupons({}));
      toast.success('Coupon deleted');
    },
  });

  return { create, update, remove };
};

export const useAdminAnnouncements = () =>
  useQuery<Announcement[]>({
    queryKey: queryKeys.admin.announcements,
    queryFn: async () => (await adminApi.announcements()).data.data,
  });

export const useAdminAnnouncementMutations = () => {
  const invalidate = useInvalidate();

  const create = useMutation({
    mutationFn: (payload: Query) => adminApi.createAnnouncement(payload),
    onSuccess: () => {
      invalidate(queryKeys.admin.announcements, queryKeys.announcement);
      toast.success('Announcement created');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not create that announcement')),
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Query }) =>
      adminApi.updateAnnouncement(id, payload),
    onSuccess: () => {
      invalidate(queryKeys.admin.announcements, queryKeys.announcement);
      toast.success('Announcement updated');
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteAnnouncement(id),
    onSuccess: () => {
      invalidate(queryKeys.admin.announcements, queryKeys.announcement);
      toast.success('Announcement deleted');
    },
  });

  const send = useMutation({
    mutationFn: (id: number) => adminApi.sendAnnouncement(id),
    onSuccess: (response) => toast.success(response.data.message),
    onError: (error) => toast.error(getErrorMessage(error, 'Could not send that announcement')),
  });

  return { create, update, remove, send };
};

export const useAdminReviews = (params: Query = {}) =>
  useQuery<ApiList<AdminReview>>({
    queryKey: queryKeys.admin.reviews(params),
    queryFn: async () => (await adminApi.reviews(params)).data,
  });

export const useAdminReviewMutations = () => {
  const invalidate = useInvalidate();

  const moderate = useMutation({
    mutationFn: ({ id, isApproved }: { id: number; isApproved: boolean }) => adminApi.moderateReview(id, isApproved),
    onSuccess: () => {
      invalidate(queryKeys.admin.reviews({}));
      toast.success('Review updated');
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteReview(id),
    onSuccess: () => {
      invalidate(queryKeys.admin.reviews({}));
      toast.success('Review deleted');
    },
  });

  return { moderate, remove };
};

export const useAdminSupport = (params: Query = {}) =>
  useQuery<ApiList<SupportTicket>>({
    queryKey: queryKeys.admin.support(params),
    queryFn: async () => (await adminApi.support(params)).data,
  });

export const useAdminSupportTicket = (id?: number) =>
  useQuery({
    queryKey: queryKeys.admin.supportTicket(id ?? 0),
    queryFn: async () => (await adminApi.supportTicket(id!)).data.data,
    enabled: Boolean(id),
  });

export const useAdminSupportMutations = () => {
  const invalidate = useInvalidate();

  const reply = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) => adminApi.replySupport(id, message),
    onSuccess: () => {
      invalidate(queryKeys.admin.support({}));
      toast.success('Reply sent');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not send that reply')),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adminApi.updateSupportStatus(id, status),
    onSuccess: () => {
      invalidate(queryKeys.admin.support({}));
      toast.success('Ticket updated');
    },
  });

  return { reply, updateStatus };
};

export const useAdminNotifications = () =>
  useQuery<{ notifications: Notification[]; unread: number }>({
    queryKey: queryKeys.admin.notifications,
    queryFn: async () => {
      const response = await adminApi.notifications();
      return { notifications: response.data.data, unread: response.data.unread };
    },
    staleTime: 15_000,
  });

export const useAdminNotificationMutations = () => {
  const invalidate = useInvalidate();

  const markRead = useMutation({
    mutationFn: (id: number) => adminApi.markNotificationRead(id),
    onSuccess: () => invalidate(queryKeys.admin.notifications),
  });

  const markAllRead = useMutation({
    mutationFn: () => adminApi.markAllNotificationsRead(),
    onSuccess: () => invalidate(queryKeys.admin.notifications),
  });

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteNotification(id),
    onSuccess: () => invalidate(queryKeys.admin.notifications),
  });

  const clearAll = useMutation({
    mutationFn: () => adminApi.clearNotifications(),
    onSuccess: () => invalidate(queryKeys.admin.notifications),
  });

  return { markRead, markAllRead, remove, clearAll };
};
