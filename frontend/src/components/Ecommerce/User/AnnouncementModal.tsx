import {
    Megaphone,
    Calendar,
} from "lucide-react";

import Modal from "../Modal";
import {
    useAnnouncementStore,
} from "../../../store/announcementStore";


const AnnouncementModal = () => {

    const {
        open,
        announcement,
        closeAnnouncement,
    } = useAnnouncementStore();


    if (!announcement)
        return null;


    return (

        <Modal
            open={open}
            onClose={closeAnnouncement}
            title="New Announcement"
        >

            <div className="space-y-6">

                <div className="flex justify-center">

                    <div
                        className="
                        w-20 h-20
                        rounded-full
                        bg-indigo-100
                        flex items-center
                        justify-center"
                    >

                        <Megaphone
                            size={40}
                            className="
                            text-indigo-600"
                        />

                    </div>

                </div>


                <div className="text-center">

                    <h2
                        className="
                        text-2xl
                        font-bold"
                    >
                        {announcement.title}
                    </h2>

                    <p
                        className="
                        text-gray-600
                        mt-3"
                    >
                        {announcement.message}
                    </p>

                </div>


                {(announcement.startAt ||
                    announcement.endAt) && (

                        <div
                            className="
                            rounded-2xl
                            bg-gray-50
                            p-4"
                        >

                            <div
                                className="
                                flex items-center
                                gap-2
                                mb-2"
                            >

                                <Calendar
                                    size={18}
                                />

                                <p
                                    className="
                                    font-semibold"
                                >
                                    Validity
                                </p>

                            </div>


                            {announcement.startAt && (

                                <p
                                    className="
                                    text-sm
                                    text-gray-600"
                                >
                                    Starts :
                                    {" "}
                                    {
                                        new Date(
                                            announcement.startAt
                                        ).toLocaleString()
                                    }
                                </p>

                            )}


                            {announcement.endAt && (

                                <p
                                    className="
                                    text-sm
                                    text-gray-600"
                                >
                                    Ends :
                                    {" "}
                                    {
                                        new Date(
                                            announcement.endAt
                                        ).toLocaleString()
                                    }
                                </p>

                            )}

                        </div>

                    )}


                <button
                    onClick={
                        closeAnnouncement
                    }
                    className="
                    w-full
                    h-12
                    rounded-xl
                    bg-black
                    text-white
                    font-medium
                    cursor-pointer"
                >
                    Got It
                </button>

            </div>

        </Modal>

    );

};


export default AnnouncementModal;