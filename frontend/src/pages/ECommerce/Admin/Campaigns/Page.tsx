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
  useSendCampaignNotification,
  useAdminCustomers,
} from "../../../../hooks/admin/useAdminCustomer";

const Notifications = () => {
  const [search, setSearch] =
    useState("");

  const [userId, setUserId] =
    useState("all");

  const { data: usersData } =
    useAdminCustomers({
      search,
    });

  const users =
    usersData?.data || [];

  const { data: notificationsData } =
    useAdminCampaigns({
      userId:
        userId === "all"
          ? undefined
          : userId,
    });

  const notifications =
    notificationsData?.data || [];

  const sendNotification =
    useSendCampaignNotification();

  const [form, setForm] =
    useState({
      title: "",
      message: "",
      userId: "",
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

    sendNotification.mutate(
      {
        ...form,
        userId:
          form.userId || undefined,
      },
      {
        onSuccess: () => {
          setForm({
            title: "",
            message: "",
            userId: "",
          });
        },
      }
    );
  };


  const columns = [
    {
      header: "User",
      render: (row: any) => (
        <div>
          <p className="font-medium">
            {
              row.user
                ?.username
            }
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
      header: "Title",
      accessor: "title",
    },

    {
      header: "Message",
      accessor: "message",
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Push Notifications"
        subtitle="Send realtime notifications to customers"
      />

      <div className="grid md:grid-cols-4 gap-5">
        <StatsCard
          title="Users"
          value={
            users.length
          }
          icon={<Users />}
        />

        <StatsCard
          title="Campaign"
          value="Live"
          icon={
            <Megaphone />
          }
        />

        <StatsCard
          title="Push Service"
          value="Connected"
          icon={
            <BellRing />
          }
        />

        <StatsCard
          title="Delivery"
          value="Realtime"
          icon={<Send />}
        />
      </div>

      <form
        onSubmit={
          handleSubmit
        }
      >
        <SectionCard title="Send Notification">
          <div className="space-y-4">
            <select
              value={
                form.userId
              }
              onChange={(
                e
              ) =>
                updateField(
                  "userId",
                  e.target
                    .value
                )
              }
              className="w-full border rounded-2xl px-4 h-12"
            >
              <option value="">
                All Users
              </option>

              {users.map(
                (
                  user: any
                ) => (
                  <option
                    key={
                      user.id
                    }
                    value={
                      user.id
                    }
                  >
                    {
                      user.username
                    }
                  </option>
                )
              )}
            </select>

            <InputField
              label="Title"
              value={
                form.title
              }
              onChange={(
                e
              ) =>
                updateField(
                  "title",
                  e.target
                    .value
                )
              }
              placeholder="Big Sale 🔥"
            />

            <TextAreaField
              label="Message"
              value={
                form.message
              }
              onChange={(
                e
              ) =>
                updateField(
                  "message",
                  e.target
                    .value
                )
              }
            />

            <button className="h-12 px-6 rounded-2xl bg-black text-white font-medium">
              Send Notification
            </button>
          </div>
        </SectionCard>
      </form>

      <SectionCard title="Notification History">
        <FilterBar
          search={search}
          setSearch={
            setSearch
          }
          total={
            notifications.length
          }
          selects={[
            {
              value:
                userId,
              onChange:
                setUserId,
              options: [
                {
                  label:
                    "All Users",
                  value:
                    "all",
                },

                ...users.map(
                  (
                    user: any
                  ) => ({
                    label:
                      user.username,
                    value:
                      String(
                        user.id
                      ),
                  })
                ),
              ],
            },
          ]}
        />

        <div className="mt-5">
          <DataTable
            columns={
              columns
            }
            rows={
              notifications
            }
          />
        </div>
      </SectionCard>
    </div>
  );
};

export default Notifications;