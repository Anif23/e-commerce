import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

const Modal = ({
  open,
  onClose,
  title,
  children,
}: Props) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* HEADER */}
        <div className="h-16 px-5 border-b flex items-center justify-between">

          <h2 className="font-semibold text-lg">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>

        </div>

        {/* BODY */}
        <div className="max-h-[70vh] overflow-y-auto p-5">
          {children}
        </div>

      </div>
    </div>
  );
};

export default Modal;