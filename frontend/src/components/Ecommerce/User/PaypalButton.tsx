import { PayPalButtons } from "@paypal/react-paypal-js";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

import {
    useCreatePaypalOrder,
    useCapturePaypalOrder,
} from "../../../hooks/user/usePayment";

interface PaypalButtonProps {
    orderId: number;
}

const PaypalButton = ({
    orderId,
}: PaypalButtonProps) => {

    const navigate = useNavigate();

    const createPaypalOrder =
        useCreatePaypalOrder();

    const capturePaypalOrder =
        useCapturePaypalOrder();

    return (
        <PayPalButtons

            style={{
                layout: "vertical",
                color: "gold",
                shape: "rect",
                label: "paypal",
            }}

            createOrder={async () => {

                try {

                    const res =
                        await createPaypalOrder.mutateAsync({
                            orderId,
                        });

                    return res.data.paypalOrderId;

                } catch (error) {

                    toast.error(
                        "Unable to create PayPal order"
                    );

                    throw error;
                }

            }}

            onApprove={async (data) => {

                try {

                    await capturePaypalOrder.mutateAsync({
                        paypalOrderId: data.orderID,
                    });

                    toast.success(
                        "Payment Successful"
                    );

                    navigate(
                        "/user/ecommerce/orders"
                    );

                } catch (error) {

                    toast.error(
                        "Payment verification failed"
                    );

                }

            }}

            onCancel={() => {

                toast(
                    "Payment cancelled"
                );

            }}

            onError={() => {

                toast.error(
                    "PayPal payment failed"
                );

            }}

        />
    );
};

export default PaypalButton;