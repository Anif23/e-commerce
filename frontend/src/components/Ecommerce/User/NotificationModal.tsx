import {
  Bell,
  Check,
  Trash2,
} from "lucide-react";

import Modal from "../../Ecommerce/Modal";

import {
  useDeleteAllNotifications,
  useDeleteNotification,
  useMarkAllNotificationRead,
  useMarkNotificationRead,
} from "../../../hooks/user/useNotifications";

type Props = {
  open: boolean;
  onClose: () => void;
  notifications: any[];
};

const NotificationModal = ({
  open,
  onClose,
  notifications,
}: Props) => {

  const markRead =
    useMarkNotificationRead();

  const markAllRead =
    useMarkAllNotificationRead();

  const deleteOne =
    useDeleteNotification();

  const deleteAll =
    useDeleteAllNotifications();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Notifications"
    >

      {/* TOP ACTIONS */}
      {notifications.length > 0 && (
        <div className="flex gap-2 mb-4">

          <button
            onClick={() =>
              markAllRead.mutate()
            }
            className="h-10 px-4 rounded-2xl bg-black text-white text-sm"
          >
            Read All
          </button>

          <button
            onClick={() =>
              deleteAll.mutate()
            }
            className="h-10 px-4 rounded-2xl border text-sm"
          >
            Delete All
          </button>

        </div>
      )}

      <div className="space-y-3">

        {notifications.length > 0 ? (
          notifications.map(
            (item) => (
              <div
                key={item.id}
                className={`p-4 rounded-3xl border transition ${!item.isRead
                    ? "bg-black text-white border-black"
                    : "bg-white"
                  }`}
              >

                <div className="flex justify-between gap-3">

                  <div className="flex gap-3">

                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center ${!item.isRead
                          ? "bg-white text-black"
                          : "bg-gray-100"
                        }`}
                    >
                      <Bell size={18} />
                    </div>

                    <div>
                      <h3 className="font-semibold">
                        {item.title}
                      </h3>

                      <p
                        className={`text-sm mt-1 ${!item.isRead
                            ? "text-white/70"
                            : "text-gray-500"
                          }`}
                      >
                        {item.message}
                      </p>

                      <p
                        className={`text-xs mt-2 ${!item.isRead
                            ? "text-white/50"
                            : "text-gray-400"
                          }`}
                      >
                        {new Date(
                          item.createdAt
                        ).toLocaleString()}
                      </p>
                    </div>

                  </div>

                  <div className="flex flex-col gap-2">

                    {!item.isRead && (
                      <button
                        onClick={() =>
                          markRead.mutate(
                            item.id
                          )
                        }
                        className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
                      >
                        <Check size={16} />
                      </button>
                    )}

                    <button
                      onClick={() =>
                        deleteOne.mutate(
                          item.id
                        )
                      }
                      className="w-9 h-9 rounded-xl bg-red-500 text-white flex items-center justify-center"
                    >
                      <Trash2 size={16} />
                    </button>

                  </div>

                </div>

              </div>
            )
          )
        ) : (
          <div className="py-16 text-center">

            <div className="w-20 h-20 rounded-full bg-gray-100 mx-auto flex items-center justify-center">
              <Bell className="text-gray-400" />
            </div>

            <h3 className="mt-5 text-lg font-semibold">
              No Notifications
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              New updates will appear here
            </p>

          </div>
        )}

      </div>
    </Modal>
  );
};

export default NotificationModal;