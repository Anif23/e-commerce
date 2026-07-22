import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { adminAPI } from "../../api/admin";
import { qk } from "../../utils/queryKeys";

export const useAdminCampaigns = (params?: any) =>
  useQuery({
    queryKey: [qk.adminCampaigns, params],

    queryFn: async () => {
      const res = await adminAPI.getCampaigns(params);

      return res.data;
    },
  });

export const useAdminCreateCampaign = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => adminAPI.createCampaign(data),

    onSuccess: () => {
      toast.success("Announcement published successfully.");

      qc.invalidateQueries({
        queryKey: [qk.adminCampaigns],
      });
    },

    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed");
    },
  });
};

export const useUpdateCampaignStatus = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: any) =>
      adminAPI.updateCampaignStatus(id, isActive),

    onSuccess: (_, variables) => {
      toast.success(
        variables.isActive
          ? "Announcement activated successfully."
          : "Announcement deactivated successfully.",
      );

      qc.invalidateQueries({
        queryKey: [qk.adminCampaigns],
      });
    },

    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed");
    },
  });
};

export const useDeleteCampaign = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => adminAPI.deleteCampaign(id),

    onSuccess: () => {
      toast.success("Announcement deleted successfully.");

      qc.invalidateQueries({
        queryKey: [qk.adminCampaigns],
      });
    },

    onError: () => {
      toast.error("Failed to delete announcement.");
    },
  });
};
