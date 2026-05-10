import api from "./client";

export const userAPI = {
  products: (params?: any) => api.get("/products", { params }),
  product: (id: number) => api.get(`/products/${id}`),

  categories: (params?: any) => api.get("/categories", { params }),
  category: (id: number) => api.get(`/categories/${id}`),

  cart: () => api.get("/cart"),
  addToCart: (data: any) => api.post("/cart", data),
  updateCart: (id: number, data: any) => api.put(`/cart/${id}`, data),
  removeCart: (id: number) => api.delete(`/cart/${id}`),

  checkout: (data: any) => api.post("/checkout", data),

  orders: () => api.get("/orders"),
  order: (id: number) => api.get(`/orders/${id}`),

  wishlist: () => api.get("/wishlist"),
  toggleWishlist: (id: number) => api.post(`/wishlist/${id}`),

  mergeCart: (items: any) => api.post("/merge/cart", { items }),
  mergeWishlist: (items: any) => api.post("/merge/wishlist", { items }),

  profile: () => api.get("/profile"),
  updateProfile: (data: any) => api.put("/profile/update", data),
  changePassword: (data: any) => api.put("/profile/password", data),

  logout: () => api.post("/auth/logout"),

  notifications: () => api.get("/notifications"),
  markNotificationRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllNotificationRead: () => api.put("/notifications/read-all"),
  deleteNotification: (id: number) => api.delete(`/notifications/${id}`),
  deleteAllNotifications: () => api.delete("/notifications/delete-all"),
};
