import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export const useMyPayments = (params: any) =>
  useQuery({
    queryKey: [qk.payments, params],

    queryFn: async () => {
      const res = await userAPI.myPayments(params);

      return res.data;
    },
  });

