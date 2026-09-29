import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';

export const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let isRefreshing = false;
let queue: ((token: string | null) => void)[] = [];

const flushQueue = (token: string | null) => {
  queue.forEach((resolve) => resolve(token));
  queue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // Only attempt a silent refresh for expired access tokens.
    if (status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push((token) => {
          if (!token) return reject(error);
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post<{ success: boolean; data: { token: string } }>(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      const token = data.data.token;
      useAuthStore.getState().setToken(token);
      flushQueue(token);

      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch {
      flushQueue(null);
      useAuthStore.getState().clearSession();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
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
