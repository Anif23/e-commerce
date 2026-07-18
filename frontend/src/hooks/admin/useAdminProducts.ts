import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminAPI } from "../../api/admin";
import { qk } from "../../utils/queryKeys";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../utils/getErrorMessage";

export const useAdminProducts = (params: any) =>
  useQuery({
    queryKey: [...qk.adminProducts, params],
    queryFn: async () => {
      const res = await adminAPI.products(params);
      return res.data;
    },

    placeholderData: (previousData) => previousData,
  });

export const useAdminProductDetail = (id: number) =>
  useQuery({
    queryKey: [qk.adminProducts, id],

    queryFn: async () => {
      const res = await adminAPI.product(id);

      return res.data.data;
    },

    enabled: !!id,

    refetchOnMount: true,
  });

export const useCreateProduct = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => adminAPI.createProduct(data),

    onSuccess: () => {
      toast.success("Product Created Successfully");

      qc.invalidateQueries({
        queryKey: qk.adminProducts,
      });
    },

    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: any) => adminAPI.updateProduct(id, data),

    onSuccess: (_, variables) => {
      toast.success("Product updated Successfully");

      qc.invalidateQueries({
        queryKey: qk.adminProducts,
      });

      qc.invalidateQueries({
        queryKey: [qk.adminProducts, variables.id],
      });
    },

    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => adminAPI.deleteProduct(id),

    onSuccess: () => {
      toast.success("Product Deleted Successfully");

      qc.invalidateQueries({
        queryKey: qk.adminProducts,
      });
    },

    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });
};
