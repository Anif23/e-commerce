import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Product } from '../types/api';

export interface GuestCartItem {
  productId: number;
  variantId: number | null;
  quantity: number;
  /** Snapshot so the guest cart renders without extra requests. */
  product: Product;
}

interface GuestState {
  cart: GuestCartItem[];
  wishlist: number[];

  addToCart: (product: Product, variantId: number | null, quantity: number) => void;
  updateCartItem: (productId: number, variantId: number | null, quantity: number) => void;
  removeCartItem: (productId: number, variantId: number | null) => void;
  clearCart: () => void;

  toggleWishlist: (productId: number) => void;
  clearWishlist: () => void;
}

/**
 * Guest cart/wishlist. Kept locally and merged into the account on the next
 * sign-in (POST /cart/merge and /wishlist/merge).
 */
export const useGuestStore = create<GuestState>()(
  persist(
    (set, get) => ({
      cart: [],
      wishlist: [],

      addToCart: (product, variantId, quantity) => {
        const items = [...get().cart];
        const index = items.findIndex(
          (item) => item.productId === product.id && item.variantId === variantId,
        );

        if (index >= 0) {
          items[index] = { ...items[index], quantity: items[index].quantity + quantity };
        } else {
          items.push({ productId: product.id, variantId, quantity, product });
        }

        set({ cart: items });
      },

      updateCartItem: (productId, variantId, quantity) =>
        set({
          cart: get()
            .cart.map((item) =>
              item.productId === productId && item.variantId === variantId
                ? { ...item, quantity: Math.max(1, quantity) }
                : item,
            )
            .filter((item) => item.quantity > 0),
        }),

      removeCartItem: (productId, variantId) =>
        set({
          cart: get().cart.filter(
            (item) => !(item.productId === productId && item.variantId === variantId),
          ),
        }),

      clearCart: () => set({ cart: [] }),

      toggleWishlist: (productId) =>
        set({
          wishlist: get().wishlist.includes(productId)
            ? get().wishlist.filter((id) => id !== productId)
            : [...get().wishlist, productId],
        }),

      clearWishlist: () => set({ wishlist: [] }),
    }),
    { name: 'storefront-guest' },
  ),
);
