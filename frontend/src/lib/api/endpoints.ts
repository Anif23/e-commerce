import { api } from './client';
import type {
  Address,
  AdminCustomer,
  AdminPayment,
  Announcement,
  ApiItem,
  ApiList,
  Cart,
  Category,
  Coupon,
  CheckoutPaymentProvider,
  DashboardStats,
  InventoryRow,
  Notification,
  Order,
  Pagination,
  OrderStatus,
  OrderTracking,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  PaymentStats,
  Product,
  ProductFilters,
  StoreSettings,
  ProductReview,
  ReportOverview,
  SupportTicket,
  Todo,
  User,
} from '../../types/api';

/**
 * Typed endpoint layer. Components and hooks never build URLs by hand, which
 * keeps call sites readable and makes API changes a single-file edit.
 */

export type Query = Record<string, string | number | boolean | string[] | undefined | null>;

const qs = (params: Query = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));

export const storeApi = {
  settings: () => api.get<ApiItem<StoreSettings>>('/store/settings'),
};

export const authApi = {
  register: (payload: { username: string; email: string; password: string }) =>
    api.post<ApiItem<{ user: User; token: string; expiresIn: number }>>('/auth/register', payload),
  login: (payload: { email?: string; username?: string; password: string }) =>
    api.post<ApiItem<{ user: User; token: string; expiresIn: number }>>('/auth/login', payload),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<ApiItem<User>>('/auth/me'),
};

export const catalogApi = {
  products: (params: Query = {}) => api.get<ApiList<Product>>('/products', { params: qs(params) }),
  filters: () => api.get<ApiItem<ProductFilters>>('/products/filters'),
  featured: (limit = 8) => api.get<ApiItem<{ featured: Product[]; newest: Product[]; bestSellers: Product[] }>>('/products/featured', { params: { limit } }),
  product: (idOrSlug: string | number) => api.get<ApiItem<Product>>(`/products/${idOrSlug}`),
  reviews: (idOrSlug: string | number, params: Query = {}) =>
    api.get<{
      success: boolean;
      data: ProductReview[];
      distribution: { rating: number; count: number }[];
      pagination?: Pagination;
    }>(
      `/products/${idOrSlug}/reviews`,
      { params: qs(params) },
    ),
  categories: () => api.get<ApiList<Category>>('/categories'),
};

export const cartApi = {
  get: () => api.get<ApiItem<Cart>>('/cart'),
  addItem: (payload: { productId: number; variantId?: number | null; quantity: number }) =>
    api.post<ApiItem<Cart>>('/cart/items', payload),
  updateItem: (id: number, quantity: number) => api.patch<ApiItem<Cart>>(`/cart/items/${id}`, { quantity }),
  removeItem: (id: number) => api.delete<ApiItem<Cart>>(`/cart/items/${id}`),
  clear: () => api.delete<ApiItem<Cart>>('/cart'),
  validate: () =>
    api.post<{
      success: boolean;
      data: {
        valid: boolean;
        issues: { itemId: number; type: 'OUT_OF_STOCK' | 'REDUCED'; name: string; available: number; requested?: number }[];
      };
    }>('/cart/validate'),
  applyCoupon: (code: string) => api.post<ApiItem<Cart>>('/cart/coupon', { code }),
  removeCoupon: () => api.delete<ApiItem<Cart>>('/cart/coupon'),
  merge: (items: { productId: number; quantity: number }[]) => api.post('/cart/merge', { items }),
};

export const wishlistApi = {
  list: () => api.get<ApiList<{ id: number; addedAt: string; product: Product }>>('/wishlist'),
  toggle: (productId: number) => api.post<{ success: boolean; wishlisted: boolean; message: string }>(`/wishlist/${productId}`),
  remove: (productId: number) => api.delete(`/wishlist/${productId}`),
  clear: () => api.delete('/wishlist'),
  merge: (items: { productId: number }[]) => api.post('/wishlist/merge', { items }),
};

export const addressApi = {
  list: () => api.get<ApiList<Address>>('/addresses'),
  create: (payload: Partial<Address>) => api.post<ApiItem<Address>>('/addresses', payload),
  update: (id: number, payload: Partial<Address>) => api.put<ApiItem<Address>>(`/addresses/${id}`, payload),
  remove: (id: number) => api.delete(`/addresses/${id}`),
  setDefault: (id: number) => api.patch<ApiItem<Address>>(`/addresses/${id}/default`),
};

export const checkoutApi = {
  summary: () =>
    api.get<ApiItem<{ cart: Cart; addresses: Address[]; paymentMethods: PaymentMethod[]; shipping: { fee: number; freeShippingThreshold: number; taxRatePercent: number; taxName: string; paymentWindowMinutes: number } }>>(
      '/checkout/summary',
    ),
  place: (payload: { addressId?: number; paymentMethod: CheckoutPaymentProvider; customerNote?: string; address?: Partial<Address> & { save?: boolean } }) =>
    api.post<{ success: boolean; message: string; data: { order: Order; payment: { provider: PaymentProvider; status: string; [key: string]: unknown }; paymentStartFailed?: boolean } }>(
      '/checkout',
      payload,
    ),
  pay: (orderId: number) => api.post<{ success: boolean; data: { provider: PaymentProvider; status: string; [key: string]: unknown } }>(`/checkout/${orderId}/pay`),
};

export const paymentsApi = {
  methods: () => api.get<ApiList<PaymentMethod>>('/payments/methods'),
  confirm: (orderId: number, payload: Record<string, unknown> = {}) =>
    api.post<{ success: boolean; message: string; data: { order: Order; paymentPending?: boolean; paymentLate?: boolean } }>('/payments/confirm', { orderId, payload }),
  fail: (orderId: number) => api.post(`/payments/${orderId}/fail`),
};

export const ordersApi = {
  list: (params: Query = {}) => api.get<ApiList<Order>>('/orders', { params: qs(params) }),
  stats: () => api.get<ApiItem<{ total: number; byStatus: Record<string, number>; lifetimeSpend: number }>>('/orders/stats/summary'),
  detail: (id: number) => api.get<ApiItem<Order>>(`/orders/${id}`),
  track: (id: number) => api.get<ApiItem<OrderTracking>>(`/orders/${id}/track`),
  cancel: (id: number, reason?: string) => api.post<ApiItem<Order>>(`/orders/${id}/cancel`, { reason }),
};

export const reviewsApi = {
  mine: () => api.get<ApiList<ProductReview>>('/reviews/me'),
  eligibility: (productId: number) =>
    api.get<ApiItem<{ canReview: boolean; hasReviewed: boolean; review: ProductReview | null }>>(`/reviews/eligibility/${productId}`),
  create: (payload: { productId: number; rating: number; title?: string; comment?: string }) =>
    api.post<ApiItem<ProductReview>>('/reviews', payload),
  update: (id: number, payload: { rating?: number; title?: string; comment?: string }) =>
    api.patch<ApiItem<ProductReview>>(`/reviews/${id}`, payload),
  remove: (id: number) => api.delete(`/reviews/${id}`),
};

export const notificationsApi = {
  list: () => api.get<{ success: boolean; data: Notification[]; unread: number }>('/notifications'),
  markRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  remove: (id: number) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications'),
};

export const supportApi = {
  faq: () => api.get<ApiList<{ question: string; answer: string }>>('/support/faq'),
  list: (params: Query = {}) => api.get<ApiList<SupportTicket>>('/support/tickets', { params: qs(params) }),
  create: (payload: { subject: string; message: string; orderId?: number; priority?: string }) =>
    api.post<ApiItem<SupportTicket>>('/support/tickets', payload),
  detail: (id: number) => api.get<ApiItem<SupportTicket>>(`/support/tickets/${id}`),
  reply: (id: number, message: string) => api.post<ApiItem<SupportTicket>>(`/support/tickets/${id}/messages`, { message }),
  close: (id: number) => api.post(`/support/tickets/${id}/close`),
};

export const couponsApi = {
  validate: (code: string, subtotal: number) =>
    api.post<ApiItem<{ code: string; type: string; value: number; discount: number }>>('/coupons/validate', { code, subtotal }),
};

export const profileApi = {
  get: () => api.get<ApiItem<User>>('/profile'),
  update: (payload: { username?: string; email?: string }) => api.patch<ApiItem<User>>('/profile', payload),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    api.put('/profile/password', payload),
};

export const todosApi = {
  list: () => api.get<ApiList<Todo>>('/todos'),
  create: (payload: { title: string; priority?: number }) => api.post<ApiItem<Todo>>('/todos', payload),
  update: (id: number, payload: Partial<Todo>) => api.put<ApiItem<Todo>>(`/todos/${id}`, payload),
  remove: (id: number) => api.delete(`/todos/${id}`),
};

export const announcementsApi = {
  active: () => api.get<ApiList<Announcement>>('/announcements/active'),
};

/* ------------------------------- admin API ------------------------------- */

export const adminApi = {
  storeSettings: () => api.get<ApiItem<StoreSettings>>('/admin/settings'),
  updateStoreSettings: (payload: Partial<StoreSettings>) =>
    api.put<ApiItem<StoreSettings>>('/admin/settings', payload),
  uploadStoreLogo: (file: File) => {
    const form = new FormData();
    form.append('logo', file);
    return api.post<ApiItem<StoreSettings>>('/admin/settings/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  dashboard: () => api.get<ApiItem<DashboardStats>>('/admin/dashboard'),
  activity: () => api.get<ApiList<Notification>>('/admin/dashboard/activity'),

  reports: (range: string) => api.get<ApiItem<ReportOverview>>('/admin/reports', { params: { range } }),
  inventoryReport: () =>
    api.get<ApiItem<{ valuation: number; outOfStock: number; lowStock: number; products: InventoryRow[] }>>(
      '/admin/reports/inventory',
    ),
  /** Streams a downloadable sales report (csv|pdf) for a preset range or from/to window. */
  exportReport: (params: Query) => api.get<Blob>('/admin/reports/export', { params: qs(params), responseType: 'blob' }),

  payments: (params: Query = {}) => api.get<ApiList<AdminPayment>>('/admin/payments', { params: qs(params) }),
  paymentStats: (params: Query = {}) => api.get<ApiItem<PaymentStats>>('/admin/payments/stats', { params: qs(params) }),

  products: (params: Query = {}) => api.get<ApiList<Product>>('/admin/products', { params: qs(params) }),
  product: (id: number) => api.get<ApiItem<Product>>(`/admin/products/${id}`),
  createProduct: (form: FormData) => api.post<ApiItem<Product>>('/admin/products', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateProduct: (id: number, form: FormData) =>
    api.put<ApiItem<Product>>(`/admin/products/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteProduct: (id: number) => api.delete(`/admin/products/${id}`),
  restoreProduct: (id: number) => api.post(`/admin/products/${id}/restore`),
  adjustStock: (id: number, payload: { change: number; reason?: string; variantId?: number | null }) =>
    api.patch<ApiItem<{ productId: number; stock: number }>>(`/admin/products/${id}/stock`, payload),
  createVariant: (id: number, payload: Record<string, unknown>) => api.post(`/admin/products/${id}/variants`, payload),
  updateVariant: (id: number, variantId: number, payload: Record<string, unknown>) =>
    api.put(`/admin/products/${id}/variants/${variantId}`, payload),
  deleteVariant: (id: number, variantId: number) => api.delete(`/admin/products/${id}/variants/${variantId}`),
  setOptions: (id: number, options: { name: string; values: string[] }[]) => api.post(`/admin/products/${id}/options`, { options }),

  categories: (params: Query = {}) => api.get<ApiList<Category>>('/admin/categories', { params: qs(params) }),
  createCategory: (form: FormData) => api.post('/admin/categories', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateCategory: (id: number, form: FormData) =>
    api.put(`/admin/categories/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteCategory: (id: number) => api.delete(`/admin/categories/${id}`),

  orders: (params: Query = {}) => api.get<ApiList<Order>>('/admin/orders', { params: qs(params) }),
  order: (id: number) => api.get<ApiItem<Order>>(`/admin/orders/${id}`),
  updateOrderStatus: (
    id: number,
    payload: { status: OrderStatus; trackingNumber?: string; trackingCarrier?: string; note?: string },
  ) => api.patch<ApiItem<Order>>(`/admin/orders/${id}/status`, payload),
  updatePaymentStatus: (id: number, status: PaymentStatus) => api.patch<ApiItem<Order>>(`/admin/orders/${id}/payment`, { status }),
  orderCounters: () => api.get<ApiItem<{ counters: Record<string, number>; today: { orders: number; revenue: number } }>>('/admin/orders/stats/counters'),

  customers: (params: Query = {}) => api.get<ApiList<AdminCustomer>>('/admin/customers', { params: qs(params) }),
  customer: (id: number) => api.get<ApiItem<AdminCustomer>>(`/admin/customers/${id}`),
  setCustomerRole: (id: number, role: 'USER' | 'ADMIN') => api.patch(`/admin/customers/${id}/role`, { role }),
  setCustomerBlocked: (id: number, isBlocked: boolean) => api.patch(`/admin/customers/${id}/block`, { isBlocked }),

  inventory: (params: Query = {}) => api.get<ApiList<InventoryRow>>('/admin/inventory', { params: qs(params) }),
  adjustInventory: (id: number, payload: { change: number; reason?: string; variantId?: number | null }) =>
    api.patch<ApiItem<{ productId: number; stock: number }>>(`/admin/inventory/${id}`, payload),
  stockLogs: (id: number, params: Query = {}) =>
    api.get<ApiList<{ id: number; change: number; reason: string; createdAt: string }>>(`/admin/inventory/${id}/logs`, { params: qs(params) }),

  coupons: (params: Query = {}) => api.get<ApiList<Coupon>>('/admin/coupons', { params: qs(params) }),
  createCoupon: (payload: Partial<Coupon>) => api.post<ApiItem<Coupon>>('/admin/coupons', payload),
  updateCoupon: (id: number, payload: Partial<Coupon>) => api.put<ApiItem<Coupon>>(`/admin/coupons/${id}`, payload),
  deleteCoupon: (id: number) => api.delete(`/admin/coupons/${id}`),

  announcements: () => api.get<ApiList<Announcement>>('/admin/announcements'),
  createAnnouncement: (payload: Partial<Announcement>) => api.post<ApiItem<Announcement>>('/admin/announcements', payload),
  updateAnnouncement: (id: number, payload: Partial<Announcement>) => api.put<ApiItem<Announcement>>(`/admin/announcements/${id}`, payload),
  deleteAnnouncement: (id: number) => api.delete(`/admin/announcements/${id}`),
  sendAnnouncement: (id: number) => api.post<{ success: boolean; message: string }>(`/admin/announcements/${id}/send`),

  reviews: (params: Query = {}) => api.get<ApiList<ProductReview & { product: { id: number; name: string } }>>('/admin/reviews', { params: qs(params) }),
  moderateReview: (id: number, isApproved: boolean) => api.patch(`/admin/reviews/${id}/moderate`, { isApproved }),
  deleteReview: (id: number) => api.delete(`/admin/reviews/${id}`),

  support: (params: Query = {}) => api.get<ApiList<SupportTicket>>('/admin/support', { params: qs(params) }),
  supportUnread: () => api.get<ApiItem<{ unread: number }>>('/admin/support/unread'),
  supportTicket: (id: number) => api.get<ApiItem<SupportTicket>>(`/admin/support/${id}`),
  replySupport: (id: number, message: string) => api.post<ApiItem<SupportTicket>>(`/admin/support/${id}/messages`, { message }),
  updateSupportStatus: (id: number, status: string) => api.patch(`/admin/support/${id}/status`, { status }),

  notifications: () => api.get<{ success: boolean; data: Notification[]; unread: number }>('/admin/notifications'),
  markNotificationRead: (id: number) => api.put(`/admin/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/admin/notifications/read-all'),
  deleteNotification: (id: number) => api.delete(`/admin/notifications/${id}`),
  clearNotifications: () => api.delete('/admin/notifications'),
};
