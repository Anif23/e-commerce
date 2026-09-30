import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Role, User } from '../types/api';

interface AuthState {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  role: () => Role | null;
  sessionReady: boolean;
  finishSessionBootstrap: () => void;
}

/**
 * The access token lives in memory + localStorage; the refresh token stays in an
 * httpOnly cookie managed by the API.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      sessionReady: false,

      setSession: (token, user) => set({ token, user }),
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      clearSession: () => set({ token: null, user: null }),

      isAuthenticated: () => Boolean(get().token),
      finishSessionBootstrap: () => set({ sessionReady: true }),
      isAdmin: () => get().user?.role === 'ADMIN',
      role: () => get().user?.role ?? null,
    }),
    {
      name: 'storefront-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
