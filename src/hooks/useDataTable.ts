import React from "react";
import type {
  SortState,
  FilterState,
  FilterValue,
  PaginationState,
  SelectionMode,
} from "../types";

// ===== Hook Options =====
export interface UseDataTableOptions<T> {
  /** Raw data source */
  data: T[];
  /** Unique key for each row */
  rowKey: keyof T & string;
  /** Sort state (controlled mode) */
  sortState?: SortState;
  /** Sort change handler (controlled mode) */
  onSortChange?: (sort: SortState) => void;
  /** Filter state (controlled mode) */
  filterState?: FilterState;
  /** Filter change handler (controlled mode) */
  onFilterChange?: (filter: FilterState) => void;
  /** Pagination state (controlled mode) */
  pagination?: PaginationState;
  /** Pagination change handler (controlled mode) */
  onPaginationChange?: (pagination: PaginationState) => void;
  /** Selection mode */
  selectionMode?: SelectionMode;
  /** Selected row keys (controlled mode) */
  selectedRows?: Array<T[keyof T]>;
  /** Selection change handler (controlled mode) */
  onSelectionChange?: (selectedRows: Array<T[keyof T]>, selectedItems: T[]) => void;
}

// ===== Hook Return Type =====
export interface UseDataTableReturn<T> {
  /** Processed data (after sorting + filtering, before pagination) */
  processedData: T[];
  /** Current sort state */
  sortState: SortState;
  /** Trigger sort on a field */
  handleSort: (field: string) => void;
  /** Current filter state */
  filterState: FilterState;
  /** Trigger filter on a field */
  handleFilter: (field: string, value: FilterValue) => void;
  /** Current pagination state */
  pagination: PaginationState;
  /** Change page */
  handlePageChange: (page: number) => void;
  /** Change page size */
  handlePageSizeChange: (pageSize: number) => void;
  /** Selection mode */
  selectionMode?: SelectionMode;
  /** Currently selected row keys */
  selectedRows: Array<T[keyof T]>;
  /** Toggle select a single row */
  handleSelect: (key: T[keyof T]) => void;
  /** Toggle select all rows */
  handleSelectAll: () => void;
  /** Whether sort is controlled externally */
  isSortControlled: boolean;
  /** Whether filter is controlled externally */
  isFilterControlled: boolean;
  /** Whether pagination is controlled externally */
  isPaginationControlled: boolean;
  /** Whether selection is controlled externally */
  isSelectionControlled: boolean;
}

/**
 * Core hook for DataTable logic: sorting, filtering, pagination, selection.
 * Supports both controlled and uncontrolled modes.
 *
 * 红线02: Generic T is properly threaded through all internal logic.
 * 红线03: Controlled vs uncontrolled determined by `"prop" in options`.
 */
export function useDataTable<T>(options: UseDataTableOptions<T>): UseDataTableReturn<T> {
  const {
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
  } = options;

  // ── Internal state for uncontrolled mode ──
  const [internalSortState, setInternalSortState] = React.useState<SortState>({
    field: "",
    direction: "none",
  });

  const [internalFilterState, setInternalFilterState] = React.useState<FilterState>({});

  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    page: 1,
    pageSize: 10,
    total: data.length,
  });

  const [internalSelectedRows, setInternalSelectedRows] = React.useState<Array<T[keyof T]>>([]);

  // ── 红线03: Determine controlled vs uncontrolled by checking if prop is passed ──
  // Use !== undefined instead of "prop" in options to handle cases where prop is explicitly passed as undefined
  const isSortControlled = externalSortState !== undefined;
  const isFilterControlled = externalFilterState !== undefined;
  const isPaginationControlled = externalPagination !== undefined;
  const isSelectionControlled = externalSelectedRows !== undefined;

  const sortState = isSortControlled ? externalSortState : internalSortState;
  const filterState = isFilterControlled ? externalFilterState : internalFilterState;
  const pagination = isPaginationControlled
    ? externalPagination
    : { ...internalPagination, total: data.length };
  const selectedRows = isSelectionControlled
    ? externalSelectedRows
    : internalSelectedRows;

  // ── Sort handler ──
  const handleSort = React.useCallback(
    (field: string) => {
      const nextSort: SortState = { field, direction: "asc" };

      if (sortState.field === field) {
        if (sortState.direction === "asc") {
          nextSort.direction = "desc";
        } else if (sortState.direction === "desc") {
          nextSort.direction = "none";
        } else {
          nextSort.direction = "asc";
        }
      }

      if (isSortControlled && onSortChange) {
        onSortChange(nextSort);
      } else {
        setInternalSortState(nextSort);
      }
    },
    [sortState, isSortControlled, onSortChange]
  );

  // ── Filter handler ──
  const handleFilter = React.useCallback(
    (field: string, value: FilterValue) => {
      const nextFilter = { ...filterState, [field]: value };
      if (isFilterControlled && onFilterChange) {
        onFilterChange(nextFilter);
      } else {
        setInternalFilterState(nextFilter);
      }
    },
    [filterState, isFilterControlled, onFilterChange]
  );

  // ── Pagination handlers ──
  const handlePageChange = React.useCallback(
    (page: number) => {
      if (isPaginationControlled && onPaginationChange) {
        onPaginationChange({ ...pagination, page });
      } else {
        setInternalPagination((prev) => ({ ...prev, page }));
      }
    },
    [isPaginationControlled, onPaginationChange, pagination]
  );

  const handlePageSizeChange = React.useCallback(
    (pageSize: number) => {
      if (isPaginationControlled && onPaginationChange) {
        onPaginationChange({ ...pagination, page: 1, pageSize });
      } else {
        setInternalPagination((prev) => ({ ...prev, page: 1, pageSize }));
      }
    },
    [isPaginationControlled, onPaginationChange, pagination]
  );

  // ── Selection handlers ──
  const handleSelect = React.useCallback(
    (key: T[keyof T]) => {
      let nextSelected: Array<T[keyof T]>;

      if (selectionMode === "single") {
        nextSelected = [key];
      } else {
        const isSelected = selectedRows.includes(key);
        nextSelected = isSelected
          ? selectedRows.filter((k) => k !== key)
          : [...selectedRows, key];
      }

      const selectedItems = nextSelected
        .map((k) => data.find((item) => item[rowKey] === k))
        .filter(Boolean) as T[];

      if (isSelectionControlled && onSelectionChange) {
        onSelectionChange(nextSelected, selectedItems);
      } else {
        setInternalSelectedRows(nextSelected);
      }
    },
    [selectionMode, selectedRows, data, rowKey, isSelectionControlled, onSelectionChange]
  );

  const handleSelectAll = React.useCallback(() => {
    if (selectionMode !== "multiple") return;

    const allKeys = data.map((item) => item[rowKey]);
    const isAllSelected = allKeys.every((k) => selectedRows.includes(k));

    const nextSelected = isAllSelected ? [] : allKeys;
    const selectedItems = isAllSelected ? [] : [...data];

    if (isSelectionControlled && onSelectionChange) {
      onSelectionChange(nextSelected, selectedItems);
    } else {
      setInternalSelectedRows(nextSelected);
    }
  }, [selectionMode, data, rowKey, selectedRows, isSelectionControlled, onSelectionChange]);

  // ── Processed data (sorted + filtered) ──
  const processedData = React.useMemo(() => {
    let result = [...data];

    // Apply sorting
    if (sortState.direction !== "none" && sortState.field) {
      result.sort((a, b) => {
        const aVal = a[sortState.field as keyof T];
        const bVal = b[sortState.field as keyof T];
        if (aVal < bVal) return sortState.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortState.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    // Apply filtering
    Object.entries(filterState).forEach(([field, filter]) => {
      if (filter.value === null) return;
      result = result.filter((item) => {
        const cellValue = String(item[field as keyof T] ?? "");
        switch (filter.type) {
          case "text":
            return cellValue.toLowerCase().includes((filter.value as string).toLowerCase());
          case "select": {
            const selectedValues = filter.value as string[];
            return selectedValues.length === 0 || selectedValues.includes(cellValue);
          }
          case "range": {
            const [min, max] = filter.value as [number, number];
            const numValue = Number(cellValue);
            return numValue >= min && numValue <= max;
          }
          default:
            return true;
        }
      });
    });

    return result;
  }, [data, sortState, filterState]);

  return {
    processedData,
    sortState,
    handleSort,
    filterState,
    handleFilter,
    pagination,
    handlePageChange,
    handlePageSizeChange,
    selectionMode,
    selectedRows,
    handleSelect,
    handleSelectAll,
    isSortControlled,
    isFilterControlled,
    isPaginationControlled,
    isSelectionControlled,
  };
}