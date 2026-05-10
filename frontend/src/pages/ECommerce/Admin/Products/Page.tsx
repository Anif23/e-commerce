// pages/Admin/Ecommerce/Products/index.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Star,
  AlertTriangle,
} from "lucide-react";

import PageHeader from "../../../../components/Ecommerce/Admin/PageHeader";
import StatsCard from "../../../../components/Ecommerce/StatsCard";
import FilterBar from "../../../../components/Ecommerce/Admin/FilterBar";
import DataTable from "../../../../components/Ecommerce/Admin/DataTable";
import Pagination from "../../../../components/Ecommerce/Admin/Pagination";

import {
  useAdminProducts,
  useDeleteProduct,
} from "../../../../hooks/admin/useAdminProducts";

const Products = () => {
  const navigate =
    useNavigate();

  const deleteProduct =
    useDeleteProduct();

  const [page, setPage] =
    useState(1);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("all");

  const { data, isLoading } =
    useAdminProducts({
      page,
      search,
      isActive:
        status === "all"
          ? undefined
          : status === "active"
            ? true
            : false,
    });

  const products =
    (data as any)?.data || [];

  const pg =
    (data as any)?.pagination || {};

  const columns = [
    {
      header: "Product",
      render: (row: any) => (
        <div className="flex gap-3 items-center">
          <img
            src={
              row.images?.[0]
                ?.url
            }
            className="w-10 h-10 rounded-xl object-cover"
          />

          <div>
            <p>{row.name}</p>
            <p className="text-xs text-gray-400">
              {
                row.category
                  ?.name
              }
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Price",
      render: (row: any) =>
        `₹${row.price}`,
    },
    {
      header: "Stock",
      accessor: "stock",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle="Manage products"
        buttonText="Add Product"
        onClick={() =>
          navigate(
            "/admin/ecommerce/product"
          )
        }
      />

      <div className="grid md:grid-cols-3 gap-5">
        <StatsCard
          title="Products"
          value={pg.total || 0}
          icon={<Package />}
        />

        <StatsCard
          title="Low Stock"
          value={products.filter(
            (p: any) =>
              p.stock <=
              p.lowStock
          ).length}
          icon={
            <AlertTriangle />
          }
        />

        <StatsCard
          title="Featured"
          value={products.filter(
            (p: any) =>
              p.isFeatured
          ).length}
          icon={<Star />}
        />
      </div>

      <FilterBar
        search={search}
        setSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        total={pg.total || 0}
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
                label: "Active",
                value:
                  "active",
              },
              {
                label:
                  "Inactive",
                value:
                  "inactive",
              },
            ],
          },
        ]}
      />

      <DataTable
        loading={isLoading}
        columns={columns}
        rows={products}
        actions={{
          onEdit: (
            row
          ) =>
            navigate(
              `/admin/ecommerce/product/${row.id}`
            ),

          onDelete: (
            row
          ) =>
            deleteProduct.mutate(
              row.id
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

export default Products;