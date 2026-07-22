import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userAPI } from "../../api/user";
import { qk } from "../../utils/queryKeys";
import { socket } from "../../lib/socket";
import { useEffect } from "react";

export const useOrders = (params: any) =>
  useQuery({
    queryKey: [qk.orders, params],

    queryFn: async () => {
      const res = await userAPI.orders(params);

      return res.data;
    },
  });


export const useOrder = (id: number) =>
  useQuery({
    queryKey: [qk.orders, id],
    queryFn: () => userAPI.order(id).then((r) => r.data.data),
    enabled: !!id,
  });

export const useCancelOrder = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => userAPI.cancelOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [qk.cart] });
      qc.invalidateQueries({ queryKey: [qk.orders] });
    },
  });
};

export const useExpireOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => userAPI.expireOrder(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [qk.cart],
      });

      queryClient.invalidateQueries({
        queryKey: [qk.orders],
      });
    },
  });
};

export const useRealtimeOrders = () => {
  const qc = useQueryClient();

  useEffect(() => {
    socket.on("user_order_updated", (data) => {
      qc.invalidateQueries({
        queryKey: [qk.orders],
      });
    });

    return () => {
      socket.off("user_order_updated");
    }
  }, [qc]);
}