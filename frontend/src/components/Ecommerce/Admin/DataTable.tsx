type Column = {
  header: string;
  accessor?: string;
  render?: (
    row: any
  ) => React.ReactNode;
};

type Props = {
  columns: Column[];
  rows: any[];
  loading?: boolean;

  actions?: {
    onView?: (row: any) => void;
    onEdit?: (row: any) => void;
    onDelete?: (row: any) => void;
  };
};

const DataTable = ({
  columns,
  rows,
  loading,
  actions,
}: Props) => {
  const hasActions =
    actions?.onView ||
    actions?.onEdit ||
    actions?.onDelete;

  const totalCols =
    columns.length +
    (hasActions ? 1 : 0);

  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* HEADER */}
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              {columns.map(
                (col) => (
                  <th
                    key={
                      col.header
                    }
                    className="p-4 text-left font-medium"
                  >
                    {
                      col.header
                    }
                  </th>
                )
              )}

              {hasActions && (
                <th className="p-4 text-left font-medium">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={
                    totalCols
                  }
                  className="py-16 text-center"
                >
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto" />

                  <p className="mt-4 text-gray-500">
                    Loading
                    data...
                  </p>
                </td>
              </tr>
            )}

            {!loading &&
              rows.length ===
              0 && (
                <tr>
                  <td
                    colSpan={
                      totalCols
                    }
                    className="py-16 text-center"
                  >
                    <p className="text-lg font-semibold text-gray-700">
                      No Data
                      Found
                    </p>

                    <p className="text-sm text-gray-400 mt-1">
                      Try
                      changing
                      filters or
                      add new
                      records
                    </p>
                  </td>
                </tr>
              )}

            {!loading &&
              rows.map(
                (row) => (
                  <tr
                    key={
                      row.id
                    }
                    className="border-t hover:bg-gray-50 transition"
                  >
                    {columns.map(
                      (
                        col
                      ) => (
                        <td
                          key={
                            col.header
                          }
                          className="p-4"
                        >
                          {col.render
                            ? col.render(
                              row
                            )
                            : row[
                            col
                              .accessor ||
                            ""
                            ]}
                        </td>
                      )
                    )}

                    {hasActions && (
                      <td className="p-4">
                        <div className="flex gap-2">
                          {actions?.onView && (
                            <button
                              onClick={() =>
                                actions.onView?.(
                                  row
                                )
                              }
                              className="px-3 py-1 rounded-xl bg-blue-50 text-blue-600 text-xs font-medium"
                            >
                              View
                            </button>
                          )}

                          {actions?.onEdit && (
                            <button
                              onClick={() =>
                                actions.onEdit?.(
                                  row
                                )
                              }
                              className="px-3 py-1 rounded-xl bg-green-50 text-green-600 text-xs font-medium"
                            >
                              Edit
                            </button>
                          )}

                          {actions?.onDelete && (
                            <button
                              onClick={() =>
                                actions.onDelete?.(
                                  row
                                )
                              }
                              className="px-3 py-1 rounded-xl bg-red-50 text-red-600 text-xs font-medium"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;