/** Shared API DTOs — these mirror the serialisers in the backend. */

export type Role = 'USER' | 'ADMIN';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'EXPIRED';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
export type PaymentProvider = 'COD' | 'PAYPAL' | 'STRIPE' | 'MOCK';

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiList<T> {
  success: boolean;
  data: T[];
  pagination?: Pagination;
}

export interface ApiItem<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  productCount?: number;
  children?: Pick<Category, 'id' | 'name' | 'slug'>[];
  parentId?: number | null;
  parent?: { id: number; name: string } | null;
  createdAt?: string;
}

export interface ProductVariant {
  id: number;
  sku: string;
  price: number;
  stock: number;
  label: string | null;
  combination: Record<string, string>;
  image?: string | null;
}

export interface ProductOption {
  id: number;
  name: string;
  values: string[];
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  sku?: string | null;
  brand?: string | null;
  description?: string | null;
  price: number;
  compareAtPrice: number | null;
  discountPercent: number;
  stock: number;
  lowStock?: number;
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  category?: Pick<Category, 'id' | 'name' | 'slug'> | null;
  images: string[];
  image: string | null;
  variants: ProductVariant[];
  hasVariants: boolean;
  isWishlisted?: boolean;
  options?: ProductOption[];
  reviews?: ProductReview[];
  related?: Product[];
  /** Admin-only extras (full image rows + raw discount fields). */
  imageRows?: { id: number; url: string }[];
  discountType?: string | null;
  discountValue?: number | null;
  discountStart?: string | null;
  discountEnd?: string | null;
  isDeleted?: boolean;
}

export interface ProductFilters {
  categories: { id: number; name: string; slug: string; count: number }[];
  brands: string[];
  price: { min: number; max: number };
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  coupon: { code: string; type: string; value: number; valid: boolean; message: string | null } | null;
}

export interface CartItem {
  id: number;
  productId: number;
  variantId: number | null;
  quantity: number;
  product: Product;
  variant: { id: number; sku: string; label: string | null; stock: number } | null;
  unitPrice: number;
  lineTotal: number;
  availableStock: number;
}

export interface Cart {
  id: number;
  couponCode: string | null;
  items: CartItem[];
  totals: CartTotals;
}

export interface Address {
  id: number;
  label?: string | null;
  fullName: string;
  phone: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  isDefault: boolean;
}

export interface OrderItem {
  id: number;
  productId: number;
  variantId: number | null;
  name: string;
  slug: string | null;
  image: string | null;
  variantLabel: string | null;
  price: number;
  quantity: number;
  total: number;
}

export interface OrderEvent {
  id: number;
  status: OrderStatus;
  message: string;
  actor: string;
  createdAt: string;
}

export interface Order {
  id: number;
  status: OrderStatus;
  placedAt: string;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  expiresAt?: string | null;
  totals: { subtotal: number; discount: number; shipping: number; tax: number; total: number };
  couponCode?: string | null;
  customerNote?: string | null;
  tracking: { number: string | null; carrier: string | null; url: string | null };
  address?: Address | null;
  items: OrderItem[];
  payment: {
    id: number;
    provider: PaymentProvider;
    status: PaymentStatus;
    amount: number;
    reference: string | null;
    payerEmail: string | null;
    updatedAt?: string;
  } | null;
  timeline: OrderEvent[];
  user?: { id: number; username: string; email: string };
}

export interface OrderTracking {
  id: number;
  status: OrderStatus;
  cancelled: boolean;
  placedAt: string;
  deliveredAt?: string | null;
  tracking: { number: string | null; carrier: string | null; url: string | null };
  currentStep: number | null;
  steps: { key: string; label: string; status: OrderStatus; done: boolean }[];
  timeline: OrderEvent[];
}

export interface ProductReview {
  id: number;
  rating: number;
  title?: string | null;
  comment?: string | null;
  isApproved?: boolean;
  isVerifiedPurchase?: boolean;
  createdAt: string;
  user: { id: number; username: string };
  product?: { id: number; name: string; slug: string; image: string | null };
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Coupon {
  id: number;
  code: string;
  description?: string | null;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrder?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  perUserLimit: number;
  usedCount: number;
  isActive: boolean;
  startAt?: string | null;
  endAt?: string | null;
}

export interface Announcement {
  id: number;
  title: string;
  message: string;
  isActive: boolean;
  startAt?: string | null;
  endAt?: string | null;
}

export interface SupportMessage {
  id: number;
  message: string;
  isAdmin: boolean;
  createdAt: string;
  userId?: number | null;
}

export interface SupportTicket {
  id: number;
  subject: string;
  orderId?: number | null;
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  createdAt: string;
  updatedAt: string;
  user?: { id: number; username: string; email: string };
  messages?: SupportMessage[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  createdAt?: string;
  stats?: { orders: number; reviews: number; cartItems: number; wishlistItems: number };
}

export interface PaymentMethod {
  id: PaymentProvider;
  label: string;
  online: boolean;
}

export interface DashboardStats {
  cards: {
    revenue: number;
    orders: number;
    customers: number;
    products: number;
    activeProducts: number;
    categories: number;
    pendingOrders: number;
    outOfStock: number;
    lowStockCount: number;
    revenueThisMonth: number;
    revenueGrowthPercent: number;
    averageOrderValue: number;
  };
  monthlySales: { month: string; orders: number; revenue: number }[];
  ordersByStatus: { status: OrderStatus; count: number }[];
  lowStock: { id: number; name: string; stock: number; lowStock: number; soldCount: number }[];
  topProducts: { id: number; name: string; slug: string | null; image: string | null; units: number; revenue: number }[];
  recentOrders: {
    id: number;
    total: number;
    status: OrderStatus;
    createdAt: string;
    paymentStatus: string | null;
    customer: { id: number; username: string; email: string };
  }[];
}

export interface ReportOverview {
  range: string;
  summary: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    discountsGiven: number;
    newCustomers: number;
    revenueChangePercent: number;
    ordersChangePercent: number;
  };
  series: { date: string; orders: number; revenue: number }[];
  topProducts: { id: number; name: string; slug: string | null; image: string | null; units: number; revenue: number }[];
  categories: { category: string; revenue: number; units: number }[];
  coupons: { code: string; type: string; value: number; uses: number }[];
}

export interface AdminCustomer extends User {
  isBlocked: boolean;
  totalSpent: number;
  _count?: { orders: number; reviews: number };
}

export interface InventoryRow {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  image: string | null;
  category: { id: number; name: string } | null;
  stock: number;
  lowStock: number;
  price: number;
  soldCount: number;
  status: 'HEALTHY' | 'LOW' | 'OUT_OF_STOCK';
  variants: { id: number; sku: string; stock: number; combination: unknown }[];
}

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  priority: number;
}
