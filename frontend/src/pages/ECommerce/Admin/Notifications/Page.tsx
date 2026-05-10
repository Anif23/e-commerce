// pages/Admin/Ecommerce/Notifications/index.tsx

import { useState } from "react";

import {
    BellRing,
    Send,
    Megaphone,
} from "lucide-react";

import PageHeader from "../../../../components/Ecommerce/Admin/PageHeader";
import StatsCard from "../../../../components/Ecommerce/StatsCard";
import InputField from "../../../../components/Ecommerce/Forms/InputField";
import TextAreaField from "../../../../components/Ecommerce/Forms/TextAreaField";
import SectionCard from "../../../../components/Ecommerce/Forms/SectionCard";

import {
    useSendNotification,
} from "../../../../hooks/admin/useAdminCustomer";

const Notifications =
    () => {

        const sendNotification =
            useSendNotification();

        const [form, setForm] =
            useState({
                title: "",
                message: "",
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
                form,
                {
                    onSuccess: () => {
                        setForm({
                            title: "",
                            message: "",
                        });
                    },
                }
            );
        };

        return (
            <div className="space-y-6">

                <PageHeader
                    title="Push Notifications"
                    subtitle="Send offers & updates to users"
                />

                <div className="grid md:grid-cols-3 gap-5">

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

                            <InputField
                                label="Title"
                                value={
                                    form.title
                                }
                                onChange={(e) =>
                                    updateField(
                                        "title",
                                        e.target
                                            .value
                                    )
                                }
                                placeholder="Big sale today 🔥"
                            />

                            <TextAreaField
                                label="Message"
                                value={
                                    form.message
                                }
                                onChange={(e) =>
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

            </div>
        );
    };

export default Notifications;