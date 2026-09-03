import type React from "react";

// ===== Column Definition =====
export interface Column<T> {
  key: keyof T & string;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
  width?: string | number;
  render?: (value: T[keyof T], row: T, index: number) => React.ReactNode;
  filterType?: "text" | "select" | "range";
  filterOptions?: string[]; // For select filter type
}

// ===== Sort State =====
export interface SortState {
  field: string;
  direction: "asc" | "desc" | "none";
}

// ===== Filter State =====
export interface FilterValue {
  type: "text" | "select" | "range";
  value: string | string[] | [number, number] | null;
}

export interface FilterState {
  [field: string]: FilterValue;
}

// ===== Pagination State =====
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

// ===== Selection =====
export type SelectionMode = "single" | "multiple";

// ===== DataTable Props (Main Generic Interface) =====
export interface DataTableProps<T> {
  /** Column definitions */
  columns: Column<T>[];
  /** Data source */
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
  /** Loading state */
  loading?: boolean;
  /** Empty state text */
  emptyText?: string;
  /** Children (Compound component pattern) */
  children?: React.ReactNode;
}

// ===== Context Type =====
export interface DataTableContextType<T> {
  columns: Column<T>[];
  visibleColumns: Column<T>[];
  toggleColumn: (key: string) => void;
  data: T[];
  processedData: T[];
  rowKey: keyof T & string;
  sortState: SortState;
  handleSort: (field: string) => void;
  filterState: FilterState;
  handleFilter: (field: string, value: FilterValue) => void;
  pagination: PaginationState;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (pageSize: number) => void;
  selectionMode?: SelectionMode;
  selectedRows: Array<T[keyof T]>;
  handleSelect: (rowKey: T[keyof T]) => void;
  handleSelectAll: () => void;
  loading?: boolean;
  emptyText?: string;
}
