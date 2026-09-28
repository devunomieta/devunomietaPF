"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems <= pageSize) return null;

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs text-muted px-2">
      <div>
        Showing <span className="font-medium text-foreground">{startRecord}</span> to{" "}
        <span className="font-medium text-foreground">{endRecord}</span> of{" "}
        <span className="font-medium text-foreground">{totalItems}</span> results
      </div>

      <div className="flex items-center gap-1 self-center sm:self-auto">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="First page"
          className="p-1.5 rounded-md hover:bg-header border border-border/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronsLeft size={14} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="p-1.5 rounded-md hover:bg-header border border-border/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft size={14} />
        </button>

        <span className="px-2.5 font-medium text-foreground">
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className="p-1.5 rounded-md hover:bg-header border border-border/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight size={14} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Last page"
          className="p-1.5 rounded-md hover:bg-header border border-border/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}
