import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { adminAPI } from "../../api/admin";
import { qk } from "../../utils/queryKeys";

export const useAdminCustomers = (params: any) =>
  useQuery({
    queryKey: [qk.adminCustomers, params],

    queryFn: async () => {
      const res = await adminAPI.customers(params);

      return res.data;
    },
  });

export const useAdminCampaigns = (params?: any) =>
  useQuery({
    queryKey: [qk.adminCampaigns, params],

    queryFn: async () => {
      const res = await adminAPI.campaignNotifications(params);

      return res.data;
    },
  });

export const useSendCampaignNotification = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => adminAPI.sendCampaignNotification(data),

    onSuccess: () => {
      toast.success("Notification sent");

      qc.invalidateQueries({
        queryKey: [qk.adminCampaigns],
      });

      qc.refetchQueries({
        queryKey: [qk.adminCampaigns],
      });
    },

    onError: () => {
      toast.error("Failed to send");
    },
  });
};
