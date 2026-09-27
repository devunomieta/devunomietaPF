export type CrmColumn<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

/**
 * Renders as a table on md+ screens and as stacked cards on mobile —
 * the shared list pattern for every CRM entity screen.
 */
export function ResponsiveTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  emptyLabel,
}: {
  columns: CrmColumn<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted py-10 text-center">{emptyLabel || "Nothing here yet."}</p>;
  }

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              {columns.map((c) => (
                <th key={c.header} className="py-2 px-3 font-medium whitespace-nowrap">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-border/50 ${onRowClick ? "cursor-pointer hover:bg-accent-blue/5" : ""}`}
              >
                {columns.map((c) => (
                  <td key={c.header} className={`py-2.5 px-3 ${c.className || ""}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.id}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`p-3 rounded-lg border border-border bg-header/20 ${onRowClick ? "cursor-pointer active:bg-accent-blue/5" : ""}`}
          >
            {columns.map((c) => (
              <div key={c.header} className="flex items-start justify-between gap-3 py-1 text-sm">
                <span className="text-muted text-xs uppercase tracking-wide shrink-0 pt-0.5">{c.header}</span>
                <span className="text-right min-w-0">{c.cell(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
