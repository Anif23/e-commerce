import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { adminAPI } from "../../api/admin";
import { qk } from "../../utils/queryKeys";

export const useAdminCustomers = (params: any) =>
  useQuery({
    queryKey: [qk.adminUsers, params],

    queryFn: async () => {
      const res = await adminAPI.customers(params);

      return res.data;
    },
  });

export const useSendNotification = () =>
  useMutation({
    mutationFn: (data: any) => adminAPI.sendNotification(data),

    onSuccess: () => {
      toast.success("Notification sent");
    },

    onError: () => {
      toast.error("Failed to send");
    },
  });
