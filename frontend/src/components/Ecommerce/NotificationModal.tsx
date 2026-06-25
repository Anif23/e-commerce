import {
  Bell,
  CheckCheck,
  Trash2,
  ShoppingCart,
  AlertTriangle,
  Package,
} from "lucide-react";

import Modal from "./Modal";

import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationRead,
  useDeleteNotification,
  useDeleteAllNotifications,
} from "../../hooks/admin/useAdminNotifications";

import { useNavigate } from "react-router-dom";

type Props = {
  open: boolean;
  onClose: () => void;
};

const NotificationModal = ({
  open,
  onClose,
}: Props) => {

  const navigate =
    useNavigate();

  const { data = [] } =
    useNotifications();

  const markRead =
    useMarkNotificationRead();

  const markAllRead =
    useMarkAllNotificationRead();

  const deleteOne =
    useDeleteNotification();

  const deleteAll =
    useDeleteAllNotifications();

  const unread =
    data.filter(
      (n: any) => !n.isRead
    ).length;

  const getIcon = (
    type: string
  ) => {

    switch (type) {

      case "ORDER":
        return (
          <ShoppingCart
            size={18}
          />
        );

      case "LOW_STOCK":
        return (
          <AlertTriangle
            size={18}
          />
        );

      default:
        return (
          <Package
            size={18}
          />
        );
    }
  };

  const openNotification =
    (item: any) => {

      if (!item.isRead) {
        markRead.mutate(
          item.id
        );
      }

      if (item.link) {
        navigate(item.link);
      }

      onClose();
    };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Notifications"
    >

      <div className="space-y-4">

        {/* TOP */}
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2 text-sm text-gray-500">

            <Bell size={16} />

            <span>
              {unread} unread
            </span>

          </div>

          <div className="flex items-center gap-2">

            {!!data.length && (
              <>
                <button
                  onClick={() =>
                    markAllRead.mutate()
                  }
                  disabled={!unread}
                  className={`text-xs px-3 py-2 rounded-xl border hover:bg-gray-50 ${!unread ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <CheckCheck
                    size={14}
                    className="inline mr-1"
                  />
                  Read All
                </button>

                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to delete all notifications? This action cannot be undone.")) {
                      deleteAll.mutate();
                    }
                  }}
                  disabled={!data.length}
                  className="text-xs px-3 py-2 rounded-xl border text-red-500 hover:bg-red-50"
                >
                  <Trash2
                    size={14}
                    className="inline mr-1"
                  />
                  Delete All
                </button>
              </>
            )}

          </div>

        </div>

        {/* LIST */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto">

          {data.length ? (
            data.map(
              (item: any) => (
                <div
                  key={item.id}
                  onClick={() =>
                    openNotification(
                      item
                    )
                  }
                  className={`p-4 rounded-2xl border cursor-pointer transition hover:bg-white ${item.isRead
                    ? "bg-white"
                    : "bg-gray-50"
                    }`}
                >

                  <div className="flex gap-3">

                    {/* ICON */}
                    <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0">

                      {getIcon(
                        item.type
                      )}

                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 min-w-0">

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <h4 className="font-semibold text-sm">
                            {
                              item.title
                            }
                          </h4>

                          <p className="text-sm text-gray-600 mt-1">
                            {
                              item.message
                            }
                          </p>

                        </div>

                        {!item.isRead && (
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1 shrink-0" />
                        )}

                      </div>

                      <div className="flex items-center justify-between mt-3">

                        <p className="text-xs text-gray-400">
                          {new Date(
                            item.createdAt
                          ).toLocaleString()}
                        </p>

                        <button
                          onClick={(e) => {

                            e.stopPropagation();

                            deleteOne.mutate(
                              item.id
                            );
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2
                            size={16}
                          />
                        </button>

                      </div>

                    </div>

                  </div>

                </div>
              )
            )
          ) : (
            <div className="h-60 flex flex-col items-center justify-center text-gray-400">

              <Bell
                size={42}
                className="mb-3"
              />

              <p>
                No notifications
              </p>

            </div>
          )}

        </div>

      </div>

    </Modal>
  );
};

export default NotificationModal;