import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userAPI } from "../../api/user";
import { qk } from "../../utils/queryKeys";

export const useCreatePaypalOrder = () => {
  return useMutation({
    mutationFn: userAPI.createPaypalOrder,
  });
};

export const useCapturePaypalOrder = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: userAPI.capturePaypalOrder,

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [qk.cart],
      });

      qc.invalidateQueries({
        queryKey: [qk.orders],
      });
    },
  });
};
