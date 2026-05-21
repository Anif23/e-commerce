import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userAPI } from "../../api/user";
import toast from "react-hot-toast";
import { qk } from "../../utils/queryKeys";
import { getErrorMessage } from "../../utils/getErrorMessage";


export const useCheckout = () => {

  const qc =
    useQueryClient();

  return useMutation({

    mutationFn:
      (data: any) =>
        userAPI.checkout(data),

    onSuccess:
      async () => {

        toast.success(
          "Checkout successful"
        );

        qc.setQueryData(
          qk.cart,
          {
            items: [],
          }
        );

        await qc.refetchQueries({
          queryKey:
            qk.orders,
        });
      },

    onError:
      (err: any) => {

        toast.error(
          getErrorMessage(err)
        );
      },
  });
};