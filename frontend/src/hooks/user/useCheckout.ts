import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { userAPI } from "../../api/user";
import { qk } from "../../utils/queryKeys";
import { getErrorMessage } from "../../utils/getErrorMessage";

export const useCheckout = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => userAPI.checkout(data),

    onSuccess: async () => {
      toast.success("Checkout successful");

      qc.setQueryData([qk.cart], (old: any) => ({
        ...old,
        items: [],
        total: 0,
      }));

      await Promise.all([
        qc.invalidateQueries({
          queryKey: [qk.cart],
        }),

        qc.invalidateQueries({
          queryKey: [qk.orders],
        }),
      ]);
    },

    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });
};
