import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminAPI } from "../../api/admin";
import toast from "react-hot-toast";
import { qk } from "../../utils/queryKeys";

export const useAdminOrders = (params: any) =>
  useQuery({
    queryKey: [qk.adminOrders, params],
    queryFn: async () => {
      const res = await adminAPI.orders(params);
      return res.data;
    },
  });

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: any) =>
      adminAPI.updateOrderStatus(id, { status }),

    onSuccess: () => {
      toast.success("Order updated");
      qc.invalidateQueries({
        queryKey: [qk.adminOrders],
      });
    },

    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed");
    },
  });
};
