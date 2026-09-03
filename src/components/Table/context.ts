import { createContext, useContext } from "react";
import type { DataTableContextType } from "../../types";

// 红线01: Context 默认值必须设为 null，防止组件单独使用崩溃
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DataTableContext = createContext<DataTableContextType<any> | null>(null);

/**
 * Custom hook to consume DataTable context.
 * Throws a friendly error if used outside of <Table> component.
 */
export function useDataTableContext<T>(): DataTableContextType<T> {
  const context = useContext(DataTableContext);
  if (context === null) {
    throw new Error(
      "[dataTable-pro] Component must be used within a <Table> component. " +
        "Please wrap your Header, Body, or Pagination component inside <Table>."
    );
  }
  return context as DataTableContextType<T>;
}

export { DataTableContext };