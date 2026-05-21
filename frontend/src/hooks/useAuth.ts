import { useMutation, useQueryClient } from "@tanstack/react-query";

import api from "../api/client";

import { useAuthStore } from "../store/authStore";

import { useCartStore } from "../store/cartStore";
import { useWishlistStore } from "../store/wishlistStore";

export const useLogin = () => {
  return useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await api.post("/auth/login", data);

      return res.data;
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await api.post("/auth/register", data);

      return res.data;
    },
  });
};

export const useRefreshToken = () => {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post("/auth/refresh");

      return res.data;
    },
  });
};

export const useLogout = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await api.post("/auth/logout");

      return res.data;
    },

    onSettled: () => {
      qc.clear();

      useAuthStore.getState().logout();

      useCartStore.getState().clear();

      useWishlistStore.getState().clear();

      window.location.href = "/login";
    },
  });
};
