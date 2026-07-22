import { useParams } from "react-router-dom";
import { useOrder } from "../../../../hooks/user/useOrders";

const statusColors: any = {
    PENDING_PAYMENT: "bg-yellow-100 text-yellow-700",
    PAID: "bg-blue-100 text-blue-700",
    PROCESSING: "bg-indigo-100 text-indigo-700",
    SHIPPED: "bg-purple-100 text-purple-700",
    DELIVERED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
};

const OrderDetail = () => {

    const { id } = useParams();

    const orderId = Number(id);

    const { data: order, isLoading } = useOrder(orderId);

    if (isLoading) return <div className="text-center mt-10">Loading...</div>;

    if (!order) return <div className="text-center mt-10">Order not found</div>;

    const steps =
        order.payment?.provider === "COD"
            ? [
                {
                    key: "PROCESSING",
                    label: "Order Placed",
                },
                {
                    key: "SHIPPED",
                    label: "Shipped",
                },
                {
                    key: "DELIVERED",
                    label: "Delivered",
                },
            ]
            : [
                {
                    key: "PENDING_PAYMENT",
                    label: "Payment Pending",
                },
                {
                    key: "PAID",
                    label: "Paid",
                },
                {
                    key: "PROCESSING",
                    label: "Processing",
                },
                {
                    key: "SHIPPED",
                    label: "Shipped",
                },
                {
                    key: "DELIVERED",
                    label: "Delivered",
                },
            ];

    const currentStep =
        steps.findIndex(
            (s) =>
                s.key ===
                order.status
        );

    return (
        <div className="max-w-5xl mx-auto pb-10 space-y-6">

            <h1 className="text-2xl font-bold">Order #{order.id}</h1>

            {/* 🧾 SUMMARY */}
            <div className="grid md:grid-cols-3 gap-4">

                <div className="bg-white rounded-2xl p-5 shadow">
                    <p className="text-sm text-gray-500">
                        Order Date
                    </p>

                    <p className="font-semibold mt-1">
                        {new Date(
                            order.createdAt
                        ).toLocaleString()}
                    </p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow">
                    <p className="text-sm text-gray-500">
                        Order Status
                    </p>

                    <span
                        className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}
                    >
                        {order.status.replaceAll(
                            "_",
                            " "
                        )}
                    </span>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow">
                    <p className="text-sm text-gray-500">
                        Total Amount
                    </p>

                    <p className="font-bold text-2xl mt-1">
                        ${order.total}
                    </p>
                </div>

            </div>

            <div className="bg-white rounded-2xl p-6 shadow">

                <h2 className="font-bold text-lg mb-8">
                    Order Tracking
                </h2>

                <div className="relative flex justify-between">

                    {steps.map((step, index) => (

                        <div
                            key={step.key}
                            className="flex flex-col items-center flex-1 relative"
                        >

                            {index !==
                                steps.length - 1 && (
                                    <div
                                        className={`absolute top-5 left-1/2 w-full h-1 ${index < currentStep
                                            ? "bg-green-500"
                                            : "bg-gray-200"
                                            }`}
                                    />
                                )}

                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center z-10 font-semibold
            ${index <= currentStep
                                        ? "bg-green-500 text-white"
                                        : "bg-gray-200 text-gray-500"
                                    }`}
                            >
                                {index < currentStep
                                    ? "✓"
                                    : index + 1}
                            </div>

                            <p className="text-xs text-center mt-3 font-medium">
                                {step.label}
                            </p>

                        </div>

                    ))}

                </div>

            </div>

            {/* 📦 ITEMS */}
            <div className="bg-white rounded-2xl p-6 shadow">

                <h2 className="font-bold text-lg mb-5">
                    Ordered Products
                </h2>

                <div className="space-y-4">

                    {order.items.map(
                        (item: any) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-4 border rounded-xl p-4"
                            >

                                <img
                                    src={
                                        item.product
                                            ?.images?.[0]
                                            ?.url ||
                                        "/placeholder.png"
                                    }
                                    alt=""
                                    className="w-24 h-24 rounded-xl object-cover"
                                />

                                <div className="flex-1">

                                    <h3 className="font-semibold">
                                        {item.product?.name}
                                    </h3>

                                    <p className="text-sm text-gray-500 mt-1">
                                        Quantity:
                                        {" "}
                                        {item.quantity}
                                    </p>

                                    <p className="text-sm text-gray-500">
                                        Price:
                                        {" "}
                                        $
                                        {item.price}
                                    </p>

                                </div>

                                <div className="text-right">

                                    <p className="text-sm text-gray-500">
                                        Total
                                    </p>

                                    <p className="font-bold text-lg">
                                        $
                                        {(
                                            item.price *
                                            item.quantity
                                        ).toFixed(2)}
                                    </p>

                                </div>

                            </div>
                        )
                    )}

                </div>

            </div>

            {/* 💳 PAYMENT */}
            <div className="bg-white rounded-2xl p-6 shadow">

                <h2 className="font-bold text-lg mb-4">
                    Payment Details
                </h2>

                <div className="grid md:grid-cols-2 gap-4">

                    <div>
                        <p className="text-sm text-gray-500">
                            Payment Method
                        </p>

                        <p className="font-medium">
                            {order.payment?.provider}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Payment Status
                        </p>

                        <p className="font-medium">
                            {order.payment?.status}
                        </p>
                    </div>

                </div>

            </div>

        </div>
    );
};

export default OrderDetail;