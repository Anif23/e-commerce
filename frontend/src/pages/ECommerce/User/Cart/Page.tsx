import { useCart, useRemoveCart, useUpdateCart } from "../../../../hooks/user/useCart";
import { useCheckout } from "../../../../hooks/user/useCheckout";
import { useState } from "react";
import { useAuthStore } from "../../../../store/authStore";
import { useCartStore } from "../../../../store/cartStore";
import { useNavigate, useLocation } from "react-router-dom";

const CartPage = () => {

    const navigate = useNavigate();
    const location = useLocation();
    const { isLoading } = useCart();
    const token = useAuthStore((s) => s.token);

    const cartStore = useCartStore();

    const items = cartStore.items;

    const updateCart = useUpdateCart();
    const removeCart = useRemoveCart();

    const checkout = useCheckout();


    const [paymentMethod, setPaymentMethod] = useState<"COD" | "RAZORPAY">("COD");

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

    const handleCheckout =
        () => {
            if (!token) {
                navigate("/login", {
                    state: {
                        from:
                            location.pathname,
                    },
                });

                return;
            }

            checkout.mutate({
                paymentMethod,
            });
        };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">
                Shopping Cart
            </h1>

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
                                        ₹{item.product.price}
                                    </p>

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
                                </div>

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
                                        ₹
                                        {item.product.price *
                                            item.quantity}
                                    </div>
                                </div>
                            </div>
                        ))}
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
                                    ₹{total}
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
                                    ₹{total}
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
                                        checked={
                                            paymentMethod ===
                                            "RAZORPAY"
                                        }
                                        onChange={() =>
                                            setPaymentMethod(
                                                "RAZORPAY"
                                            )
                                        }
                                    />

                                    <span>
                                        Razorpay
                                    </span>
                                </label>
                            </div>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={
                                checkout.isPending
                            }
                            className="w-full bg-black text-white py-3 rounded-xl mt-8 disabled:opacity-50"
                        >
                            {checkout.isPending
                                ? "Processing..."
                                : "Proceed to Checkout"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartPage;