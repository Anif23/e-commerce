import { useState } from "react";
import { useNavigate } from "react-router-dom";

import PageHeader from "../../../../components/Ecommerce/Admin/PageHeader";
import FilterBar from "../../../../components/Ecommerce/Admin/FilterBar";
import DataTable from "../../../../components/Ecommerce/Admin/DataTable";
import Pagination from "../../../../components/Ecommerce/Admin/Pagination";
import StatsCard from "../../../../components/Ecommerce/StatsCard";

import {
  Package,
  Truck,
  CheckCircle,
} from "lucide-react";

import {
  useAdminOrders,
  useUpdateOrderStatus,
  useUpdateOrderPaymentStatus
} from "../../../../hooks/admin/useAdminOrders";

const Orders = () => {
  const navigate =
    useNavigate();

  const updateStatus =
    useUpdateOrderStatus();
  const updatePayment = useUpdateOrderPaymentStatus();

  const [page, setPage] =
    useState(1);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("all");

  const { data, isLoading } =
    useAdminOrders({
      page,
      search,
      status:
        status === "all"
          ? undefined
          : status,
    });

  const orders =
    data?.data || [];

  const pg =
    data?.pagination ||
    {};

  const statusOptions = [
    "PENDING_PAYMENT",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ];

  const columns = [
    {
      header: "Order",
      render: (row: any) => (
        <div
          className="cursor-pointer"
          onClick={() =>
            navigate(
              `/admin/ecommerce/orders/${row.id}`
            )
          }
        >
          <p className="font-semibold">
            #{row.id}
          </p>
          <p className="text-xs text-gray-400">
            {
              row.user
                ?.email
            }
          </p>
        </div>
      ),
    },

    {
      header: "Amount",
      render: (row: any) =>
        `$${row.total.toLocaleString()}`,
    },

    {
      header: "Status",
      render: (row: any) => {
        const isCancelled = row.status === "CANCELLED";
        const isDelivered = row.status === "DELIVERED";
        const isExpired = row.status === "EXPIRED";

        if (isCancelled || isDelivered || isExpired) {
          return (
            <span
              className={`text-sm font-medium ${isCancelled ? "text-red-600" : isExpired ? "text-yellow-600" : "text-green-600"}`}
            >
              {row.status}
            </span>
          );
        }

        return (
          <select
            value={row.status}
            onChange={(e) =>
              updateStatus.mutate({
                id: row.id,
                status: e.target.value,
              })
            }
            className="border px-2 py-1 rounded-lg text-sm"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        );
      },
    },

    {
      header: "Payment",
      render: (row: any) => {
        const payment = row.payment;
        const isCOD = payment?.provider === "COD";
        const isPaid = payment?.status === "SUCCESS";
        const isCancelled = row.status === "CANCELLED";
        const isExpired = row.status === "FAILED" || row.status === "EXPIRED";
        const canMarkPaid =
          isCOD &&
          !isPaid &&
          row.status === "DELIVERED";

        return (
          <div className="flex flex-col gap-2">
            <span
              className={`text-sm font-medium ${isPaid
                ? "text-green-600"
                : isCancelled
                  ? "text-red-600" 
                  : isExpired
                    ? "text-yellow-600"
                    : "text-orange-600"
                }`}
            >
              {isCancelled
                ? "CANCELLED"
                : isPaid
                  ? "PAID"
                  : isExpired
                    ? "EXPIRED"
                    : "PENDING"}
            </span>

            {!isCancelled && (
              <span className="text-xs text-gray-500">
                {payment?.provider} - {payment?.status}
              </span>
            )}

            {canMarkPaid && (
              <button
                onClick={() =>
                  updatePayment.mutate({
                    id: row.id,
                    status: "SUCCESS",
                  })
                }
                className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs"
              >
                Mark as Paid
              </button>
            )}
          </div>
        );
      },
    },

    {
      header: "Date",
      render: (row: any) =>
        new Date(
          row.createdAt
        ).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        subtitle="Manage orders"
      />

      {/* STATS */}
      <div className="grid md:grid-cols-3 gap-5">
        <StatsCard
          title="Total Orders"
          value={
            pg.total || 0
          }
          icon={
            <Package />
          }
        />

        <StatsCard
          title="Shipped"
          value={orders.filter(
            (o: any) =>
              o.status ===
              "SHIPPED"
          ).length}
          icon={
            <Truck />
          }
        />

        <StatsCard
          title="Delivered"
          value={orders.filter(
            (o: any) =>
              o.status ===
              "DELIVERED"
          ).length}
          icon={
            <CheckCircle />
          }
        />
      </div>

      {/* FILTER */}
      <FilterBar
        search={search}
        setSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        total={
          pg.total || 0
        }
        selects={[
          {
            value: status,
            onChange: (v) => {
              setStatus(v);
              setPage(1);
            },
            options: [
              {
                label: "All",
                value: "all",
              },
              ...statusOptions.map((status) => ({
                label: status.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                value: status,
              })),
            ],
          },
        ]}
      />

      {/* TABLE */}
      <DataTable
        loading={
          isLoading
        }
        columns={
          columns
        }
        rows={orders}
      />

      {/* PAGINATION */}
      <Pagination
        page={pg.page || 1}
        totalPages={
          pg.totalPages || 1
        }
        hasNext={
          pg.hasNext
        }
        hasPrev={
          pg.hasPrev
        }
        setPage={setPage}
      />
    </div>
  );
};

export default Orders;