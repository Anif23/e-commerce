// pages/Admin/Ecommerce/Orders/Detail.tsx

import { useParams } from "react-router-dom";

import {
  Package,
  User,
  MapPin,
  CreditCard,
} from "lucide-react";

import PageHeader from "../../../../components/Ecommerce/Admin/PageHeader";
import StatsCard from "../../../../components/Ecommerce/StatsCard";

import {
  useAdminOrderById,
  useUpdateOrderStatus,
} from "../../../../hooks/admin/useAdminOrders";

const statuses = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const OrderDetail = () => {

  const { id } =
    useParams();

  const {
    data,
    isLoading,
  } =
    useAdminOrderById(Number(id));

  const updateStatus =
    useUpdateOrderStatus();

  const order =
    data?.data;

  if (isLoading) {
    return (
      <div className="p-10">
        Loading...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-10">
        Order not found
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <PageHeader
        title={`Order #${order.id}`}
        subtitle="Order details"
      />

      {/* STATS */}
      <div className="grid md:grid-cols-3 gap-5">

        <StatsCard
          title="Items"
          value={
            order.items?.length || 0
          }
          icon={<Package />}
        />

        <StatsCard
          title="Amount"
          value={`$${order.total.toLocaleString()}`}
          icon={<CreditCard />}
        />

        <StatsCard
          title="Status"
          value={order.status}
          icon={<Package />}
        />

      </div>

      {/* CUSTOMER */}
      <div className="bg-white rounded-3xl border p-6 space-y-5">

        <h2 className="text-lg font-bold">
          Customer
        </h2>

        <div className="flex items-center gap-4">

          <div className="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center">
            <User />
          </div>

          <div>
            <p className="font-semibold">
              {
                order.user
                  ?.username
              }
            </p>

            <p className="text-sm text-gray-500">
              {
                order.user
                  ?.email
              }
            </p>
          </div>

        </div>

      </div>

      {/* SHIPPING */}
      <div className="bg-white rounded-3xl border p-6 space-y-5">

        <h2 className="text-lg font-bold">
          Shipping Address
        </h2>

        <div className="flex gap-3">

          <MapPin
            className="mt-1"
            size={18}
          />

          <div className="text-sm text-gray-600">
            <p>
              {
                order.address
                  ?.fullName
              }
            </p>

            <p>
              {
                order.address
                  ?.phone
              }
            </p>

            <p>
              {
                order.address
                  ?.address1 || order.address2
                  ? `${order.address?.address1}, ${order.address?.address2}`
                  : "N/A"
              }
            </p>

            <p>
              {
                order.address
                  ?.city
              }
              ,{" "}
              {
                order.address
                  ?.zipCode
              }
            </p>

            <p>
              {
                order.address
                  ?.state
              }
              ,{" "}
              {
                order.address
                  ?.country
              }
            </p>

          </div>

        </div>

      </div>

      {/* PAYMENT */}
      <div className="bg-white rounded-3xl border p-6 space-y-5">

        <h2 className="text-lg font-bold">
          Payment
        </h2>

        <div className="flex gap-3">

          <CreditCard
            className="mt-1"
            size={18}
          />

          <div className="text-sm text-gray-600">
            <p>
              Provider: {order.payment?.provider}
            </p>

            <p>
              Status: {order.payment?.status}
            </p>

            {order.payment?.paymentId && (
              <p>
                Payment ID: {order.payment?.paymentId}
              </p>
            )}

          </div>

        </div>

      </div>

      {/* ITEMS */}
      <div className="bg-white rounded-3xl border overflow-hidden">

        <div className="p-6 border-b flex items-center justify-between">

          <h2 className="text-lg font-bold">
            Order Items
          </h2>

          <select
            value={
              order.status
            }
            onChange={(e) =>
              updateStatus.mutate(
                {
                  id:
                    order.id,

                  status:
                    e.target
                      .value,
                }
              )
            }
            className="border rounded-xl px-3 py-2 text-sm"
          >

            {statuses.map(
              (s) => (
                <option
                  key={s}
                  value={s}
                >
                  {s}
                </option>
              )
            )}

          </select>

        </div>

        <div className="divide-y">

          {order.items?.map(
            (item: any) => (
              <div
                key={item.id}
                className="p-5 flex items-center gap-4"
              >

                <img
                  src={
                    item.product
                      ?.images?.[0]
                      ?.url
                  }
                  className="w-18 h-18 rounded-2xl object-cover border"
                />

                <div className="flex-1">

                  <p className="font-semibold">
                    {
                      item.product
                        ?.name
                    }
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    Qty:{" "}
                    {
                      item.quantity
                    }
                  </p>

                </div>

                <p className="font-bold">
                  $
                  {item.price.toLocaleString()}
                </p>

              </div>
            )
          )}

        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end">

          <div className="space-y-2 text-right">

            <p className="text-sm text-gray-500">
              Total Amount
            </p>

            <h2 className="text-2xl font-bold">
              ${order.total}
            </h2>

          </div>

        </div>

      </div>

    </div>
  );
};

export default OrderDetail;