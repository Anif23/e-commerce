import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userAPI } from "../../api/user";
import { qk } from "../../utils/queryKeys";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { useAuthStore } from "../../store/authStore";
import { useCartStore } from "../../store/cartStore";

export const useCart = () => {
  const token = useAuthStore((s) => s.token);

  const setItems = useCartStore((s) => s.setItems);

  return useQuery({
    queryKey: [qk.cart],

    queryFn: async () => {
      const res = await userAPI.cart();

      const items = res.data.data.items;

      // sync api cart
      setItems(items);

      return items;
    },

    enabled: !!token,
  });
};

export const useAddToCart = () => {
  const qc = useQueryClient();

  const cartStore = useCartStore();

  return useMutation({
    mutationFn: ({ product, qty }: any) =>
      userAPI.addToCart({
        productId: product.id,
        quantity: qty,
      }),

    onSuccess: () => {
      toast.success("Added to cart 🛒");
    },

    onMutate: ({ product, qty }) => {
      // optimistic update once
      cartStore.add(product, qty);
    },

    onError: (_, variables) => {
      // rollback
      cartStore.update(variables.product.id, 0);
    },

    onSettled: () => {
      qc.invalidateQueries({
        queryKey: [qk.cart],
      });
    },
  });
};

export const useUpdateCart = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: any) => userAPI.updateCart(id, data),

    onSuccess: () => {
      toast.success("Cart updated");
      qc.invalidateQueries({ queryKey: qk.cart });
    },

    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });
};

export const useRemoveCart = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => userAPI.removeCart(id),

    onSuccess: () => {
      toast.success("Item removed ❌");
      qc.invalidateQueries({ queryKey: qk.cart });
    },

    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });
};
