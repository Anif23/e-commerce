import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useEffect } from "react";
import { userAPI } from "../../api/user";
import { socket } from "../../lib/socket";
import { qk } from "../../utils/queryKeys";

export const useNotifications = () =>
  useQuery({
    queryKey: qk.notifications,

    queryFn: async () => {
      const res = await userAPI.notifications();

      return res.data.data;
    },
  });

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => userAPI.markNotificationRead(id),

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
    mutationFn: () => userAPI.markAllNotificationRead(),

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
    mutationFn: (id: number) => userAPI.deleteNotification(id),

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
    mutationFn: () => userAPI.deleteAllNotifications(),

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

    socket.on("new_notification", handler);

    return () => {
      socket.off("new_notification", handler);
    };
  }, [qc]);
};
