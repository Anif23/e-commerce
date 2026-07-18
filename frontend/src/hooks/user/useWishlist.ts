import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userAPI } from "../../api/user";
import { qk } from "../../utils/queryKeys";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";
import { useWishlistStore } from "../../store/wishlistStore";

export const useWishlist = () => {
  const token = useAuthStore((s) => s.token);

  const setItems = useWishlistStore((s) => s.setItems);

  return useQuery({
    queryKey: [qk.wishlist],

    queryFn: async () => {
      const res = await userAPI.wishlist();

      // extract products
      const products = res.data.data.map((item: any) => item.product);

      setItems(products);

      return products;
    },

    enabled: !!token,
  });
};

export const useToggleWishlist = () => {
  const qc = useQueryClient();

  const toggle = useWishlistStore((s) => s.toggle);

  return useMutation({
    mutationFn: (product: any) => userAPI.toggleWishlist(product.id),

    // optimistic update
    onMutate: async (product) => {
      toggle(product);
    },

    // rollback
    onError: (_, product) => {
      toggle(product);

      toast.error("Failed to update wishlist");
    },

    onSuccess: (res) => {
      toast.success(res?.data?.message || "Wishlist updated ❤️");
    },

    onSettled: () => {
      qc.invalidateQueries({
        queryKey: [qk.wishlist],
      });
    },
  });
};
