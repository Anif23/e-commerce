import { useMutation } from '@tanstack/react-query';

import { authApi } from '../../lib/api/endpoints';
import { getErrorMessage } from '../../lib/api/client';
import { useAuthStore } from '../../store/authStore';
import { useMergeGuestData } from './useCart';

const saveSession = (data: { user: { id: number; username: string; email: string; role: 'USER' | 'ADMIN' }; token: string }) => {
  useAuthStore.getState().setSession(data.token, data.user);
};

export const useLogin = () => {
  const mergeGuestData = useMergeGuestData();

  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data } = await authApi.login(payload);
      saveSession(data.data);
      await mergeGuestData();
      return data.data.user;
    },
    throwOnError: false,
    onError: (error) => {
      throw new Error(getErrorMessage(error, 'Those credentials did not match'));
    },
  });
};

export const useRegister = () => {
  const mergeGuestData = useMergeGuestData();

  return useMutation({
    mutationFn: async (payload: { username: string; email: string; password: string }) => {
      const { data } = await authApi.register(payload);
      saveSession(data.data);
      await mergeGuestData();
      return data.data.user;
    },
    onError: (error) => {
      throw new Error(getErrorMessage(error, 'Could not create that account'));
    },
  });
};

export const useLogout = () => {
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } catch {
        // Logging out locally must succeed even if the call fails.
      } finally {
        clearSession();
      }
    },
  });
};
