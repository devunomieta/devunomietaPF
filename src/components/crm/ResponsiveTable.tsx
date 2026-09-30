import { TablePagination } from "./TablePagination";

export type CrmColumn<T> = {
  header: React.ReactNode;
  headerKey?: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

/**
 * Renders as a table on md+ screens and as stacked cards on mobile —
 * the shared list pattern for every CRM entity screen.
 * 
 * Works seamlessly in both Server Components and Client Components
 * without RSC serialization errors.
 */
export function ResponsiveTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  emptyLabel,
  pageSize,
  currentPage = 1,
  onPageChange,
}: {
  columns: CrmColumn<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted py-10 text-center">{emptyLabel || "Nothing here yet."}</p>;
  }

  // If pagination parameters are provided, slice the rows
  const effectivePageSize = pageSize || rows.length;
  const totalPages = Math.max(1, Math.ceil(rows.length / effectivePageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const displayRows = pageSize
    ? rows.slice((validPage - 1) * effectivePageSize, validPage * effectivePageSize)
    : rows;

  return (
    <div className="flex flex-col gap-3">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              {columns.map((c, idx) => (
                <th key={c.headerKey || (typeof c.header === "string" ? c.header : idx)} className="py-2 px-3 font-medium whitespace-nowrap">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-border/50 ${onRowClick ? "cursor-pointer hover:bg-accent-blue/5" : ""}`}
              >
                {columns.map((c, idx) => (
                  <td key={c.headerKey || (typeof c.header === "string" ? c.header : idx)} className={`py-2.5 px-3 ${c.className || ""}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col gap-2">
        {displayRows.map((row) => (
          <div
            key={row.id}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`p-3 rounded-lg border border-border bg-header/20 ${onRowClick ? "cursor-pointer active:bg-accent-blue/5" : ""}`}
          >
            {columns.map((c, idx) => (
              <div key={c.headerKey || (typeof c.header === "string" ? c.header : idx)} className="flex items-start justify-between gap-3 py-1 text-sm">
                <span className="text-muted text-xs uppercase tracking-wide shrink-0 pt-0.5">{c.header}</span>
                <span className="text-right min-w-0">{c.cell(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {pageSize && onPageChange && (
        <TablePagination
          currentPage={validPage}
          totalPages={totalPages}
          totalItems={rows.length}
          pageSize={effectivePageSize}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
