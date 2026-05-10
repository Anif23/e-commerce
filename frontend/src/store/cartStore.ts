import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Product } from "../types";

export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];

  setItems: (items: CartItem[]) => void;
  add: (product: Product, qty: number) => void;
  update: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  getCount: () => number;
  getTotal: () => number;
  isInCart: (productId: number) => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      setItems: (items) => set({ items }),

      add: (product, qty) => {
        const exists = get().items.find((i) => i.product.id === product.id);

        if (exists) {
          set({
            items: get().items.map((i) =>
              i.product.id === product.id
                ? {
                    ...i,
                    quantity: i.quantity + qty,
                  }
                : i,
            ),
          });
        } else {
          set({
            items: [
              ...get().items,
              {
                id: product.id,
                product,
                quantity: qty,
              },
            ],
          });
        }
      },

      update: (productId, qty) => {
        set({
          items: get().items.map((i) =>
            i.product.id === productId
              ? {
                  ...i,
                  quantity: qty,
                }
              : i,
          ),
        });
      },

      remove: (productId) => {
        set({
          items: get().items.filter((i) => i.product.id !== productId),
        });
      },

      clear: () =>
        set({
          items: [],
        }),

      getCount: () => get().items.reduce((acc, item) => acc + item.quantity, 0),

      getTotal: () =>
        get().items.reduce(
          (acc, item) => acc + item.product.price * item.quantity,
          0,
        ),

      isInCart: (productId) =>
        get().items.some((i) => i.product.id === productId),
    }),
    {
      name: "cart-storage",
    },
  ),
);
