import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDataTable } from "../src/hooks/useDataTable";

interface TestData {
  id: number;
  name: string;
  age: number;
  role: string;
}

const mockData: TestData[] = [
  { id: 1, name: "Alice", age: 30, role: "Admin" },
  { id: 2, name: "Bob", age: 25, role: "Editor" },
  { id: 3, name: "Charlie", age: 35, role: "Viewer" },
  { id: 4, name: "David", age: 28, role: "Editor" },
  { id: 5, name: "Eve", age: 32, role: "Admin" },
];

describe("useDataTable", () => {
  describe("Sorting", () => {
    it("should sort data ascending when handleSort is called", () => {
      const { result } = renderHook(() =>
        useDataTable({ data: mockData, rowKey: "id" })
      );

      act(() => {
        result.current.handleSort("age");
      });

      expect(result.current.sortState).toEqual({ field: "age", direction: "asc" });
      expect(result.current.processedData[0].age).toBe(25);
      expect(result.current.processedData[4].age).toBe(35);
    });

    it("should sort data descending on second click", () => {
      const { result } = renderHook(() =>
        useDataTable({ data: mockData, rowKey: "id" })
      );

      act(() => {
        result.current.handleSort("age");
      });
      act(() => {
        result.current.handleSort("age");
      });

      expect(result.current.sortState).toEqual({ field: "age", direction: "desc" });
      expect(result.current.processedData[0].age).toBe(35);
      expect(result.current.processedData[4].age).toBe(25);
    });

    it("should reset sorting on third click", () => {
      const { result } = renderHook(() =>
        useDataTable({ data: mockData, rowKey: "id" })
      );

      act(() => {
        result.current.handleSort("age");
      });
      act(() => {
        result.current.handleSort("age");
      });
      act(() => {
        result.current.handleSort("age");
      });

      expect(result.current.sortState).toEqual({ field: "age", direction: "none" });
      expect(result.current.processedData[0].id).toBe(1); // Original order
    });

    it("should support controlled sort mode", () => {
      const onSortChange = vi.fn();
      const { result } = renderHook(() =>
        useDataTable({
          data: mockData,
          rowKey: "id",
          sortState: { field: "name", direction: "asc" },
          onSortChange,
        })
      );

      expect(result.current.isSortControlled).toBe(true);
      expect(result.current.sortState).toEqual({ field: "name", direction: "asc" });

      act(() => {
        result.current.handleSort("age");
      });

      expect(onSortChange).toHaveBeenCalledWith({ field: "age", direction: "asc" });
    });
  });

  describe("Filtering", () => {
    it("should filter data with text filter", () => {
      const { result } = renderHook(() =>
        useDataTable({ data: mockData, rowKey: "id" })
      );

      act(() => {
        result.current.handleFilter("name", { type: "text", value: "alice" });
      });

      expect(result.current.processedData).toHaveLength(1);
      expect(result.current.processedData[0].name).toBe("Alice");
    });

    it("should filter data with select filter", () => {
      const { result } = renderHook(() =>
        useDataTable({ data: mockData, rowKey: "id" })
      );

      act(() => {
        result.current.handleFilter("role", { type: "select", value: ["Admin", "Editor"] });
      });

      expect(result.current.processedData).toHaveLength(4);
      expect(result.current.processedData.every((d) => ["Admin", "Editor"].includes(d.role))).toBe(true);
    });

    it("should filter data with range filter", () => {
      const { result } = renderHook(() =>
        useDataTable({ data: mockData, rowKey: "id" })
      );

      act(() => {
        result.current.handleFilter("age", { type: "range", value: [28, 32] });
      });

      expect(result.current.processedData).toHaveLength(3);
      expect(result.current.processedData.every((d) => d.age >= 28 && d.age <= 32)).toBe(true);
    });

    it("should support controlled filter mode", () => {
      const onFilterChange = vi.fn();
      const { result } = renderHook(() =>
        useDataTable({
          data: mockData,
          rowKey: "id",
          filterState: { name: { type: "text", value: "bob" } },
          onFilterChange,
        })
      );

      expect(result.current.isFilterControlled).toBe(true);
      expect(result.current.processedData).toHaveLength(1);

      act(() => {
        result.current.handleFilter("name", { type: "text", value: "alice" });
      });

      expect(onFilterChange).toHaveBeenCalled();
    });
  });

  describe("Pagination", () => {
    it("should paginate data correctly", () => {
      const { result } = renderHook(() =>
        useDataTable({
          data: mockData,
          rowKey: "id",
          pagination: { page: 1, pageSize: 2, total: mockData.length },
        })
      );

      expect(result.current.pagination.page).toBe(1);
      expect(result.current.pagination.pageSize).toBe(2);
    });

    it("should change page", () => {
      const onPaginationChange = vi.fn();
      const { result } = renderHook(() =>
        useDataTable({
          data: mockData,
          rowKey: "id",
          pagination: { page: 1, pageSize: 2, total: mockData.length },
          onPaginationChange,
        })
      );

      act(() => {
        result.current.handlePageChange(2);
      });

      expect(onPaginationChange).toHaveBeenCalledWith({ page: 2, pageSize: 2, total: mockData.length });
    });

    it("should change page size", () => {
      const onPaginationChange = vi.fn();
      const { result } = renderHook(() =>
        useDataTable({
          data: mockData,
          rowKey: "id",
          pagination: { page: 1, pageSize: 2, total: mockData.length },
          onPaginationChange,
        })
      );

      act(() => {
        result.current.handlePageSizeChange(5);
      });

      expect(onPaginationChange).toHaveBeenCalledWith({ page: 1, pageSize: 5, total: mockData.length });
    });

    it("should support uncontrolled pagination", () => {
      const { result } = renderHook(() =>
        useDataTable({ data: mockData, rowKey: "id" })
      );

      expect(result.current.isPaginationControlled).toBe(false);
      expect(result.current.pagination.page).toBe(1);
      expect(result.current.pagination.pageSize).toBe(10);
    });
  });

  describe("Selection", () => {
    it("should select a single row in multiple mode", () => {
      const { result } = renderHook(() =>
        useDataTable({ data: mockData, rowKey: "id", selectionMode: "multiple" })
      );

      act(() => {
        result.current.handleSelect(1);
      });

      expect(result.current.selectedRows).toEqual([1]);
    });

    it("should toggle selection in multiple mode", () => {
      const { result } = renderHook(() =>
        useDataTable({ data: mockData, rowKey: "id", selectionMode: "multiple" })
      );

      act(() => {
        result.current.handleSelect(1);
      });
      act(() => {
        result.current.handleSelect(1);
      });

      expect(result.current.selectedRows).toEqual([]);
    });

    it("should replace selection in single mode", () => {
      const { result } = renderHook(() =>
        useDataTable({ data: mockData, rowKey: "id", selectionMode: "single" })
      );

      act(() => {
        result.current.handleSelect(1);
      });
      act(() => {
        result.current.handleSelect(2);
      });

      expect(result.current.selectedRows).toEqual([2]);
    });

    it("should select all rows", () => {
      const { result } = renderHook(() =>
        useDataTable({ data: mockData, rowKey: "id", selectionMode: "multiple" })
      );

      act(() => {
        result.current.handleSelectAll();
      });

      expect(result.current.selectedRows).toEqual([1, 2, 3, 4, 5]);
    });

    it("should deselect all rows when all are selected", () => {
      const { result } = renderHook(() =>
        useDataTable({ data: mockData, rowKey: "id", selectionMode: "multiple" })
      );

      act(() => {
        result.current.handleSelectAll();
      });
      act(() => {
        result.current.handleSelectAll();
      });

      expect(result.current.selectedRows).toEqual([]);
    });

    it("should support controlled selection mode", () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useDataTable({
          data: mockData,
          rowKey: "id",
          selectionMode: "multiple",
          selectedRows: [1, 3],
          onSelectionChange,
        })
      );

      expect(result.current.isSelectionControlled).toBe(true);
      expect(result.current.selectedRows).toEqual([1, 3]);

      act(() => {
        result.current.handleSelect(2);
      });

      expect(onSelectionChange).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty data", () => {
      const { result } = renderHook(() =>
        useDataTable({ data: [], rowKey: "id" })
      );

      expect(result.current.processedData).toEqual([]);
      expect(result.current.selectedRows).toEqual([]);
    });

    it("should handle single row data", () => {
      const singleData = [{ id: 1, name: "Alice", age: 30, role: "Admin" }];
      const { result } = renderHook(() =>
        useDataTable({ data: singleData, rowKey: "id", selectionMode: "multiple" })
      );

      act(() => {
        result.current.handleSelectAll();
      });

      expect(result.current.selectedRows).toEqual([1]);
    });

    it("should handle large dataset with pagination", () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        age: 20 + (i % 50),
        role: i % 2 === 0 ? "Admin" : "Editor",
      }));

      const { result } = renderHook(() =>
        useDataTable({
          data: largeData,
          rowKey: "id",
          pagination: { page: 1, pageSize: 50, total: largeData.length },
        })
      );

      expect(result.current.processedData).toHaveLength(1000);
      expect(result.current.pagination.pageSize).toBe(50);
    });

    it("should handle sorting on empty field", () => {
      const { result } = renderHook(() =>
        useDataTable({ data: mockData, rowKey: "id" })
      );

      act(() => {
        result.current.handleSort("");
      });

      expect(result.current.sortState.field).toBe("");
    });

    it("should handle filter with null value", () => {
      const { result } = renderHook(() =>
        useDataTable({ data: mockData, rowKey: "id" })
      );

      act(() => {
        result.current.handleFilter("name", { type: "text", value: null });
      });

      expect(result.current.processedData).toHaveLength(mockData.length);
    });
  });
});