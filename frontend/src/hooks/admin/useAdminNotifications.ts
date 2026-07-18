import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useEffect } from "react";
import { adminAPI } from "../../api/admin";
import { socket } from "../../lib/socket";
import { qk } from "../../utils/queryKeys";
import { useAuthStore } from "../../store/authStore";

export const useNotifications = () => {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: qk.notifications,

    queryFn: async () => {
      const res = await adminAPI.notifications();

      return res.data.data;
    },
    enabled: !!token,
  });
};

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => adminAPI.markNotificationRead(id),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: qk.notifications,
      });
    },
  });
};

export const useMarkAllNotificationRead = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => adminAPI.markAllNotificationRead(),

    onSuccess: () => {
      toast.success("All notifications read");

      qc.invalidateQueries({
        queryKey: qk.notifications,
      });
    },
  });
};

export const useDeleteNotification = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => adminAPI.deleteNotification(id),

    onSuccess: () => {
      toast.success("Notification deleted");

      qc.invalidateQueries({
        queryKey: qk.notifications,
      });
    },
  });
};

export const useDeleteAllNotifications = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => adminAPI.deleteAllNotifications(),

    onSuccess: () => {
      toast.success("All notifications deleted");

      qc.invalidateQueries({
        queryKey: qk.notifications,
      });
    },
  });
};

export const useRealtimeNotifications = () => {
  const qc = useQueryClient();

  useEffect(() => {
    const handler = (notification: any) => {
      toast.success(notification.title);

      qc.invalidateQueries({
        queryKey: qk.notifications,
      });

      if (Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
        });
      }
    };

    socket.on("admin_notificaton", handler);

    return () => {
      socket.off("admin_notificaton", handler);
    };
  }, [qc]);
};
