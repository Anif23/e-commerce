import { useNavigate } from "react-router-dom";
import {
  Package,
  CheckCircle,
  Clock,
  IndianRupee,
} from "lucide-react";

import EmptyState from "../../../../components/Ecommerce/EmptyState";
import StatsCard from "../../../../components/Ecommerce/StatsCard";
import FilterBar from "../../../../components/Ecommerce/Admin/FilterBar";
import Pagination from "../../../../components/Ecommerce/Admin/Pagination";

import { useOrders } from "../../../../hooks/user/useOrders";
import { useState } from "react";

const statusColors: any = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-700",
  PAID: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-indigo-100 text-indigo-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const UserOrders = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } =
    useOrders({
      page,
      search,
    });

  const orders =
    data?.data || [];

  const pg =
    data?.pagination || {};

  if (isLoading) {
    return (
      <div className="text-center py-20">
        Loading orders...
      </div>
    );
  }

  const totalSpent = orders.reduce(
    (acc: number, order: any) =>
      acc + order.total,
    0
  );

  const deliveredOrders =
    orders.filter(
      (order: any) =>
        order.status ===
        "DELIVERED"
    ).length;

  const pendingOrders =
    orders.filter(
      (order: any) =>
        order.status ===
        "PENDING_PAYMENT" ||
        order.status ===
        "PROCESSING"
    ).length;

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold">
          My Orders
        </h1>

        <p className="text-gray-500 mt-1">
          Track and manage your
          purchases
        </p>
      </div>

      {/* Stats */}

      <div className="grid md:grid-cols-4 gap-4">

        <StatsCard
          title="Orders"
          value={pg.total || 0}
          icon={<Package />}
        />

        <StatsCard
          title="Delivered"
          value={deliveredOrders}
          icon={<CheckCircle />}
        />

        <StatsCard
          title="Pending"
          value={pendingOrders}
          icon={<Clock />}
        />

        <StatsCard
          title="Total Spent"
          value={`$${totalSpent.toFixed(
            2
          )}`}
          icon={<IndianRupee />}
        />

      </div>

      <FilterBar
        search={search}
        setSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        total={pg.total || 0}
      />

      {!orders.length ? (
        <EmptyState
          title="No Orders Yet"
          description="Your placed orders will appear here."
        />
      ) : (
        <div className="space-y-4">

          {orders.map(
            (order: any) => (
              <div
                key={order.id}
                onClick={() =>
                  navigate(
                    `/user/ecommerce/orders/${order.id}`
                  )
                }
                className="bg-white border rounded-xl p-5 cursor-pointer hover:shadow-md transition"
              >

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                  <div>

                    <h3 className="font-semibold">
                      Order #
                      {order.id}
                    </h3>

                    <p className="text-sm text-gray-500">
                      {new Date(
                        order.createdAt
                      ).toLocaleDateString()}
                    </p>

                  </div>

                  <div>

                    <p className="text-sm text-gray-500">
                      Items
                    </p>

                    <p className="font-medium">
                      {
                        order.items
                          .length
                      }{" "}
                      Products
                    </p>

                  </div>

                  <div>

                    <p className="text-sm text-gray-500">
                      Total
                    </p>

                    <p className="font-semibold">
                      $
                      {
                        order.total
                      }
                    </p>

                  </div>

                  <div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}
                    >
                      {order.status.replaceAll(
                        "_",
                        " "
                      )}
                    </span>

                  </div>

                </div>

                {/* Product Images */}

                <div className="flex gap-2 mt-4 overflow-x-auto">

                  {order.items
                    .slice(0, 5)
                    .map(
                      (
                        item: any
                      ) => (
                        <img
                          key={
                            item.id
                          }
                          src={
                            item
                              .product
                              ?.images?.[0]
                              ?.url ||
                            "/placeholder.png"
                          }
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover border"
                        />
                      )
                    )}

                  {order.items
                    .length >
                    5 && (
                      <div className="w-16 h-16 rounded-lg border bg-gray-50 flex items-center justify-center text-sm font-medium">
                        +
                        {order
                          .items
                          .length -
                          5}
                      </div>
                    )}

                </div>

              </div>
            )
          )}

        </div>
      )}

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

export default UserOrders;