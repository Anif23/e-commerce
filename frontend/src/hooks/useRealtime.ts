import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { disconnectSocket, getSocket } from '../lib/socket';
import { queryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../store/authStore';

/**
 * Subscribes to the store's real-time events while a session is active.
 * Each event refreshes the queries that could have changed instead of pushing
 * raw payloads into component state.
 */
export const useRealtime = () => {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!token || !user) {
      disconnectSocket();
      return;
    }

    const socket = getSocket();
    const isAdmin = user.role === 'ADMIN';

    const join = () => {
      socket.emit('join', user.id);
      if (isAdmin) socket.emit('joinAdmin');
    };

    socket.on('connect', join);
    if (socket.connected) join();

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

    socket.on('notification', onNotification);
    socket.on('admin_notification', onNotification);
    socket.on('order_updated', onOrderUpdated);
    socket.on('admin_order_updated', onOrderUpdated);
    socket.on('support_update', onSupport);
    socket.on('admin_support', onSupport);

    return () => {
      socket.off('connect', join);
      socket.off('notification', onNotification);
      socket.off('admin_notification', onNotification);
      socket.off('order_updated', onOrderUpdated);
      socket.off('admin_order_updated', onOrderUpdated);
      socket.off('support_update', onSupport);
      socket.off('admin_support', onSupport);
    };
  }, [token, user, queryClient]);
};
