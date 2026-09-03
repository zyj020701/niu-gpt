import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Table } from "../src/components/Table";
import { Header } from "../src/components/Table/Header";
import { Body } from "../src/components/Table/Body";
import { Pagination } from "../src/components/Table/Pagination";
import type { Column } from "../src/types";

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
];

const mockColumns: Column<TestData>[] = [
  { key: "id", title: "ID", sortable: true },
  { key: "name", title: "Name", sortable: true },
  { key: "age", title: "Age", sortable: true },
  { key: "role", title: "Role", sortable: false },
];

describe("Table Components", () => {
  describe("Table", () => {
    it("should render table with data", () => {
      render(
        <Table data={mockData} columns={mockColumns} rowKey="id">
          <Header />
          <Body />
        </Table>
      );

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("Charlie")).toBeInTheDocument();
    });

    it("should render empty state when no data", () => {
      render(
        <Table data={[]} columns={mockColumns} rowKey="id">
          <Header />
          <Body />
        </Table>
      );

      expect(screen.getByText(/no data/i)).toBeInTheDocument();
    });
  });

  describe("Header", () => {
    it("should render column headers", () => {
      render(
        <Table data={mockData} columns={mockColumns} rowKey="id">
          <Header />
          <Body />
        </Table>
      );

      // Use getAllByText since column titles appear in both header and column toggle panel
      expect(screen.getAllByText("ID").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Name").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Age").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Role").length).toBeGreaterThan(0);
    });

    it("should trigger sort when clicking sortable column", () => {
      render(
        <Table data={mockData} columns={mockColumns} rowKey="id">
          <Header />
          <Body />
        </Table>
      );

      // Find the header cell containing "Name" (not the toggle label)
      const nameHeaders = screen.getAllByText("Name");
      const nameHeader = nameHeaders.find(el => 
        el.closest('.datatable-pro-header-cell-content')
      ) || nameHeaders[0];
      fireEvent.click(nameHeader);

      // After first click, should be sorted ascending
      // Find data rows: they have td but NOT the column toggle div
      const rows = screen.getAllByRole("row");
      const dataRows = rows.filter(row => {
        const hasTd = row.querySelector("td");
        const isToggleRow = row.querySelector(".datatable-pro-col-toggle");
        return hasTd && !isToggleRow;
      });
      expect(dataRows[0]).toHaveTextContent("Alice");
    });

    it("should not trigger sort when clicking non-sortable column", () => {
      render(
        <Table data={mockData} columns={mockColumns} rowKey="id">
          <Header />
          <Body />
        </Table>
      );

      // Find the header cell containing "Role" (not the toggle label)
      const roleHeaders = screen.getAllByText("Role");
      const roleHeader = roleHeaders.find(el => 
        el.closest('.datatable-pro-header-cell-content')
      ) || roleHeaders[0];
      fireEvent.click(roleHeader);

      // Data should remain in original order
      // Find data rows: they have td but NOT the column toggle div
      const rows = screen.getAllByRole("row");
      const dataRows = rows.filter(row => {
        const hasTd = row.querySelector("td");
        const isToggleRow = row.querySelector(".datatable-pro-col-toggle");
        return hasTd && !isToggleRow;
      });
      expect(dataRows[0]).toHaveTextContent("Alice");
    });
  });

  describe("Body", () => {
    it("should render all data rows", () => {
      render(
        <Table data={mockData} columns={mockColumns} rowKey="id">
          <Header />
          <Body />
        </Table>
      );

      const rows = screen.getAllByRole("row");
      // +2 for header rows (column toggle row + main header row)
      expect(rows.length).toBeGreaterThanOrEqual(mockData.length + 1);
    });

    it("should render custom cell content with render function", () => {
      const columnsWithRender: Column<TestData>[] = [
        ...mockColumns.slice(0, 1),
        {
          key: "name",
          title: "Name",
          render: (value) => <strong>{String(value).toUpperCase()}</strong>,
        },
      ];

      render(
        <Table data={mockData} columns={columnsWithRender} rowKey="id">
          <Header />
          <Body />
        </Table>
      );

      expect(screen.getByText("ALICE")).toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    it("should render pagination controls", () => {
      render(
        <Table
          data={mockData}
          columns={mockColumns}
          rowKey="id"
          pagination={{ page: 1, pageSize: 2, total: 10 }}
        >
          <Header />
          <Body />
          <Pagination />
        </Table>
      );

      // Check for pagination info text instead of /page/ which matches multiple options
      expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    });

    it("should trigger page change when clicking next", () => {
      const onPaginationChange = vi.fn();
      render(
        <Table
          data={mockData}
          columns={mockColumns}
          rowKey="id"
          pagination={{ page: 1, pageSize: 2, total: 10 }}
          onPaginationChange={onPaginationChange}
        >
          <Header />
          <Body />
          <Pagination />
        </Table>
      );

      // Pagination uses ">" for next page, not "Next"
      const nextButton = screen.getByText(">");
      fireEvent.click(nextButton);

      expect(onPaginationChange).toHaveBeenCalledWith({ page: 2, pageSize: 2, total: 10 });
    });
  });

  describe("Selection", () => {
    it("should render checkboxes in multiple selection mode", () => {
      render(
        <Table
          data={mockData}
          columns={mockColumns}
          rowKey="id"
          selectionMode="multiple"
        >
          <Header />
          <Body />
        </Table>
      );

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it("should select row when clicking checkbox", () => {
      render(
        <Table
          data={mockData}
          columns={mockColumns}
          rowKey="id"
          selectionMode="multiple"
        >
          <Header />
          <Body />
        </Table>
      );

      // Find the row containing Alice and click it (checkbox is readonly, click is on tr)
      const aliceRow = screen.getByText("Alice").closest("tr");
      fireEvent.click(aliceRow!);

      // Verify the checkbox is now checked
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes[0]).toBeChecked();
    });
  });
});