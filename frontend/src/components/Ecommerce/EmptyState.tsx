import { PackageOpen } from "lucide-react";

const EmptyState = ({
    title = "No Data Found",
    description = "There is nothing to display right now.",
    icon,
    action,
}: any) => {
    return (
        <div className="bg-white rounded-2xl border p-10 flex flex-col items-center justify-center text-center">

            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                {icon || (
                    <PackageOpen
                        size={30}
                        className="text-gray-400"
                    />
                )}
            </div>

            <h3 className="text-lg font-semibold text-gray-900">
                {title}
            </h3>

            <p className="text-sm text-gray-500 mt-2 max-w-sm">
                {description}
            </p>

            {action && (
                <div className="mt-5">
                    {action}
                </div>
            )}
        </div>
    );
};

export default EmptyState;