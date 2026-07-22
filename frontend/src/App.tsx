import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./utils/protectedRoute";
import { PublicRoute } from "./utils/publicRoute";

import Login from "./pages/Auth/login";
import Register from "./pages/Auth/resigster";
import TodoPage from "./pages/Todo/todos";

import Dashboard from "./pages/ECommerce/Admin/Dashboard";
import Products from "./pages/ECommerce/Admin/Products/Page";
import ProductForm from "./pages/ECommerce/Admin/Products/ProductForm";
import Categories from "./pages/ECommerce/Admin/Categories/Page";
import CategoryForm from "./pages/ECommerce/Admin/Categories/CategoryForm";
import EcommerceAdminLayout from "./components/Ecommerce/Admin/AdminLayout";

import UserPage from "./pages/ECommerce/User/Page";
import UserProducts from "./pages/ECommerce/User/Products/Page";
import ProductDetail from "./pages/ECommerce/User/Products/ProductDetail";
import UserOrders from "./pages/ECommerce/User/Orders/Page";
import UserCart from "./pages/ECommerce/User/Cart/Page";
import UserProfile from "./pages/ECommerce/User/Profile/Page";
import EcommerceUserLayout from "./components/Ecommerce/User/UserLayout";

import MainPage from "./pages";

import { Toaster } from "react-hot-toast";
import UserOrderDetail from "./pages/ECommerce/User/Orders/OrderDetail";
import AdminOrderDetail from "./pages/ECommerce/Admin/Orders/OrderDetail";
import WishlistPage from "./pages/ECommerce/User/Wishlist/Page";
import OrdersPage from "./pages/ECommerce/Admin/Orders/Page";
import CustomersPage from "./pages/ECommerce/Admin/Customers/Page";
import CampaignsPage from "./pages/ECommerce/Admin/Campaigns/Page";
import { useEffect } from "react";
import AdminProfile from "./pages/ECommerce/Admin/Profile/Page";
import AdminPayments from "./pages/ECommerce/Admin/Payments/Page";
import UserPayments from "./pages/ECommerce/User/Payments/Page";
import PaymentSuccess from "./pages/ECommerce/User/Cart/PaymentSuccess";

function App() {

  useEffect(() => {

    if (
      Notification.permission !==
      "granted"
    ) {

      Notification.requestPermission();
    }

  }, []);

  return (
    <>
      <Toaster />
      <BrowserRouter>
        <Routes>

          {/* PUBLIC */}
          <Route element={<PublicRoute />}>
            <Route path="/" element={<MainPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* USER (PUBLIC ACCESS) */}
          <Route path="/user/ecommerce" element={<EcommerceUserLayout />}>
            <Route index element={<UserPage />} />
            <Route path="products" element={<UserProducts />} />
            <Route path="products/:id" element={<ProductDetail />} />

            <Route path="cart" element={<UserCart />} />
            <Route path="wishlist" element={<WishlistPage />} />

            {/* PROTECTED USER ROUTES */}
            <Route element={<ProtectedRoute role="USER" />}>
              <Route path="orders" element={<UserOrders />} />
              <Route path="orders/:id" element={<UserOrderDetail />} />
              <Route path="profile" element={<UserProfile />} />
              <Route path="payments" element={<UserPayments />} />
              <Route path="payment-success" element={<PaymentSuccess />} />
            </Route>
          </Route>

          {/* ADMIN */}
          <Route element={<ProtectedRoute role="ADMIN" />}>
            <Route path="/admin/ecommerce" element={<EcommerceAdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="categories" element={<Categories />} />
              <Route path="product" element={<ProductForm />} />
              <Route path="product/:id" element={<ProductForm />} />
              <Route path="category" element={<CategoryForm />} />
              <Route path="category/:id" element={<CategoryForm />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:id" element={<AdminOrderDetail />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="campaigns" element={<CampaignsPage />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="payments" element={<AdminPayments />} />
            </Route>
          </Route>

          {/* TODO */}
          <Route element={<ProtectedRoute role="USER" />}>
            <Route path="/todo" element={<TodoPage />} />
          </Route>

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;