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
} from "../../../../hooks/admin/useAdminOrders";

const Orders = () => {
  const navigate =
    useNavigate();

  const updateStatus =
    useUpdateOrderStatus();

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
        <div>
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
            "PAID",
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
      ),
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