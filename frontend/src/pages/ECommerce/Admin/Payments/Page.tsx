import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  DollarSignIcon,
} from "lucide-react";

import PageHeader from "../../../../components/Ecommerce/Admin/PageHeader";
import StatsCard from "../../../../components/Ecommerce/StatsCard";
import FilterBar from "../../../../components/Ecommerce/Admin/FilterBar";
import DataTable from "../../../../components/Ecommerce/Admin/DataTable";
import Pagination from "../../../../components/Ecommerce/Admin/Pagination";

import {
  useAdminPayments
} from "../../../../hooks/admin/useAdminPayments";

const AdminPayments = () => {
  const navigate =
    useNavigate();

  const [page, setPage] =
    useState(1);

  const [search, setSearch] =
    useState("");

  const { data, isLoading } =
    useAdminPayments({
      page,
      search,
    });

  const payments =
    data?.data || [];

  const pg =
    data?.pagination || {};

  const columns = [
    {
      header: "Customer",

      render: (row: any) => (
        <div>
          <p className="font-medium">
            {row.order?.user?.username}
          </p>

          <p className="text-xs text-gray-400">
            {row.payerEmail || "-"}
          </p>
        </div>
      ),
    },

    {
      header: "Transaction ID",

      render: (row: any) => (
        <span className="font-mono text-xs">
          {row.paymentId || "-"}
        </span>
      ),
    },

    {
      header: "Provider",

      accessor: "provider",
    },

    {
      header: "Amount",

      render: (row: any) =>
        `$${row.amount}`,
    },

    {
      header: "Status",

      render: (row: any) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${row.status === "SUCCESS"
            ? "bg-green-100 text-green-600"
            : row.status === "PENDING"
              ? "bg-yellow-100 text-yellow-600"
              : "bg-red-100 text-red-600"
            }`}
        >
          {row.status}
        </span>
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
        title="Payments"
        subtitle="Monitor payment transactions and revenue"
      />

      <div className="grid md:grid-cols-4 gap-5">

        <StatsCard
          title="Transactions"
          value={pg.total || 0}
          icon={<DollarSignIcon />}
        />

        <StatsCard
          title="Success"
          value={
            payments.filter(
              (p: any) =>
                p.status === "SUCCESS"
            ).length
          }
          icon={<DollarSignIcon />}
        />

        <StatsCard
          title="Pending"
          value={
            payments.filter(
              (p: any) =>
                p.status === "PENDING"
            ).length
          }
          icon={<DollarSignIcon />}
        />

        <StatsCard
          title="Revenue"
          value={`$${payments
            .filter(
              (p: any) =>
                p.status === "SUCCESS"
            )
            .reduce(
              (
                acc: number,
                p: any
              ) => acc + p.amount,
              0
            )}`}
          icon={<DollarSignIcon />}
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
        rows={payments}
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

export default AdminPayments;