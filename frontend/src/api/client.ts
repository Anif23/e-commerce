import axios, { AxiosError } from "axios";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let isRefreshing = false;

let queue: ((token: string) => void)[] = [];

const processQueue = (token: string) => {
  queue.forEach((cb) => cb(token));
  queue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    const status = error.response?.status;

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const res = await axios.post<{ token: string }>(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newToken = res.data.token;

        useAuthStore.getState().setAuth(newToken);

        processQueue(newToken);

        return api(originalRequest);
      } catch (err) {
        // Only redirect to login if we're not already on a public page
        const publicRoutes = ["/", "/login", "/register", "/user/ecommerce"];
        const currentPath = window.location.pathname;
        const isPublicPage = publicRoutes.some(
          (route) =>
            currentPath === route || currentPath.startsWith("/user/ecommerce")
        );

        if (!isPublicPage) {
          toast.error("Session expired");
          useAuthStore.getState().logout();
          window.location.href = "/login";
        }
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
