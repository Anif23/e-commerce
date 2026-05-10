import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminAPI } from "../../api/admin";
import { qk } from "../../utils/queryKeys";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../utils/getErrorMessage";

export const useAdminCategories = (params?: any) =>
  useQuery({
    queryKey: [...qk.adminCategories, params],
    queryFn: async () => {
      const res = await adminAPI.categories(params);
      return res.data;
    },

    placeholderData: (previousData) => previousData,
  });

export const useAdminCategoryDetail = (id: number, options?: any) =>
  useQuery({
    queryKey: ["admin-category", id],
    queryFn: () => adminAPI.category(id).then((r) => r.data.data),
    enabled: !!id,
    ...options,
  });

export const useCreateCategory = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => adminAPI.createCategory(data),

    onSuccess: () => {
      toast.success("Category Created Successfully");
      qc.invalidateQueries({ queryKey: qk.adminCategories });
    },

    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });
};

export const useUpdateCategory = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: any) => adminAPI.updateCategory(id, data),

    onSuccess: () => {
      toast.success("Category updated Successfully");
      qc.invalidateQueries({ queryKey: qk.adminCategories });
    },

    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => adminAPI.deleteCategory(id),

    onSuccess: () => {
      toast.success("Category Deleted ❌");
      qc.invalidateQueries({ queryKey: qk.adminCategories });
    },

    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });
};
