import React from "react";
import { useDataTableContext } from "./context";

export function Pagination<T>() {
  const ctx = useDataTableContext<T>();
  const { pagination, handlePageChange, handlePageSizeChange } = ctx;
  const { page, pageSize, total } = pagination;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="datatable-pro-pagination">
      <div className="datatable-pro-pagination-info">
        Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
      </div>

      <div className="datatable-pro-pagination-controls">
        <button
          className="datatable-pro-pagination-button"
          disabled={page <= 1}
          onClick={() => handlePageChange(1)}
        >
          {"<<"}
        </button>
        <button
          className="datatable-pro-pagination-button"
          disabled={page <= 1}
          onClick={() => handlePageChange(page - 1)}
        >
          {"<"}
        </button>

        {getPageNumbers().map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="datatable-pro-pagination-ellipsis">
              ...
            </span>
          ) : (
            <button
              key={p}
              className={`datatable-pro-pagination-button datatable-pro-pagination-button--page ${
                p === page ? "datatable-pro-pagination-button--active" : ""
              }`}
              onClick={() => handlePageChange(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          className="datatable-pro-pagination-button"
          disabled={page >= totalPages}
          onClick={() => handlePageChange(page + 1)}
        >
          {">"}
        </button>
        <button
          className="datatable-pro-pagination-button"
          disabled={page >= totalPages}
          onClick={() => handlePageChange(totalPages)}
        >
          {">>"}
        </button>
      </div>

      <div className="datatable-pro-pagination-page-size">
        <select
          value={pageSize}
          onChange={(e) => handlePageSizeChange(Number(e.target.value))}
        >
          {[5, 10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}