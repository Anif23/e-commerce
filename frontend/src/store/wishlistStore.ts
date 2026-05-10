import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Product } from "../types";

interface WishlistState {
  items: Product[];

  setItems: (items: Product[]) => void;

  toggle: (product: Product) => void;

  add: (product: Product) => void;

  remove: (productId: number) => void;

  clear: () => void;

  isWishlisted: (id: number) => boolean;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      setItems: (items) =>
        set({
          items,
        }),

      toggle: (product) => {
        const exists = get().items.some((p) => p.id === product.id);

        if (exists) {
          set({
            items: get().items.filter((p) => p.id !== product.id),
          });
        } else {
          set({
            items: [...get().items, product],
          });
        }
      },

      add: (product) => {
        const exists = get().items.some((p) => p.id === product.id);

        if (exists) return;

        set({
          items: [...get().items, product],
        });
      },

      remove: (productId) => {
        set({
          items: get().items.filter((p) => p.id !== productId),
        });
      },

      clear: () =>
        set({
          items: [],
        }),

      isWishlisted: (id) => get().items.some((p) => p.id === id),
    }),
    {
      name: "wishlist-storage",
    },
  ),
);
