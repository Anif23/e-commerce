import {
    Megaphone,
    Calendar,
} from "lucide-react";

import {
    useEffect,
    useState,
} from "react";

interface Props {
    announcements: any[];
}

const AnnouncementSlider = ({
    announcements,
}: Props) => {

    const [current,
        setCurrent] = useState(0);


    useEffect(() => {

        if (
            announcements.length <= 1
        ) return;


        const timer =
            setInterval(() => {

                setCurrent((prev) =>
                    (prev + 1)
                    %
                    announcements.length
                );

            }, 5000);


        return () =>
            clearInterval(timer);

    }, [announcements.length]);


    if (
        !announcements.length
    ) {
        return null;
    }


    return (

        <section className="mt-12">

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                <div
                    className="
                    relative
                    overflow-hidden
                    rounded-3xl
                    bg-gradient-to-r
                    from-black
                    via-gray-900
                    to-black
                    text-white
                    p-8
                    min-h-[250px]"
                >

                    <div
                        className="
                        absolute
                        top-0
                        right-0
                        w-60
                        h-60
                        bg-indigo-500/20
                        rounded-full
                        blur-3xl"
                    />

                    <div
                        className="
                        absolute
                        bottom-0
                        left-0
                        w-60
                        h-60
                        bg-purple-500/20
                        rounded-full
                        blur-3xl"
                    />


                    {announcements.map(
                        (
                            item,
                            index
                        ) => (

                            <div
                                key={item.id}
                                className={`
                                absolute
                                inset-0
                                p-8
                                transition-all
                                duration-700
                                ease-in-out
                                
                                ${index === current
                                        ? "opacity-100 translate-x-0"
                                        : "opacity-0 translate-x-8 pointer-events-none"
                                    }
                                
                                `}
                            >

                                <div
                                    className="
                                    h-full
                                    flex
                                    flex-col
                                    justify-center"
                                >

                                    <div
                                        className="
                                        flex
                                        items-center
                                        gap-3"
                                    >

                                        <div
                                            className="
                                            w-14
                                            h-14
                                            rounded-full
                                            bg-white/10
                                            flex
                                            items-center
                                            justify-center"
                                        >

                                            <Megaphone
                                                size={28}
                                            />

                                        </div>


                                        <div>

                                            <p
                                                className="
                                                text-xs
                                                uppercase
                                                tracking-[0.3em]
                                                text-gray-400"
                                            >
                                                Announcement
                                            </p>

                                            <h2
                                                className="
                                                text-3xl
                                                font-bold"
                                            >
                                                {item.title}
                                            </h2>

                                        </div>

                                    </div>


                                    <p
                                        className="
                                        mt-6
                                        text-lg
                                        text-gray-300
                                        max-w-3xl"
                                    >
                                        {
                                            item.message
                                        }
                                    </p>


                                    {(item.startAt ||
                                        item.endAt) && (

                                            <div
                                                className="
                                                flex
                                                items-center
                                                gap-3
                                                mt-6
                                                text-sm
                                                text-gray-300"
                                            >

                                                <Calendar
                                                    size={18}
                                                />

                                                {item.endAt && (

                                                    <span>

                                                        Ends on

                                                        {" "}

                                                        {
                                                            new Date(
                                                                item.endAt
                                                            )
                                                                .toLocaleDateString()
                                                        }

                                                    </span>

                                                )}

                                            </div>

                                        )}

                                </div>

                            </div>

                        )
                    )}


                    {/* DOTS */}


                    {announcements.length >
                        1 && (

                            <div
                                className="
                                absolute
                                bottom-5
                                right-8
                                flex
                                gap-2"
                            >

                                {announcements.map(
                                    (
                                        _,
                                        index
                                    ) => (

                                        <button
                                            key={index}
                                            onClick={() =>
                                                setCurrent(
                                                    index
                                                )
                                            }
                                            className={`
                                            
                                            rounded-full
                                            transition-all
                                            duration-300
                                            
                                            ${index === current
                                                    ? "w-8 h-2 bg-white"
                                                    : "w-2 h-2 bg-white/50"
                                                }
                                            
                                            `}
                                        />

                                    )
                                )}

                            </div>

                        )}

                </div>

            </div>

        </section>

    );

};


export default AnnouncementSlider;