import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Confetti from "react-confetti";

import {
    CheckCircle,
    Package,
    ShoppingBag,
    Truck,
} from "lucide-react";

const PaymentSuccess = () => {

    const navigate = useNavigate();

    const [params] = useSearchParams();

    const orderId =
        params.get("orderId");

    const [size, setSize] =
        useState({
            width: window.innerWidth,
            height: window.innerHeight,
        });

    useEffect(() => {

        const resize = () => {
            setSize({
                width:
                    window.innerWidth,
                height:
                    window.innerHeight,
            });
        };

        window.addEventListener(
            "resize",
            resize
        );

        return () =>
            window.removeEventListener(
                "resize",
                resize
            );

    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">

            <Confetti
                width={size.width}
                height={size.height}
                recycle={false}
                numberOfPieces={250}
            />

            <div className="max-w-2xl w-full bg-white rounded-3xl shadow-lg border overflow-hidden">

                {/* Header */}

                <div className="bg-linear-to-r from-green-500 to-emerald-600 text-white p-10 text-center">

                    <div className="flex justify-center mb-5">

                        <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">

                            <CheckCircle
                                size={70}
                            />

                        </div>

                    </div>

                    <h1 className="text-4xl font-bold">
                        Payment Successful 🎉
                    </h1>

                    <p className="mt-3 text-green-100">
                        Thank you for your purchase.
                    </p>

                </div>

                {/* Body */}

                <div className="p-8 space-y-6">

                    <div className="grid md:grid-cols-2 gap-4">

                        <div className="border rounded-2xl p-5">

                            <p className="text-sm text-gray-500">
                                Order Number
                            </p>

                            <p className="font-bold text-xl mt-1">
                                #{orderId}
                            </p>

                        </div>

                        <div className="border rounded-2xl p-5">

                            <p className="text-sm text-gray-500">
                                Payment Status
                            </p>

                            <p className="font-bold text-green-600 mt-1">
                                PAID
                            </p>

                        </div>

                    </div>

                    <div className="rounded-2xl border bg-green-50 border-green-200 p-5">

                        <h3 className="font-semibold text-green-700">
                            Your order is confirmed
                        </h3>

                        <p className="text-sm text-green-600 mt-1">
                            We received your payment successfully and started processing your order.
                        </p>

                    </div>

                    <div className="grid md:grid-cols-3 gap-4">

                        <div className="border rounded-2xl p-5 text-center">

                            <Package
                                className="mx-auto text-blue-500 mb-3"
                            />

                            <p className="font-medium">
                                Order Created
                            </p>

                        </div>

                        <div className="border rounded-2xl p-5 text-center">

                            <CheckCircle
                                className="mx-auto text-green-500 mb-3"
                            />

                            <p className="font-medium">
                                Payment Verified
                            </p>

                        </div>

                        <div className="border rounded-2xl p-5 text-center">

                            <Truck
                                className="mx-auto text-purple-500 mb-3"
                            />

                            <p className="font-medium">
                                Ready To Ship
                            </p>

                        </div>

                    </div>

                    <div className="bg-gray-50 rounded-2xl p-5 border">

                        <h3 className="font-semibold mb-2">
                            Estimated Delivery
                        </h3>

                        <p className="text-gray-600">
                            2 - 5 Business Days
                        </p>

                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">

                        <button
                            onClick={() =>
                                navigate(
                                    `/user/ecommerce/orders/${orderId}`
                                )
                            }
                            className="flex-1 bg-black text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                        >
                            <Package size={18} />

                            View Order
                        </button>

                        <button
                            onClick={() =>
                                navigate(
                                    "/user/ecommerce"
                                )
                            }
                            className="flex-1 border py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50"
                        >
                            <ShoppingBag size={18} />

                            Continue Shopping
                        </button>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default PaymentSuccess;