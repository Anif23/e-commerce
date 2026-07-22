import { useState } from "react";

import {
  BellRing,
  Send,
  Megaphone,
  Users,
} from "lucide-react";

import PageHeader from "../../../../components/Ecommerce/Admin/PageHeader";
import StatsCard from "../../../../components/Ecommerce/StatsCard";
import InputField from "../../../../components/Ecommerce/Forms/InputField";
import TextAreaField from "../../../../components/Ecommerce/Forms/TextAreaField";
import SectionCard from "../../../../components/Ecommerce/Forms/SectionCard";
import DataTable from "../../../../components/Ecommerce/Admin/DataTable";
import FilterBar from "../../../../components/Ecommerce/Admin/FilterBar";

import {
  useAdminCampaigns,
  useAdminCreateCampaign,
  useUpdateCampaignStatus,
  useDeleteCampaign
} from "../../../../hooks/admin/useAdminCampaigns";
import Pagination from "../../../../components/Ecommerce/Admin/Pagination";

const Campaigns = () => {
  const [search, setSearch] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [status, setStatus] =
    useState("ALL");

  const { data, isLoading } =
    useAdminCampaigns({
      page,
      search,
      status,
    });

  const notifications =
    data?.data || [];

  const pg =
    data?.pagination || {};

  const createCampaign =
    useAdminCreateCampaign();

  const updateStatus =
    useUpdateCampaignStatus();

  const deleteCampaign =
    useDeleteCampaign();

  const [form, setForm] =
    useState({
      title: "",
      message: "",
      startAt: "",
      endAt: "",
    });

  const updateField = (
    key: string,
    value: string
  ) =>
    setForm((p) => ({
      ...p,
      [key]: value,
    }));

  const handleSubmit = (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    createCampaign.mutate(
      form,
      {
        onSuccess: () => {

          setForm({
            title: "",
            message: "",
            startAt: "",
            endAt: "",
          });

        },
      }
    );

  };

  const columns = [

    {
      header: "Title",
      accessor: "title",
    },

    {
      header: "Message",

      render: (row: any) => (
        <p className="max-w-xs truncate">
          {row.message}
        </p>
      )
    },

    {
      header: "Start",

      render: (row: any) =>
        row.startAt
          ? new Date(
            row.startAt
          ).toLocaleString()
          : "-"
    },

    {
      header: "End",

      render: (row: any) =>
        row.endAt
          ? new Date(
            row.endAt
          ).toLocaleString()
          : "-"
    },

    {
      header: "Status",

      render: (row: any) => (

        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${row.isActive
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
            }`}
        >
          {
            row.isActive
              ? "Active"
              : "Inactive"
          }
        </span>

      )
    },

  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        subtitle="Manage announcements across your ecommerce platform"
      />
      <div className="grid md:grid-cols-4 gap-5">
        <StatsCard
          title="Announcements"
          value={pg.total || 0}
          icon={<Megaphone />}
        />

        <StatsCard
          title="Active"
          value={
            notifications.filter(
              (item: any) =>
                item.isActive
            ).length
          }
          icon={<BellRing />}
        />

        <StatsCard
          title="Inactive"
          value={
            notifications.filter(
              (item: any) =>
                !item.isActive
            ).length
          }
          icon={<Users />}
        />

        <StatsCard
          title="Scheduled"
          value={
            notifications.filter(
              (item: any) =>
                item.startAt &&
                new Date(
                  item.startAt
                ) > new Date()
            ).length
          }
          icon={<Send />}
        />
      </div>

      <form
        onSubmit={
          handleSubmit
        }
      >
        <SectionCard
          title="Create Announcement"
        >

          <div className="grid md:grid-cols-2 gap-4">

            <InputField
              label="Title"
              value={form.title}
              onChange={(e) =>
                updateField("title", e.target.value)
              }
              placeholder="Summer Sale 🔥"
            />

            <InputField
              type="datetime-local"
              label="Start Date"
              value={form.startAt}
              onChange={(e) =>
                updateField("startAt", e.target.value)
              }
            />

            <InputField
              type="datetime-local"
              label="End Date"
              value={form.endAt}
              onChange={(e) =>
                updateField("endAt", e.target.value)
              }
            />

          </div>

          <div className="mt-4">
            <TextAreaField
              label="Message"
              value={form.message}
              onChange={(e) =>
                updateField("message", e.target.value)
              }
              placeholder="Get up to 50% off on selected products."
            />
          </div>

          <button
            type="submit"
            className="mt-5 h-12 px-6 rounded-2xl bg-black text-white font-medium"
          >
            Publish Announcement
          </button>

        </SectionCard>
      </form>

      <SectionCard title="Notification History">
        <FilterBar
          search={search}
          setSearch={(value) => {

            setSearch(value);

            setPage(1);

          }}
          total={pg.total || 0}
          selects={[
            {
              value: status,

              onChange: (value) => {

                setStatus(value);

                setPage(1);

              },

              options: [

                {
                  label: "All",
                  value: "ALL",
                },

                {
                  label: "Active",
                  value: "ACTIVE",
                },

                {
                  label: "Inactive",
                  value: "INACTIVE",
                },

              ],
            },
          ]}
        />

        <div className="mt-5">
          <DataTable
            loading={isLoading}
            columns={columns}
            rows={notifications}
            actions={{

              onEdit: (row: any) => {

                updateStatus.mutate({
                  id: row.id,
                  isActive:
                    !row.isActive,

                });
              },

              onDelete: (row: any) => {
                deleteCampaign.mutate(
                  row.id
                );

              },
            }}
          />
        </div>
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
      </SectionCard>
    </div>
  );
};

export default Campaigns;