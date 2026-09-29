import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { cartApi, wishlistApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/queryKeys';
import { getErrorMessage } from '../../lib/api/client';
import { useAuthStore } from '../../store/authStore';
import { useGuestStore } from '../../store/guestStore';
import { round2 } from '../../lib/money';
import type { Cart, Product } from '../../types/api';

export interface UnifiedCartItem {
  key: string;
  id: number | null;
  productId: number;
  variantId: number | null;
  quantity: number;
  product: Product;
  variant: { id: number; sku: string; label: string | null; stock: number } | null;
  unitPrice: number;
  lineTotal: number;
  availableStock: number;
}

export interface UnifiedCart {
  isGuest: boolean;
  isLoading: boolean;
  items: UnifiedCartItem[];
  count: number;
  subtotal: number;
  couponCode: string | null;
  totals: Cart['totals'] | null;
  couponMessage: string | null;
}

const priceOf = (product: Product, variantId: number | null) => {
  const variant = product.variants.find((entry) => entry.id === variantId);
  return round2(variant ? variant.price : product.price);
};

/**
 * One cart API for the whole app: the server cart when signed in, a local cart
 * for guests that merges into the account after sign-in.
 */
export const useCart = (): UnifiedCart => {
  const isAuthed = useAuthStore((state) => Boolean(state.token));
  const guest = useGuestStore();

  const query = useQuery({
    queryKey: queryKeys.cart,
    queryFn: async () => (await cartApi.get()).data.data,
    enabled: isAuthed,
    staleTime: 10_000,
  });

  const cart = query.data;

  if (!isAuthed) {
    const items: UnifiedCartItem[] = guest.cart.map((item) => ({
      key: `${item.productId}-${item.variantId ?? 'base'}`,
      id: null,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      product: item.product,
      variant:
        item.product.variants.find((variant) => variant.id === item.variantId)?.id === item.variantId
          ? {
              id: item.variantId as number,
              sku: item.product.variants.find((v) => v.id === item.variantId)?.sku ?? '',
              label: item.product.variants.find((v) => v.id === item.variantId)?.label ?? null,
              stock: item.product.variants.find((v) => v.id === item.variantId)?.stock ?? 0,
            }
          : null,
      unitPrice: priceOf(item.product, item.variantId),
      lineTotal: round2(priceOf(item.product, item.variantId) * item.quantity),
      availableStock:
        item.variantId !== null
          ? (item.product.variants.find((v) => v.id === item.variantId)?.stock ?? 0)
          : item.product.stock,
    }));

    const subtotal = round2(items.reduce((sum, item) => sum + item.lineTotal, 0));

    return {
      isGuest: true,
      isLoading: false,
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      couponCode: null,
      totals: null,
      couponMessage: null,
    };
  }

  const items: UnifiedCartItem[] = (cart?.items ?? []).map((item) => ({
    key: `${item.productId}-${item.variantId ?? 'base'}`,
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    product: item.product,
    variant: item.variant,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    availableStock: item.availableStock,
  }));

  return {
    isGuest: false,
    isLoading: query.isLoading,
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: cart?.totals.subtotal ?? 0,
    couponCode: cart?.couponCode ?? null,
    totals: cart?.totals ?? null,
    couponMessage: cart?.totals?.coupon?.message ?? null,
  };
};

export const useCartMutations = () => {
  const queryClient = useQueryClient();
  const isAuthed = useAuthStore((state) => Boolean(state.token));
  const guest = useGuestStore();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.cart });
    queryClient.invalidateQueries({ queryKey: queryKeys.checkoutSummary });
  };

  const addItem = useMutation({
    mutationFn: async ({
      product,
      variantId = null,
      quantity = 1,
    }: {
      product: Product;
      variantId?: number | null;
      quantity?: number;
    }) => {
      if (!isAuthed) {
        guest.addToCart(product, variantId, quantity);
        return null;
      }
      return (await cartApi.addItem({ productId: product.id, variantId, quantity })).data.data;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Added to cart');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not add that item')),
  });

  const updateItem = useMutation({
    mutationFn: async ({
      productId,
      variantId,
      quantity,
      itemId,
    }: {
      productId: number;
      variantId: number | null;
      quantity: number;
      itemId?: number | null;
    }) => {
      if (!isAuthed) {
        guest.updateCartItem(productId, variantId, quantity);
        return null;
      }
      if (!itemId) return null;
      return (await cartApi.updateItem(itemId, quantity)).data.data;
    },
    onSuccess: invalidate,
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update the cart')),
  });

  const removeItem = useMutation({
    mutationFn: async ({
      productId,
      variantId,
      itemId,
    }: {
      productId: number;
      variantId: number | null;
      itemId?: number | null;
    }) => {
      if (!isAuthed) {
        guest.removeCartItem(productId, variantId);
        return null;
      }
      if (!itemId) return null;
      return (await cartApi.removeItem(itemId)).data.data;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Removed from cart');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not remove that item')),
  });

  const clear = useMutation({
    mutationFn: async () => {
      if (!isAuthed) {
        guest.clearCart();
        return null;
      }
      return (await cartApi.clear()).data.data;
    },
    onSuccess: invalidate,
  });

  const applyCoupon = useMutation({
    mutationFn: async (code: string) => (await cartApi.applyCoupon(code)).data.data,
    onSuccess: (data) => {
      invalidate();
      toast.success(data.couponCode ? `Coupon ${data.couponCode} applied` : 'Coupon applied');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Coupon could not be applied')),
  });

  const removeCoupon = useMutation({
    mutationFn: async () => (await cartApi.removeCoupon()).data.data,
    onSuccess: invalidate,
  });

  return { addItem, updateItem, removeItem, clear, applyCoupon, removeCoupon };
};

/** Pushes a guest cart/wishlist into the account after sign-in. */
export const useMergeGuestData = () => {
  const queryClient = useQueryClient();
  const guest = useGuestStore();

  return async () => {
    const { cart, wishlist } = guest;

    if (!cart.length && !wishlist.length) return;

    try {
      if (cart.length) {
        await cartApi.merge(cart.map((item) => ({ productId: item.productId, quantity: item.quantity })));
      }

      if (wishlist.length) {
        await wishlistApi.merge(wishlist.map((productId) => ({ productId })));
      }

      guest.clearCart();
      guest.clearWishlist();
    } catch {
      // Merging is best effort — never block a sign-in because of it.
    } finally {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist });
    }
  };
};
