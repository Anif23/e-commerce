import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminAPI } from "../../api/admin";
import { qk } from "../../utils/queryKeys";

export const useAdminPayments = (params: any) =>
  useQuery({
    queryKey: [qk.adminPayments, params],

    queryFn: async () => {
      const res = await adminAPI.getAllTransactions(params);

      return res.data;
    },
  });