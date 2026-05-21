import {
  Outlet,
} from "react-router-dom";
import {
  useEffect,
} from "react";
import UserHeader from "./Header";
import { socket } from "../../../lib/socket";
import {
  useAuthStore,
} from "../../../store/authStore";
import {
  useRealtimeNotifications,
} from "../../../hooks/user/useNotifications";
import { useWishlist } from "../../../hooks/user/useWishlist";

const UserLayout = () => {

  const { user } =
    useAuthStore();

  useRealtimeNotifications();
  useWishlist();

  useEffect(() => {

    if (user?.id) {

      socket.emit(
        "join",
        user.id
      );
    }

  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <UserHeader />
      <main className="flex-1 pt-10 md:pt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default UserLayout;