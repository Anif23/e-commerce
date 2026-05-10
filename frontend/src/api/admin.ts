import api from "./client";

export const adminAPI = {
  dashboard: () => api.get("/admin/dashboard"),
  products: (params: any) => api.get("/admin/products", { params }),
  product: (id: number) => api.get(`/admin/products/${id}`),
  createProduct: (data: FormData) => api.post("/admin/products", data),
  updateProduct: (id: number, data: FormData) =>
    api.put(`/admin/products/${id}`, data),
  deleteProduct: (id: number) => api.delete(`/admin/products/${id}`),

  categories: (params: any) => api.get("/admin/categories", { params}),
  category: (id: number) => api.get(`/admin/categories/${id}`),
  createCategory: (data: FormData) => api.post("/admin/categories", data),
  updateCategory: (id: number, data: FormData) =>
    api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id: number) => api.delete(`/admin/categories/${id}`),

  orders: (params: any) => api.get("/admin/orders", { params }),
  updateOrderStatus: (id: number, data: any) =>
    api.put(`/admin/orders/${id}/status`, data),
  updatePaymentStatus: (id: number, data: any) =>
    api.put(`/admin/orders/${id}/payment`, data),

  customers: (params: any) => api.get("/admin/customers", { params }),

  sendNotification: (data: any) => api.post("/admin/notifications", data),
};
