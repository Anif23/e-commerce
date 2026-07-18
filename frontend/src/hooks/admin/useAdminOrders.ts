import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminAPI } from "../../api/admin";
import toast from "react-hot-toast";
import { qk } from "../../utils/queryKeys";
import { useEffect } from "react";
import { socket } from "../../lib/socket";

export const useAdminOrders = (params: any) =>
  useQuery({
    queryKey: [qk.adminOrders, params],
    queryFn: async () => {
      const res = await adminAPI.orders(params);
      return res.data;
    },
  });

export const useAdminOrderById = (id: number) =>
  useQuery({
    queryKey: [qk.adminOrders, id],
    queryFn: async () => {
      const res = await adminAPI.orderDetail(id);
      return res.data;
    },
  });

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: any) =>
      adminAPI.updateOrderStatus(id, { status }),

    onSuccess: () => {
      toast.success("Order status updated successfully");
      qc.invalidateQueries({
        queryKey: [qk.adminOrders],
      });
    },

    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed");
    },
  });
};

export const useUpdateOrderPaymentStatus = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: any) =>
      adminAPI.updatePaymentStatus(id, { status }),

    onSuccess: () => {
      toast.success("Payment status updated");
      qc.invalidateQueries({
        queryKey: [qk.adminOrders],
      });
    },

    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed");
    },
  });
};

export const useRealtimeAdminOrders = () => {
  const qc = useQueryClient();

  useEffect(() => {
    socket.on("order_updated", () => {
      qc.invalidateQueries({
        queryKey: [qk.adminOrders],
      });
    });

    return () => {
      socket.off("order_updated");
    }
  }, [qc]);
};
