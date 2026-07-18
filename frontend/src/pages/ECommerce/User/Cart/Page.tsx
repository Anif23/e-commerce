import { useCart, useRemoveCart, useUpdateCart } from "../../../../hooks/user/useCart";
import { useCheckout } from "../../../../hooks/user/useCheckout";
import { useEffect, useState } from "react";
import { useAuthStore } from "../../../../store/authStore";
import { useCartStore } from "../../../../store/cartStore";
import { useNavigate, useLocation } from "react-router-dom";
import { useAddresses } from "../../../../hooks/user/useAddresses";
import { toast } from "react-hot-toast";
import PaypalButton from "../../../../components/Ecommerce/User/PaypalButton";
import { useCancelOrder, useExpireOrder } from "../../../../hooks/user/useOrders";

const CartPage = () => {

    const navigate = useNavigate();
    const location = useLocation();

    const {
        data,
        isLoading
    } = useCart();

    const cart = data?.cart;
    const pendingOrder = data?.existingOrder;

    const cartStore = useCartStore();

    const items = cart?.items ?? cartStore.items;

    const token = useAuthStore((s) => s.token);

    const updateCart = useUpdateCart();
    const removeCart = useRemoveCart();
    const checkout = useCheckout();
    const cancelOrder = useCancelOrder();

    const expireOrder = useExpireOrder();

    const { data: addresses = [] } = useAddresses();

    const defaultAddress = addresses.find((a: any) => a.isDefault);

    const isPaypalLocked =
        pendingOrder?.payment?.provider === "PAYPAL";

    const [paymentMethod, setPaymentMethod] = useState<"COD" | "PAYPAL">(isPaypalLocked ? "PAYPAL" : "COD");

    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!pendingOrder?.expiresAt) {
            setTimeLeft(0);
            return;
        }

        const update = () => {
            const remaining =
                new Date(pendingOrder.expiresAt).getTime() - Date.now();

            if (remaining <= 0) {
                clearInterval(timer);

                expireOrder.mutate(pendingOrder.id, {
                    onSuccess: () => {
                        toast.error("Payment session expired");
                    },
                });

                return;
            }

            setTimeLeft(remaining);
        };

        update();

        const timer = setInterval(update, 1000);

        return () => clearInterval(timer);

    }, [pendingOrder?.id]);

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);

    if (isLoading) {
        return <div className="text-center mt-10">Loading cart...</div>;
    }

    const total = items.reduce(
        (acc: number, item: any) =>
            acc + item.quantity * item.product.price,
        0
    );

    const handleUpdate = (
        item: any,
        type: "inc" | "dec"
    ) => {
        const qty =
            type === "inc"
                ? item.quantity + 1
                : item.quantity - 1;

        if (qty < 1) return;

        cartStore.update(
            item.product.id,
            qty
        );

        if (token) {
            updateCart.mutate({
                id: item.id,
                data: { quantity: qty },
            });
        }
    };

    const handleRemove = (
        item: any
    ) => {
        cartStore.remove(
            item.product.id
        );

        if (token) {
            removeCart.mutate(item.id);
        }
    };

    const handleCheckout = () => {
        if (!token) {
            navigate("/login", {
                state: {
                    from: location.pathname,
                },
            });
            return;
        }

        if (!addresses.length) {
            toast.error("Please add a delivery address");
            navigate("/user/ecommerce/profile");
            return;
        }

        if (!defaultAddress) {
            toast.error("Please select a default address");
            navigate("/user/ecommerce/profile");
            return;
        }

        checkout.mutate(
            {
                addressId: defaultAddress.id,
                paymentMethod,
            },
            {
                onSuccess: () => {
                    if (paymentMethod === "COD") {
                        toast.success("Order placed successfully");
                        navigate("/user/ecommerce/orders");
                        return;
                    }

                    toast.success(
                        "Order created. Complete your PayPal payment."
                    );
                },

                onError: (error: any) => {
                    toast.error(
                        error?.response?.data?.message ??
                        "Checkout failed"
                    );
                },
            }
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">
                Shopping Cart
            </h1>

            {isPaypalLocked && (
                <div className="mb-6 rounded-2xl border border-yellow-300 bg-yellow-50 p-5 flex justify-between items-center">

                    <div>
                        <h3 className="font-semibold">
                            Payment Pending
                        </h3>

                        <p className="text-sm text-gray-600">
                            Complete your PayPal payment before the order expires.
                        </p>
                    </div>

                    <span className="text-2xl font-bold text-red-600">
                        {minutes}:{String(seconds).padStart(2, "0")}
                    </span>

                </div>
            )}

            {!items.length ? (
                <div className="bg-white rounded-2xl shadow-sm border p-14 text-center">
                    <div className="text-6xl mb-4">
                        🛒
                    </div>

                    <h2 className="text-2xl font-semibold mb-2">
                        Your cart is empty
                    </h2>

                    <p className="text-gray-500 mb-6">
                        Looks like you haven't added anything yet.
                    </p>

                    <button
                        onClick={() =>
                            navigate("/user/ecommerce")
                        }
                        className="bg-black text-white px-6 py-3 rounded-xl"
                    >
                        Continue Shopping
                    </button>
                </div>
            ) : (
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* CART ITEMS */}
                    <div className="lg:col-span-2 space-y-4">
                        {items.map((item: any) => (
                            <div
                                key={item.id}
                                className="bg-white rounded-2xl border shadow-sm p-4 flex gap-4"
                            >
                                <img
                                    src={
                                        item.product.images?.[0]
                                            ?.url
                                    }
                                    className="w-24 h-24 rounded-xl object-cover"
                                />

                                <div className="flex-1">
                                    <h2 className="font-semibold text-lg">
                                        {item.product.name}
                                    </h2>

                                    <p className="text-gray-500 text-sm mt-1">
                                        ${item.product.price}
                                    </p>

                                    {isPaypalLocked ? (
                                        <p className="text-sm text-gray-500 mt-4">
                                            Qty: {item.quantity}
                                        </p>
                                    ) : (
                                        <div className="flex items-center gap-3 mt-4">
                                            <button
                                                onClick={() =>
                                                    handleUpdate(
                                                        item,
                                                        "dec"
                                                    )
                                                }
                                                className="w-8 h-8 rounded-lg border"
                                            >
                                                -
                                            </button>

                                            <span className="font-medium">
                                                {item.quantity}
                                            </span>

                                            <button
                                                onClick={() =>
                                                    handleUpdate(
                                                        item,
                                                        "inc"
                                                    )
                                                }
                                                className="w-8 h-8 rounded-lg border"
                                            >
                                                +
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {!isPaypalLocked && (
                                    <div className="flex flex-col justify-between items-end">
                                        <button
                                            onClick={() =>
                                                handleRemove(item)
                                            }
                                            className="text-sm text-red-500"
                                        >
                                            Remove
                                        </button>

                                        <div className="font-bold text-lg">
                                            $
                                            {item.product.price *
                                                item.quantity}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="lg:col-span-1">
                        {/* ADDRESS */}
                        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-8">

                            <h2 className="text-xl font-bold mb-6">
                                Delivery Address
                            </h2>

                            {defaultAddress ? (

                                <div className="border rounded-2xl p-4 bg-gray-50">

                                    <p className="font-semibold">
                                        {
                                            defaultAddress.fullName
                                        }
                                    </p>

                                    <p>
                                        {
                                            defaultAddress.phone
                                        }
                                    </p>

                                    <p className="text-gray-600 mt-1">
                                        {
                                            defaultAddress.address1
                                        }
                                        ,{" "}
                                        {
                                            defaultAddress.city
                                        }
                                        ,{" "}
                                        {
                                            defaultAddress.state
                                        }
                                    </p>

                                </div>

                            ) : (

                                <button
                                    disabled={isPaypalLocked}
                                    onClick={() =>
                                        navigate(
                                            "/user/ecommerce/profile"
                                        )
                                    }
                                    className="w-full border border-dashed rounded-2xl p-4 text-sm text-gray-500 hover:bg-gray-50"
                                >
                                    + Add Address
                                </button>

                            )}

                        </div>

                        {/* SUMMARY */}
                        <div className="bg-white rounded-2xl border shadow-sm p-6 h-fit sticky top-24">
                            <h2 className="text-xl font-bold mb-6">
                                Order Summary
                            </h2>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span>
                                        Items (
                                        {items.length})
                                    </span>

                                    <span>
                                        ${total}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span>Delivery</span>

                                    <span className="text-green-600">
                                        Free
                                    </span>
                                </div>

                                <div className="border-t pt-4 flex justify-between font-bold text-lg">
                                    <span>Total</span>

                                    <span>
                                        ${total}
                                    </span>
                                </div>
                            </div>

                            {/* PAYMENT */}
                            <div className="mt-8">
                                <h3 className="font-semibold mb-4">
                                    Payment Method
                                </h3>

                                <div className="space-y-3">
                                    <label className="border rounded-xl p-4 flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            disabled={isPaypalLocked}
                                            checked={
                                                paymentMethod ===
                                                "COD"
                                            }
                                            onChange={() =>
                                                setPaymentMethod(
                                                    "COD"
                                                )
                                            }
                                        />

                                        <span>
                                            Cash on Delivery
                                        </span>
                                    </label>

                                    <label className="border rounded-xl p-4 flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            disabled={isPaypalLocked}
                                            checked={paymentMethod === "PAYPAL"}
                                            onChange={() =>
                                                setPaymentMethod(
                                                    "PAYPAL"
                                                )
                                            }
                                        />

                                        <span>
                                            PayPal
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {!isPaypalLocked ? (

                                <button
                                    onClick={handleCheckout}
                                    disabled={checkout.isPending}
                                    className="w-full bg-black text-white py-3 rounded-xl mt-8 disabled:opacity-50"
                                >
                                    {checkout.isPending
                                        ? "Processing..."
                                        : "Proceed to Checkout"}
                                </button>

                            ) : (

                                <div className="space-y-4 mt-8">

                                    <div className="rounded-xl bg-yellow-50 border border-yellow-300 p-4 text-sm">

                                        Your order has been created.

                                        Complete your PayPal payment or cancel this order.

                                    </div>

                                    <PaypalButton orderId={pendingOrder.id} />

                                    <button
                                        onClick={() => {

                                            cancelOrder.mutate(pendingOrder.id, {
                                                onSuccess: () => {
                                                    toast.success("Order cancelled");
                                                }
                                            });

                                        }}
                                        className="w-full py-3 rounded-xl border border-red-500 text-red-600 hover:bg-red-50"
                                    >
                                        Cancel Order
                                    </button>

                                </div>

                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CartPage;