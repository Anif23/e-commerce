type Props = {
  page: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  setPage: (
    page: number
  ) => void;
};

const Pagination = ({
  page,
  totalPages,
  hasNext,
  hasPrev,
  setPage,
}: Props) => {
  return (
    <div className="p-5 border-t flex justify-between items-center">
      <p className="text-sm text-gray-500">
        Page {page} of{" "}
        {totalPages}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() =>
            setPage(
              page - 1
            )
          }
          disabled={
            hasPrev ===
            false ||
            page === 1
          }
          className="px-4 py-2 border rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          Prev
        </button>

        <button
          onClick={() =>
            setPage(
              page + 1
            )
          }
          disabled={
            hasNext ===
            false ||
            page ===
            totalPages
          }
          className="px-4 py-2 border rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;