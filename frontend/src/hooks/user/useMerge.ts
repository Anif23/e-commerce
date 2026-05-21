import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userAPI } from "../../api/user";
import { qk } from "../../utils/queryKeys";

export const useMergeCart = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (items: any[]) => userAPI.mergeCart(items),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.cart });
    },
  });
};

export const useMergeWishlist = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (items: any[]) => userAPI.mergeWishlist(items),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.wishlist });
    },
  });
};
