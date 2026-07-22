import { create } from "zustand";

interface AnnouncementState {
    announcement: any | null;
    open: boolean;

    showAnnouncement: (data: any) => void;
    closeAnnouncement: () => void;
}

export const useAnnouncementStore =
    create<AnnouncementState>((set) => ({

        announcement: null,
        open: false,

        showAnnouncement: (announcement) =>
            set({
                announcement,
                open: true,
            }),

        closeAnnouncement: () =>
            set({
                announcement: null,
                open: false,
            }),

    }));