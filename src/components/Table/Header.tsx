import React from "react";
import { useDataTableContext } from "./context";
import type { Column } from "../../types";

/** Filter UI for a single column */
function FilterControl<T>({ col }: { col: Column<T> }) {
  const ctx = useDataTableContext<T>();
  const { filterState, handleFilter } = ctx;

  if (!col.filterable || !col.filterType) return null;

  const currentFilter = filterState[col.key as string];

  switch (col.filterType) {
    case "text": {
      const value = currentFilter?.value as string ?? "";
      return (
        <div className="datatable-pro-filter" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            placeholder={`Filter ${col.title}...`}
            value={value}
            onChange={(e) =>
              handleFilter(col.key as string, { type: "text", value: e.target.value })
            }
            className="datatable-pro-filter-input"
          />
        </div>
      );
    }
    case "select": {
      const selected = (currentFilter?.value as string[]) ?? [];
      const options = col.filterOptions ?? [];
      return (
        <div className="datatable-pro-filter" onClick={(e) => e.stopPropagation()}>
          <select
            multiple
            value={selected}
            onChange={(e) => {
              const vals = Array.from(e.target.selectedOptions, (o) => o.value);
              handleFilter(col.key as string, { type: "select", value: vals });
            }}
            className="datatable-pro-filter-select"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }
    case "range": {
      const [min, max] = (currentFilter?.value as [number, number]) ?? [0, 100];
      return (
        <div className="datatable-pro-filter" onClick={(e) => e.stopPropagation()}>
          <input
            type="number"
            placeholder="Min"
            value={min}
            onChange={(e) =>
              handleFilter(col.key as string, {
                type: "range",
                value: [Number(e.target.value), max],
              })
            }
            className="datatable-pro-filter-range"
          />
          <span> - </span>
          <input
            type="number"
            placeholder="Max"
            value={max}
            onChange={(e) =>
              handleFilter(col.key as string, {
                type: "range",
                value: [min, Number(e.target.value)],
              })
            }
            className="datatable-pro-filter-range"
          />
        </div>
      );
    }
    default:
      return null;
  }
}

export function Header<T>() {
  const ctx = useDataTableContext<T>();
  const {
    columns,
    visibleColumns,
    toggleColumn,
    sortState,
    handleSort,
    selectedRows,
    processedData,
    handleSelectAll,
    selectionMode,
  } = ctx;

  const hasFilterable = visibleColumns.some((col) => col.filterable);

  return (
    <thead className="datatable-pro-header">
      {/* Column visibility toggle bar */}
      <tr className="datatable-pro-col-toggle-row">
        <td colSpan={visibleColumns.length + (selectionMode ? 1 : 0)}>
          <div className="datatable-pro-col-toggle">
            {columns.map((col) => (
              <label key={col.key as string} className="datatable-pro-col-toggle-label">
                <input
                  type="checkbox"
                  checked={visibleColumns.some((c) => c.key === col.key)}
                  onChange={() => toggleColumn(col.key as string)}
                />
                {col.title}
              </label>
            ))}
          </div>
        </td>
      </tr>

      {/* Main header row */}
      <tr>
        {selectionMode === "multiple" && (
          <th className="datatable-pro-header-cell datatable-pro-header-cell--checkbox">
            <input
              type="checkbox"
              checked={
                processedData.length > 0 && selectedRows.length === processedData.length
              }
              onChange={handleSelectAll}
            />
          </th>
        )}
        {selectionMode === "single" && (
          <th className="datatable-pro-header-cell datatable-pro-header-cell--checkbox" />
        )}
        {visibleColumns.map((col) => {
          const isSorted = sortState.field === col.key;
          const direction = isSorted ? sortState.direction : "none";

          return (
            <th
              key={col.key as string}
              className={`datatable-pro-header-cell ${col.sortable ? "datatable-pro-header-cell--sortable" : ""}`}
              style={col.width ? { width: col.width } : undefined}
              onClick={() => col.sortable && handleSort(col.key as string)}
            >
              <span className="datatable-pro-header-cell-content">
                {col.title}
                {col.sortable && (
                  <span className="datatable-pro-sort-indicator">
                    {direction === "asc" && " ▲"}
                    {direction === "desc" && " ▼"}
                    {direction === "none" && " ⇅"}
                  </span>
                )}
              </span>
            </th>
          );
        })}
      </tr>

      {/* Filter row */}
      {hasFilterable && (
        <tr className="datatable-pro-filter-row">
          {selectionMode && <th className="datatable-pro-header-cell" />}
          {visibleColumns.map((col) => (
            <th key={col.key as string} className="datatable-pro-header-cell">
              <FilterControl col={col} />
            </th>
          ))}
        </tr>
      )}
    </thead>
  );
}