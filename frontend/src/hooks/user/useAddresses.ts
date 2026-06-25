import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { userAPI } from "../../api/user";
import { qk } from "../../utils/queryKeys";
import { getErrorMessage } from "../../utils/getErrorMessage";

export const useAddresses = () =>
  useQuery({
    queryKey: [qk.addresses],

    queryFn: async () => {
      const res = await userAPI.addresses();

      return res.data.data;
    },
  });

export const useAddAddress = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => userAPI.addAddress(data),

    onSuccess: () => {
      toast.success("Address added");

      qc.invalidateQueries({
        queryKey: [qk.addresses],
      });
    },

    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });
};

export const useUpdateAddress = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: any) => userAPI.updateAddress(id, data),

    onSuccess: () => {
      toast.success("Address updated");

      qc.invalidateQueries({
        queryKey: [qk.addresses],
      });
    },

    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });
};

export const useDeleteAddress = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => userAPI.deleteAddress(id),

    onSuccess: () => {
      toast.success("Address deleted");

      qc.invalidateQueries({
        queryKey: [qk.addresses],
      });
    },

    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });
};

export const useSetDefaultAddress = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => userAPI.setDefaultAddress(id),

    onSuccess: () => {
      toast.success("Default address updated");

      qc.invalidateQueries({
        queryKey: [qk.addresses],
      });
    },

    onError: (err: any) => {
      toast.error(getErrorMessage(err));
    },
  });
};
