import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '../../store/authStore';
import { LoadingBlock } from '../ui/Feedback';

const useSession = () => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const ready = useAuthStore((state) => state.sessionReady);
  return { token, user, ready };
};

/** Restores the refresh-cookie session before deciding whether to redirect. */
export const ProtectedRoute = () => {
  const { token, ready } = useSession();
  const location = useLocation();

  if (!ready) return <LoadingBlock label="Restoring your session…" />;
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return <Outlet />;
};

/** Same as above, plus a role check for the admin console. */
export const AdminRoute = () => {
  const { token, user, ready } = useSession();
  const location = useLocation();

  if (!ready) return <LoadingBlock label="Restoring your session…" />;
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;

  return <Outlet />;
};

/** Keeps signed-in visitors out of the login/register screens. */
export const GuestRoute = () => {
  const { token, user, ready } = useSession();

  if (!ready) return <LoadingBlock label="Restoring your session…" />;
  if (!token) return <Outlet />;

  return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/'} replace />;
};

export const SuspenseFallback = () => <LoadingBlock label="Loading page…" />;
