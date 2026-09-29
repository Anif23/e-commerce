import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '../../store/authStore';
import { LoadingBlock } from '../ui/Feedback';

const useSession = () => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  return { token, user };
};

/** Blocks a route until a token exists. */
export const ProtectedRoute = () => {
  const { token } = useSession();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

/** Same as above, plus a role check for the admin console. */
export const AdminRoute = () => {
  const { token, user } = useSession();
  const location = useLocation();

  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;

  return <Outlet />;
};

/** Keeps signed-in visitors out of the login/register screens. */
export const GuestRoute = () => {
  const { token, user } = useSession();

  if (!token) return <Outlet />;

  return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/'} replace />;
};

export const SuspenseFallback = () => <LoadingBlock label="Loading page…" />;
