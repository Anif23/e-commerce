import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export const ProtectedRoute = ({ role }: { role?: "USER" | "ADMIN" }) => {
  const { token, role: userRole } = useAuthStore();
  const location = useLocation();

  if (!token) {
    return (
      <Navigate
        to="/login"
        state={{
          redirectTo: location.pathname,
        }}
        replace
      />
    );
  }

  if (role && role !== userRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};