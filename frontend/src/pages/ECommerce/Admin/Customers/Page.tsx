// pages/Admin/Ecommerce/Customers/index.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Users,
  ShoppingBag,
  Heart,
  IndianRupee,
} from "lucide-react";

import PageHeader from "../../../../components/Ecommerce/Admin/PageHeader";
import StatsCard from "../../../../components/Ecommerce/StatsCard";
import FilterBar from "../../../../components/Ecommerce/Admin/FilterBar";
import DataTable from "../../../../components/Ecommerce/Admin/DataTable";
import Pagination from "../../../../components/Ecommerce/Admin/Pagination";

import {
  useAdminCustomers,
} from "../../../../hooks/admin/useAdminCustomer";

const Customers = () => {
  const navigate =
    useNavigate();

  const [page, setPage] =
    useState(1);

  const [search, setSearch] =
    useState("");

  const { data, isLoading } =
    useAdminCustomers({
      page,
      search,
    });

  const customers =
    data?.data || [];

  const pg =
    data?.pagination || {};

  const columns = [
    {
      header: "Customer",

      render: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center font-bold">
            {row.username?.[0]}
          </div>

          <div>
            <p className="font-medium">
              {row.username}
            </p>

            <p className="text-xs text-gray-400">
              {row.email}
            </p>
          </div>
        </div>
      ),
    },

    {
      header: "Orders",

      accessor: "orderCount",
    },

    {
      header: "Wishlist",

      accessor:
        "wishlistCount",
    },

    {
      header: "Spent",

      render: (row: any) =>
        `${row.totalSpent}`,
    },

    {
      header: "Joined",

      render: (row: any) =>
        new Date(
          row.createdAt
        ).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">

      <PageHeader
        title="Customers"
        subtitle="Manage and monitor customer activity"
        // buttonText="Push Notifications"
        // onClick={() =>
        //   navigate(
        //     "/admin/ecommerce/notifications"
        //   )
        // }
      />

      <div className="grid md:grid-cols-4 gap-5">

        <StatsCard
          title="Customers"
          value={pg.total || 0}
          icon={<Users />}
        />

        <StatsCard
          title="Orders"
          value={customers.reduce(
            (
              acc: number,
              item: any
            ) =>
              acc +
              item.orderCount,
            0
          )}
          icon={
            <ShoppingBag />
          }
        />

        <StatsCard
          title="Wishlist"
          value={customers.reduce(
            (
              acc: number,
              item: any
            ) =>
              acc +
              item.wishlistCount,
            0
          )}
          icon={<Heart />}
        />

        <StatsCard
          title="Revenue"
          value={`${customers.reduce(
            (
              acc: number,
              item: any
            ) =>
              acc +
              item.totalSpent,
            0
          )}`}
          icon={
            <IndianRupee />
          }
        />

      </div>

      <FilterBar
        search={search}
        setSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        total={pg.total || 0}
      />

      <DataTable
        loading={isLoading}
        columns={columns}
        rows={customers}
        actions={{
          onView: (row) =>
            navigate(
              `/admin/ecommerce/customer/${row.id}`
            ),
        }}
      />

      <Pagination
        page={pg.page}
        totalPages={
          pg.totalPages
        }
        hasNext={pg.hasNext}
        hasPrev={pg.hasPrev}
        setPage={setPage}
      />

    </div>
  );
};

export default Customers;