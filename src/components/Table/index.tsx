import React from "react";
import type { DataTableProps, DataTableContextType } from "../../types";
import { DataTableContext } from "./context";
import { useDataTable } from "../../hooks/useDataTable";

/**
 * Table component - main container using Compound Component pattern.
 * Integrates useDataTable hook for all data logic (sort, filter, pagination, selection).
 *
 * 红线02: Generic T is threaded through useDataTable<T> and DataTableContextType<T>.
 */
export function Table<T>(props: DataTableProps<T>) {
  const {
    columns,
    data,
    rowKey,
    sortState: externalSortState,
    onSortChange,
    filterState: externalFilterState,
    onFilterChange,
    pagination: externalPagination,
    onPaginationChange,
    selectionMode,
    selectedRows: externalSelectedRows,
    onSelectionChange,
    loading,
    emptyText = "No data",
    children,
  } = props;

  // 红线02: 泛型透传至内部 Hook
  const dataTable = useDataTable<T>({
    data,
    rowKey,
    sortState: externalSortState,
    onSortChange,
    filterState: externalFilterState,
    onFilterChange,
    pagination: externalPagination,
    onPaginationChange,
    selectionMode,
    selectedRows: externalSelectedRows,
    onSelectionChange,
  });

  // ── Column visibility ──
  const [hiddenCols, setHiddenCols] = React.useState<Set<string>>(new Set());

  const toggleColumn = React.useCallback((key: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const visibleColumns = React.useMemo(
    () =>
      columns.filter(
        (col) => col.visible !== false && !hiddenCols.has(col.key as string)
      ),
    [columns, hiddenCols]
  );

  // ── Context value ──
  const contextValue: DataTableContextType<T> = React.useMemo(
    () => ({
      columns,
      visibleColumns,
      toggleColumn,
      data,
      processedData: dataTable.processedData,
      rowKey,
      sortState: dataTable.sortState,
      handleSort: dataTable.handleSort,
      filterState: dataTable.filterState,
      handleFilter: dataTable.handleFilter,
      pagination: dataTable.pagination,
      handlePageChange: dataTable.handlePageChange,
      handlePageSizeChange: dataTable.handlePageSizeChange,
      selectionMode: dataTable.selectionMode,
      selectedRows: dataTable.selectedRows,
      handleSelect: dataTable.handleSelect,
      handleSelectAll: dataTable.handleSelectAll,
      loading,
      emptyText,
    }),
    [
      columns,
      visibleColumns,
      toggleColumn,
      data,
      dataTable.processedData,
      rowKey,
      dataTable.sortState,
      dataTable.handleSort,
      dataTable.filterState,
      dataTable.handleFilter,
      dataTable.pagination,
      dataTable.handlePageChange,
      dataTable.handlePageSizeChange,
      dataTable.selectionMode,
      dataTable.selectedRows,
      dataTable.handleSelect,
      dataTable.handleSelectAll,
      loading,
      emptyText,
    ]
  );

  // Separate Pagination from table children to avoid DOM nesting issues
  const childrenArray = React.Children.toArray(children);
  
  const isPagination = (child: React.ReactNode): boolean => {
    if (!React.isValidElement(child)) return false;
    if (typeof child.type === "string") return false;
    // Check by component name or displayName
    return (
      (child.type as any).name === "Pagination" ||
      (child.type as any).displayName === "Pagination"
    );
  };
  
  const tableChildren = childrenArray.filter((child) => !isPagination(child));
  const paginationChild = childrenArray.find((child) => isPagination(child));

  return (
    <DataTableContext.Provider value={contextValue}>
      <div className="datatable-pro-container">
        <table className="datatable-pro-table">{tableChildren}</table>
        {paginationChild}
      </div>
    </DataTableContext.Provider>
  );
}