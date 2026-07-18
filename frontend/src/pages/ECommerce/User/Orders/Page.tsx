import { useNavigate } from "react-router-dom";
import { useOrders } from "../../../../hooks/user/useOrders";

const statusColors: any = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-600",
  PAID: "bg-blue-100 text-blue-600",
  PROCESSING: "bg-indigo-100 text-indigo-600",
  SHIPPED: "bg-purple-100 text-purple-600",
  DELIVERED: "bg-green-100 text-green-600",
  CANCELLED: "bg-red-100 text-red-600",
};

const UserOrders = () => {

  const navigate = useNavigate();
  const { data: orders = [], isLoading } = useOrders();

  if (isLoading) {
    return <div className="text-center mt-10">Loading orders...</div>;
  }

  if (!orders.length) {
    return (
      <div className="text-center mt-20 text-gray-400">
        No orders yet 🧾
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order: any) => (
          <div
            key={order.id}
            onClick={() => navigate(`/user/ecommerce/orders/${order.id}`)}
            className="bg-white p-5 rounded-xl shadow hover:shadow-md transition cursor-pointer"
          >
            <div className="flex justify-between items-center flex-wrap gap-3">

              {/* LEFT */}
              <div>
                <p className="text-sm text-gray-500">
                  Order #{order.id}
                </p>

                <p className="font-semibold">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* STATUS */}
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status]}`}
              >
                {order.status}
              </span>

              {/* TOTAL */}
              <div className="text-right">
                <p className="text-sm text-gray-500">Total</p>
                <p className="font-bold text-lg">${order.total}</p>
              </div>
            </div>

            {/* ITEMS PREVIEW */}
            <div className="flex gap-2 mt-4 overflow-x-auto">
              {order.items.slice(0, 4).map((item: any) => (
                <img
                  key={item.id}
                  src={item.product?.images?.[0]?.url || "/placeholder.png"}
                  className="w-14 h-14 object-cover rounded"
                />
              ))}
              {order.items.length > 4 && (
                <div className="w-14 h-14 flex items-center justify-center bg-gray-100 rounded text-sm">
                  +{order.items.length - 4}
                </div>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default UserOrders;