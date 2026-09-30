import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { disconnectSocket, getSocket } from '../lib/socket';
import { refreshSession } from '../lib/api/client';
import { queryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../store/authStore';

/** Realtime events invalidate canonical server data; missed events self-heal on refetch. */
export const useRealtime = () => {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const sessionReady = useAuthStore((state) => state.sessionReady);

  useEffect(() => {
    if (!sessionReady) return;
    if (!token || !user) {
      disconnectSocket();
      return;
    }

    const socket = getSocket(token);
    let refreshingSocketSession = false;

    const onNotification = (payload: { title?: string; message?: string; link?: string | null }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.notifications });
      if (payload?.title) toast(payload.message ? `${payload.title}: ${payload.message}` : payload.title);
    };

    const onOrderUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['order-track'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders({}) });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.orderCounters });
    };

    const onSupport = () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket'] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.support({}) });
    };

    const onConnectError = async (error: Error) => {
      if (!/expired|invalid|authentication required|session is not active/i.test(error.message) || refreshingSocketSession) {
        return;
      }

      refreshingSocketSession = true;
      try {
        await refreshSession();
      } catch (refreshError) {
        const status = (refreshError as { response?: { status?: number } }).response?.status;
        if (status === 401 || status === 403) useAuthStore.getState().clearSession();
      } finally {
        refreshingSocketSession = false;
      }
    };

    socket.on('notification', onNotification);
    socket.on('admin_notification', onNotification);
    socket.on('order_updated', onOrderUpdated);
    socket.on('admin_order_updated', onOrderUpdated);
    socket.on('support_update', onSupport);
    socket.on('admin_support', onSupport);
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('notification', onNotification);
      socket.off('admin_notification', onNotification);
      socket.off('order_updated', onOrderUpdated);
      socket.off('admin_order_updated', onOrderUpdated);
      socket.off('support_update', onSupport);
      socket.off('admin_support', onSupport);
      socket.off('connect_error', onConnectError);
    };
  }, [token, user, sessionReady, queryClient]);
};
