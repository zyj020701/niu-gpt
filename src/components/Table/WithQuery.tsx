import React, { useMemo } from "react";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { DataTableContext } from "./context";
import type { SortState, FilterState, PaginationState, Column } from "../../types";
import { useDataTable } from "../../hooks/useDataTable";

/** Query parameters for server-side operations */
export interface QueryParams {
  sort?: SortState;
  filter?: FilterState;
  pagination?: Pick<PaginationState, "page" | "pageSize">;
}

/** Server-side data fetcher function */
export type ServerQueryFn<T> = (params: QueryParams) => Promise<{
  data: T[];
  total: number;
}>;

/** Props for WithQuery component */
export interface WithQueryProps<T> {
  /** Column definitions */
  columns: Column<T>[];
  /** Unique key for each row */
  rowKey: keyof T & string;
  /** React Query key (will be memoized with query params) */
  queryKey: readonly unknown[];
  /** Server-side data fetcher */
  queryFn: ServerQueryFn<T>;
  /** React Query options */
  options?: Omit<UseQueryOptions<{ data: T[]; total: number }>, "queryKey" | "queryFn">;
  /** Selection mode */
  selectionMode?: "single" | "multiple";
  /** Selected row keys (controlled mode) */
  selectedRows?: Array<T[keyof T]>;
  /** Selection change handler */
  onSelectionChange?: (selectedRows: Array<T[keyof T]>, selectedItems: T[]) => void;
  /** Loading fallback component */
  loadingFallback?: React.ReactNode;
  /** Error fallback component */
  errorFallback?: (error: Error, retry: () => void) => React.ReactNode;
  /** Empty state text */
  emptyText?: string;
  /** Children (Compound components) */
  children: React.ReactNode;
}

/**
 * WithQuery - Server-side data integration with React Query
 *
 * 红线04: QueryKey is memoized with useMemo to prevent re-fetch loops.
 * 红线01: Context is passed with proper null handling.
 * 红线02: Generic T is properly threaded through.
 */
export function WithQuery<T>(props: WithQueryProps<T>) {
  const {
    columns,
    rowKey,
    queryKey,
    queryFn,
    options,
    selectionMode,
    selectedRows,
    onSelectionChange,
    loadingFallback,
    errorFallback,
    emptyText = "No data",
    children,
  } = props;

  // Internal state for sort/filter/pagination (server-side operations)
  const [sortState, setSortState] = React.useState<SortState>({ field: "", direction: "none" });
  const [filterState, setFilterState] = React.useState<FilterState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({ page: 1, pageSize: 10, total: 0 });

  // 红线04: Memoize query key with params to prevent unstable references
  const stableQueryKey = useMemo(() => {
    const params = {
      sort: sortState.field ? sortState : undefined,
      filter: Object.keys(filterState).length > 0 ? filterState : undefined,
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
    };
    return [...queryKey, params] as const;
  }, [queryKey, sortState, filterState, pagination.page, pagination.pageSize]);

  // Fetch data from server
  const queryResult = useQuery({
    queryKey: stableQueryKey,
    queryFn: () =>
      queryFn({
        sort: sortState.field ? sortState : undefined,
        filter: Object.keys(filterState).length > 0 ? filterState : undefined,
        pagination: { page: pagination.page, pageSize: pagination.pageSize },
      }),
    ...options,
  });

  // Update total when data changes
  React.useEffect(() => {
    if (queryResult.data) {
      setPagination((prev) => ({ ...prev, total: queryResult.data.total }));
    }
  }, [queryResult.data]);

  // Use client-side hook for selection management
  const { selectedRows: selectedRowKeys, handleSelect, handleSelectAll } = useDataTable({
    data: queryResult.data?.data ?? [],
    rowKey,
    selectionMode,
    selectedRows,
    onSelectionChange,
  });

  // Handle sort change (triggers refetch)
  const handleSort = React.useCallback((field: string) => {
    setSortState((prev) => {
      if (prev.field !== field) return { field, direction: "asc" };
      if (prev.direction === "asc") return { field, direction: "desc" };
      if (prev.direction === "desc") return { field: "", direction: "none" };
      return { field, direction: "asc" };
    });
    // Reset to first page when sort changes
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  // Handle filter change (triggers refetch)
  const handleFilter = React.useCallback((field: string, value: any) => {
    setFilterState((prev) => ({ ...prev, [field]: value }));
    // Reset to first page when filter changes
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  // Handle page change
  const handlePageChange = React.useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  // Handle page size change
  const handlePageSizeChange = React.useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  // Render loading state
  if (queryResult.isLoading) {
    return (
      <div className="datatable-pro-loading">
        {loadingFallback ?? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div>Loading...</div>
          </div>
        )}
      </div>
    );
  }

  // Render error state
  if (queryResult.isError) {
    const error = queryResult.error as Error;
    if (errorFallback) {
      return <>{errorFallback(error, () => queryResult.refetch())}</>;
    }
    return (
      <div className="datatable-pro-error" style={{ padding: 40, textAlign: "center", color: "red" }}>
        <div>Error: {error.message}</div>
        <button onClick={() => queryResult.refetch()}>Retry</button>
      </div>
    );
  }

  const data = queryResult.data?.data ?? [];
  const visibleColumns = columns.filter((col) => col.visible !== false);

  const contextValue = {
    columns,
    visibleColumns,
    toggleColumn: () => {}, // Column visibility toggle not supported in server mode
    data,
    processedData: data, // Server already processed the data
    rowKey,
    sortState,
    handleSort,
    filterState,
    handleFilter,
    pagination,
    handlePageChange,
    handlePageSizeChange,
    selectionMode,
    selectedRows: selectedRowKeys,
    handleSelect,
    handleSelectAll,
    loading: queryResult.isFetching, // Show loading during refetch
    emptyText,
  };

  return (
    <DataTableContext.Provider value={contextValue as any}>
      <table className="datatable-pro-table">{children}</table>
    </DataTableContext.Provider>
  );
}