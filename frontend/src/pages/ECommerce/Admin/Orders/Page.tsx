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
        `₹${row.total}`,
    },

    {
      header: "Status",
      render: (row: any) => (
        row.status === "CANCELLED" ? (
          <span
            className={`text-sm font-medium ${row.status === "CANCELLED" ? "text-red-600" : "text-green-600"}`}
          >
            {row.status}
          </span>
        ) :
          row.status === "DELIVERED" && row.payment?.status === "SUCCESS" ? (
            <span
              className={`text-sm font-medium ${row.status === "DELIVERED" && row.payment?.status === "SUCCESS" ? "text-green-600" : "text-orange-600"}`}
            >
              {row.status}
            </span>
          ) : (
            <select
              value={
                row.status
              }
              onChange={(
                e
              ) =>
                updateStatus.mutate(
                  {
                    id: row.id,
                    status:
                      e.target
                        .value,
                  }
                )
              }
              className="border px-2 py-1 rounded-lg text-sm"
            >
              {[
                "PENDING",
                "SHIPPED",
                "DELIVERED",
                "CANCELLED",
              ].map((s) => (
                <option
                  key={s}
                  value={s}
                >
                  {s}
                </option>
              ))}
            </select>
          ))
    },

    {
      header: "Payment",
      render: (row: any) => {
        const isCOD =
          row.payment?.provider === "COD";

        const isPaid =
          row.payment?.status === "SUCCESS";
        
        const isCancelled = 
          row.status === "CANCELLED";

        if (!isCOD) {
          return (
            <div>
              <p className="font-medium text-green-600">
                Razorpay
              </p>

              <p className="text-xs text-gray-500">
                Paid Online
              </p>
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-2">
            <span
              className={`text-sm font-medium ${isPaid
                ? "text-green-600"
                : isCancelled
                  ? "text-red-600"
                  : "text-orange-600"
                }`}
            >
              {isPaid
                ? "Paid"
                : isCancelled
                  ? "Cancelled"
                  : "COD"}
            </span>

            {!isPaid &&
              row.status ===
              "DELIVERED" && (
                <button
                  onClick={() =>
                    updatePayment.mutate({
                      id: row.id,
                      status:
                        "SUCCESS",
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
              {
                label: "Pending",
                value:
                  "PENDING",
              },
              {
                label: "Paid",
                value: "PAID",
              },
              {
                label:
                  "Shipped",
                value:
                  "SHIPPED",
              },
              {
                label:
                  "Delivered",
                value:
                  "DELIVERED",
              },
              {
                label:
                  "Cancelled",
                value:
                  "CANCELLED",
              },
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