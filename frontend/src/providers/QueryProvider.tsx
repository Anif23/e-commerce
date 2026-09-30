import { useEffect, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '../lib/queryClient';
import { refreshSession } from '../lib/api/client';
import { useAuthStore } from '../store/authStore';
import { useRealtime } from '../hooks/useRealtime';

/** Restores a session from the httpOnly cookie before protected routes redirect. */
let bootstrapPromise: Promise<void> | null = null;

const restoreSession = () => {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const store = useAuthStore.getState();

      if (!store.token) {
        try {
          const session = await refreshSession();
          useAuthStore.getState().setSession(session.token, session.user);
        } catch (error) {
          const status = (error as { response?: { status?: number } }).response?.status;
          if (status === 401 || status === 403) useAuthStore.getState().clearSession();
        }
      }

      useAuthStore.getState().finishSessionBootstrap();
    })().finally(() => {
      bootstrapPromise = null;
    });
  }

  return bootstrapPromise;
};

const SessionBootstrap = () => {
  useEffect(() => {
    void restoreSession();
  }, []);

  return null;
};

/** Wires sockets and auth restoration into the React tree once the cache exists. */
const RealtimeBridge = () => {
  useRealtime();
  return null;
};

export const QueryProvider = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <SessionBootstrap />
    <RealtimeBridge />
    {children}
  </QueryClientProvider>
);
