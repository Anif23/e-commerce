import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types/api';

export const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

type SessionPayload = { user: User; token: string; expiresIn: number };

let sessionRefreshPromise: Promise<SessionPayload> | null = null;

/** Uses the httpOnly refresh cookie; concurrent callers share one rotation request. */
export const refreshSession = (): Promise<SessionPayload> => {
  if (!sessionRefreshPromise) {
    sessionRefreshPromise = axios
      .post<{ success: boolean; data: SessionPayload }>(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        useAuthStore.getState().setSession(data.data.token, data.data.user);
        return data.data;
      })
      .finally(() => {
        sessionRefreshPromise = null;
      });
  }

  return sessionRefreshPromise;
};

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) config.headers.Authorization = `Bearer ${token}`;

  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const isAuthEndpoint = (url = '') => /\/auth\/(?:login|register|refresh|logout)(?:[/?#]|$)/.test(url);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;

    if (error.response?.status !== 401 || !original || original._retry || isAuthEndpoint(original.url)) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      const { token } = await refreshSession();
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch (refreshError) {
      const refreshStatus = (refreshError as AxiosError).response?.status;

      // Expired/revoked refresh cookie means the session is genuinely over.
      // A timeout or server error is transient and must not sign the shopper out.
      if (refreshStatus === 401 || refreshStatus === 403) {
        useAuthStore.getState().clearSession();
      }

      return Promise.reject(error);
    }
  },
);

/** Pulls a readable message out of any error shape the API can return. */
export const getErrorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string> } | undefined;

    if (data?.errors) {
      return Object.values(data.errors)[0] ?? data.message ?? fallback;
    }

    return data?.message ?? error.message ?? fallback;
  }

  if (error instanceof Error) return error.message;

  return fallback;
};

/** Surfaces an error as a toast and returns the message for inline display. */
export const showError = (error: unknown, fallback?: string) => {
  const message = getErrorMessage(error, fallback);
  toast.error(message);
  return message;
};
