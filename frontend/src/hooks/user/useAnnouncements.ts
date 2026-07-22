import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { userAPI } from "../../api/user";
import { qk } from "../../utils/queryKeys";
import { socket } from "../../lib/socket";
import { useAnnouncementStore } from "../../store/announcementStore";

export const useAnnouncements = () => {
  return useQuery({
    queryKey: [qk.announcements],

    queryFn: async () => {
      const res = await userAPI.announcements();

      return res.data;
    },
  });
};

export const useRealtimeAnnouncements = () => {
  const qc = useQueryClient();

  const showAnnouncement = useAnnouncementStore((s) => s.showAnnouncement);

  useEffect(() => {
    const handler = (announcement: any) => {

      showAnnouncement(announcement);

      qc.invalidateQueries({
        queryKey: [qk.announcements],
      });

      if (Notification.permission === "granted") {
        new Notification(announcement.title, {
          body: announcement.message,
        });
      }
    };

    socket.on("announcement", handler);

    return () => {
      socket.off("announcement", handler);
    };
  }, [qc, showAnnouncement]);
};
