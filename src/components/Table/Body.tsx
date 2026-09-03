import React from "react";
import { useDataTableContext } from "./context";

export function Body<T>() {
  const ctx = useDataTableContext<T>();
  const {
    visibleColumns,
    processedData,
    rowKey,
    selectionMode,
    selectedRows,
    handleSelect,
    loading,
    emptyText,
  } = ctx;

  const colSpan = visibleColumns.length + (selectionMode ? 1 : 0);

  if (loading) {
    return (
      <tbody className="datatable-pro-body">
        <tr>
          <td colSpan={colSpan} className="datatable-pro-body-cell datatable-pro-body-cell--loading">
            Loading...
          </td>
        </tr>
      </tbody>
    );
  }

  if (processedData.length === 0) {
    return (
      <tbody className="datatable-pro-body">
        <tr>
          <td colSpan={colSpan} className="datatable-pro-body-cell datatable-pro-body-cell--empty">
            {emptyText}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="datatable-pro-body">
      {processedData.map((row, rowIndex) => {
        const key = row[rowKey];
        const isSelected = selectedRows.includes(key);

        return (
          <tr
            key={key as string}
            className={`datatable-pro-body-row ${isSelected ? "datatable-pro-body-row--selected" : ""}`}
            onClick={() => selectionMode && handleSelect(key)}
          >
            {selectionMode === "multiple" && (
              <td className="datatable-pro-body-cell datatable-pro-body-cell--checkbox">
                <input type="checkbox" checked={isSelected} readOnly />
              </td>
            )}
            {selectionMode === "single" && (
              <td className="datatable-pro-body-cell datatable-pro-body-cell--checkbox">
                <input
                  type="radio"
                  checked={isSelected}
                  readOnly
                  name="datatable-selection"
                />
              </td>
            )}
            {visibleColumns
              .map((col) => (
                <td
                  key={col.key as string}
                  className="datatable-pro-body-cell"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.render
                    ? col.render(row[col.key], row, rowIndex)
                    : String(row[col.key] ?? "")}
                </td>
              ))}
          </tr>
        );
      })}
    </tbody>
  );
}