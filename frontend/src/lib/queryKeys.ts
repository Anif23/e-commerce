/** Central query-key factory — invalidation stays consistent across features. */
export const queryKeys = {
  products: (params: unknown) => ['products', params] as const,
  product: (idOrSlug: string | number) => ['product', idOrSlug] as const,
  productReviews: (idOrSlug: string | number, params: unknown) => ['product-reviews', idOrSlug, params] as const,
  productFilters: ['product-filters'] as const,
  categories: ['categories'] as const,
  featured: ['featured'] as const,
  announcement: ['announcement'] as const,
  storeSettings: ['store-settings'] as const,

  cart: ['cart'] as const,
  checkoutSummary: ['checkout-summary'] as const,
  paymentMethods: ['payment-methods'] as const,

  wishlist: ['wishlist'] as const,
  addresses: ['addresses'] as const,
  profile: ['profile'] as const,
  notifications: ['notifications'] as const,

  orders: (params: unknown) => ['orders', params] as const,
  order: (id: number) => ['order', id] as const,
  orderTrack: (id: number) => ['order-track', id] as const,
  orderStats: ['order-stats'] as const,

  myReviews: ['my-reviews'] as const,
  reviewEligibility: (productId: number) => ['review-eligibility', productId] as const,

  supportTickets: (params: unknown) => ['support-tickets', params] as const,
  supportTicket: (id: number) => ['support-ticket', id] as const,
  supportFaq: ['support-faq'] as const,

  todos: ['todos'] as const,

  admin: {
    storeSettings: ['admin', 'store-settings'] as const,
    dashboard: ['admin', 'dashboard'] as const,
    activity: ['admin', 'activity'] as const,
    reports: (range: string) => ['admin', 'reports', range] as const,
    inventoryReport: ['admin', 'inventory-report'] as const,
    products: (params: unknown) => ['admin', 'products', params] as const,
    product: (id: number) => ['admin', 'product', id] as const,
    categories: (params: unknown) => ['admin', 'categories', params] as const,
    orders: (params: unknown) => ['admin', 'orders', params] as const,
    order: (id: number) => ['admin', 'order', id] as const,
    orderCounters: ['admin', 'order-counters'] as const,
    customers: (params: unknown) => ['admin', 'customers', params] as const,
    customer: (id: number) => ['admin', 'customer', id] as const,
    inventory: (params: unknown) => ['admin', 'inventory', params] as const,
    stockLogs: (id: number, params: unknown) => ['admin', 'stock-logs', id, params] as const,
    coupons: (params: unknown) => ['admin', 'coupons', params] as const,
    announcements: ['admin', 'announcements'] as const,
    reviews: (params: unknown) => ['admin', 'reviews', params] as const,
    support: (params: unknown) => ['admin', 'support', params] as const,
    supportTicket: (id: number) => ['admin', 'support-ticket', id] as const,
    notifications: ['admin', 'notifications'] as const,
  },
};
