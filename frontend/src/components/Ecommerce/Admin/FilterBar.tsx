import {
    useEffect,
    useState,
} from "react";

export type FilterOption = {
    label: string;
    value: string;
};

export type FilterSelect = {
    value: string;
    onChange: (
        value: string
    ) => void;
    options: FilterOption[];
};

type Props = {
    search?: string;
    setSearch?: (
        v: string
    ) => void;
    selects?: FilterSelect[];
    total: number;
};

const FilterBar = ({
    search = "",
    setSearch,
    selects = [],
    total,
}: Props) => {
    const [
        inputValue,
        setInputValue,
    ] = useState(search);

    useEffect(() => {
        setInputValue(search);
    }, [search]);

    useEffect(() => {
        const timer =
            setTimeout(() => {
                if (
                    inputValue !==
                    search
                ) {
                    setSearch?.(
                        inputValue
                    );
                }
            }, 500);

        return () =>
            clearTimeout(
                timer
            );
    }, [
        inputValue,
        search,
        setSearch,
    ]);

    return (
        <div className="bg-white rounded-3xl p-5 shadow-sm border">
            <div className="grid lg:grid-cols-3 gap-4">
                {setSearch && (
                    <input
                        value={
                            inputValue
                        }
                        onChange={(
                            e
                        ) =>
                            setInputValue(
                                e.target
                                    .value
                            )
                        }
                        placeholder="Search..."
                        className="border rounded-2xl px-4 h-11"
                    />
                )}

                {selects.map(
                    (
                        select,
                        index
                    ) => (
                        <select
                            key={
                                index
                            }
                            value={
                                select.value
                            }
                            onChange={(
                                e
                            ) =>
                                select.onChange(
                                    e.target
                                        .value
                                )
                            }
                            className="border rounded-2xl px-4 h-11"
                        >
                            {select.options.map(
                                (
                                    opt
                                ) => (
                                    <option
                                        key={
                                            opt.value
                                        }
                                        value={
                                            opt.value
                                        }
                                    >
                                        {
                                            opt.label
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    )
                )}

                <div className="flex items-center justify-end text-sm text-gray-500">
                    {total} items
                </div>
            </div>
        </div>
    );
};

export default FilterBar;