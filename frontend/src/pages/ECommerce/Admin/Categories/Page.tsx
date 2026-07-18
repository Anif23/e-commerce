import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  FolderTree,
  Image as ImageIcon,
  Layers3,
} from "lucide-react";

import PageHeader from "../../../../components/Ecommerce/Admin/PageHeader";
import StatsCard from "../../../../components/Ecommerce/StatsCard";
import FilterBar from "../../../../components/Ecommerce/Admin/FilterBar";
import DataTable from "../../../../components/Ecommerce/Admin/DataTable";
import Pagination from "../../../../components/Ecommerce/Admin/Pagination";

import {
  useAdminCategories,
  useDeleteCategory,
} from "../../../../hooks/admin/useAdminCategories";

const Categories = () => {
  const navigate =
    useNavigate();

  const deleteCategory =
    useDeleteCategory();

  const [page, setPage] =
    useState(1);

  const [search, setSearch] =
    useState("");

  const { data, isLoading } =
    useAdminCategories({
      page,
      search,
    });

  const categories =
    data?.data || [];

  const pg =
    data?.pagination ||
    {};

  const columns = [
    {
      header:
        "Category",

      render: (
        row: any
      ) => (
        <div className="flex gap-3 items-center">
          <img
            src={
              row.image
            }
            className="w-12 h-12 rounded-xl border object-cover"
          />

          <div>
            <p className="font-medium">
              {row.name}
            </p>

            <p className="text-xs text-gray-400">
              #{row.id}
            </p>
          </div>
        </div>
      ),
    },

    {
      header:
        "Slug",
      accessor:
        "slug",
    },

    {
      header:
        "Status",
      render: (
        row: any
      ) => (
        <span
          className={`px-3 py-1 rounded-full text-xs ${row.image
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-500"
            }`}
        >
          {row.image
            ? "Image"
            : "No Image"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        subtitle="Manage categories"
        buttonText="Add Category"
        onClick={() =>
          navigate(
            "/admin/ecommerce/category"
          )
        }
      />

      <div className="grid md:grid-cols-3 gap-5">
        <StatsCard
          title="Categories"
          value={
            pg.total ||
            0
          }
          icon={
            <FolderTree />
          }
        />

        <StatsCard
          title="Collections"
          value={
            pg.total ||
            0
          }
          icon={
            <Layers3 />
          }
        />
      </div>

      <FilterBar
        search={
          search
        }
        setSearch={
          setSearch
        }
        total={
          pg.total ||
          0
        }
      />

      <DataTable
        loading={
          isLoading
        }
        columns={
          columns
        }
        rows={
          categories
        }
        actions={{
          onEdit:
            (
              row
            ) =>
              navigate(
                `/admin/ecommerce/category/${row.id}`
              ),

          onDelete:
            (
              row
            ) =>
              deleteCategory.mutate(
                row.id
              ),
        }}
      />

      <Pagination
        page={
          pg.page ||
          1
        }
        totalPages={
          pg.totalPages ||
          1
        }
        hasNext={
          pg.hasNext
        }
        hasPrev={
          pg.hasPrev
        }
        setPage={
          setPage
        }
      />
    </div>
  );
};

export default Categories;