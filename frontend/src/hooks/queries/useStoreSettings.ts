import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { adminApi, storeApi } from '../../lib/api/endpoints';
import { getErrorMessage } from '../../lib/api/client';
import { queryKeys } from '../../lib/queryKeys';
import type { StoreSettings } from '../../types/api';

export const useStoreSettings = () =>
  useQuery({
    queryKey: queryKeys.storeSettings,
    queryFn: async () => (await storeApi.settings()).data.data,
    staleTime: 60_000,
  });

export const useAdminStoreSettings = () =>
  useQuery({
    queryKey: queryKeys.admin.storeSettings,
    queryFn: async () => (await adminApi.storeSettings()).data.data,
  });

export const useUploadStoreLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => adminApi.uploadStoreLogo(file),
    onSuccess: async ({ data }) => {
      queryClient.setQueryData(queryKeys.admin.storeSettings, data.data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.storeSettings });
      toast.success('Store logo updated');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not upload the store logo')),
  });
};

export const useUpdateStoreSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<StoreSettings>) => adminApi.updateStoreSettings(payload),
    onSuccess: async ({ data }) => {
      queryClient.setQueryData(queryKeys.admin.storeSettings, data.data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.storeSettings }),
        queryClient.invalidateQueries({ queryKey: ['cart'] }),
        queryClient.invalidateQueries({ queryKey: ['checkout-summary'] }),
      ]);
      toast.success('Store settings saved');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not save store settings')),
  });
};
