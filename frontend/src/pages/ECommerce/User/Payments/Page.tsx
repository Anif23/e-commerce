import { useState } from "react";
import {
    CreditCard,
    CheckCircle,
    Clock,
    IndianRupee,
} from "lucide-react";

import Pagination from "../../../../components/Ecommerce/Admin/Pagination";
import FilterBar from "../../../../components/Ecommerce/Admin/FilterBar";
import EmptyState from "../../../../components/Ecommerce/EmptyState";
import StatCard from "../../../../components/Ecommerce/StatsCard";

import { useMyPayments } from "../../../../hooks/user/usePayment";
import { useNavigate } from "react-router-dom";
import PaypalButton from "../../../../components/Ecommerce/User/PaypalButton";

const UserPayments = () => {

    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");

    const { data, isLoading } =
        useMyPayments({
            page,
            search,
        });

    const payments =
        data?.data || [];

    const pg =
        data?.pagination || {};

    const totalSpent =
        payments
            .filter(
                (p: any) =>
                    p.status === "SUCCESS"
            )
            .reduce(
                (
                    acc: number,
                    p: any
                ) => acc + p.amount,
                0
            );

    const successCount =
        payments.filter(
            (p: any) =>
                p.status === "SUCCESS"
        ).length;

    const pendingCount =
        payments.filter(
            (p: any) =>
                p.status === "PENDING"
        ).length;

    if (isLoading) {
        return (
            <div className="text-center py-20">
                Loading payments...
            </div>
        );
    }

    return (
        <div className="space-y-6">

            <div>
                <h1 className="text-2xl font-bold">
                    Payments & Transactions
                </h1>

                <p className="text-gray-500 mt-1">
                    View all your payment history
                </p>
            </div>

            {/* Stats */}

            <div className="grid md:grid-cols-4 gap-4">

                <StatCard
                    title="Transactions"
                    value={pg.total || 0}
                    icon={<CreditCard />}
                />

                <StatCard
                    title="Successful"
                    value={successCount}
                    icon={<CheckCircle />}
                />

                <StatCard
                    title="Pending"
                    value={pendingCount}
                    icon={<Clock />}
                />

                <StatCard
                    title="Total Spent"
                    value={`$${totalSpent}`}
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

            {payments.length === 0 ? (
                <EmptyState
                    title="No payments found"
                    description="Your payment history will appear here."
                />
            ) : (
                <div className="grid gap-4">

                    {payments.map(
                        (payment: any) => (
                            <div
                                key={payment.id}
                                className="bg-white rounded-xl border p-5 shadow-sm"
                            >

                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                                    <div>

                                        <h3 className="font-semibold">
                                            Order #
                                            {
                                                payment.order
                                                    ?.id
                                            }
                                        </h3>

                                        <p className="text-sm text-gray-500">
                                            TXN-
                                            {String(
                                                payment.id
                                            ).padStart(
                                                6,
                                                "0"
                                            )}
                                        </p>

                                    </div>

                                    <div>

                                        <p className="text-sm text-gray-500">
                                            Amount
                                        </p>

                                        <p className="font-semibold">
                                            $
                                            {
                                                payment.amount
                                            }
                                        </p>

                                    </div>

                                    <div>

                                        <p className="text-sm text-gray-500">
                                            Method
                                        </p>

                                        <p className="font-medium">
                                            {
                                                payment.provider
                                            }
                                        </p>

                                    </div>

                                    <div>

                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${payment.status ===
                                                "SUCCESS"
                                                ? "bg-green-100 text-green-700"
                                                : payment.status ===
                                                    "PENDING"
                                                    ? "bg-yellow-100 text-yellow-700"
                                                    : "bg-red-100 text-red-700"
                                                }`}
                                        >
                                            {
                                                payment.status
                                            }
                                        </span>

                                    </div>

                                    <div>

                                        <p className="text-sm text-gray-500">
                                            Date
                                        </p>

                                        <p>
                                            {new Date(
                                                payment.createdAt
                                            ).toLocaleDateString()}
                                        </p>

                                    </div>

                                </div>

                                <div className="mt-4 flex gap-3">

                                    <button
                                        onClick={() =>
                                            navigate(`/user/ecommerce/orders/${payment.order?.id}`)
                                        }
                                        className="px-4 py-2 text-sm rounded-lg border cursor-pointer"
                                    >
                                        View Order
                                    </button>

                                    {/* {payment.status === "PENDING" &&
                                        payment.provider === "PAYPAL" && (
                                            <div className="mt-4">
                                                <PaypalButton
                                                    orderId={payment.order.id}
                                                />
                                            </div>
                                        )} */}
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

export default UserPayments;