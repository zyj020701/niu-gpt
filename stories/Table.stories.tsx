import React, { useState } from "react";
import { Table, Header, Body, Pagination } from "../src";
import type { Column, SortState, FilterState } from "../src/types";

// ===== Mock Data =====
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  age: number;
}

const mockUsers: User[] = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "Admin", age: 28 },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "Editor", age: 35 },
  { id: 3, name: "Charlie Brown", email: "charlie@example.com", role: "Viewer", age: 22 },
  { id: 4, name: "Diana Prince", email: "diana@example.com", role: "Admin", age: 30 },
  { id: 5, name: "Eve Adams", email: "eve@example.com", role: "Editor", age: 27 },
  { id: 6, name: "Frank Castle", email: "frank@example.com", role: "Viewer", age: 41 },
  { id: 7, name: "Grace Lee", email: "grace@example.com", role: "Admin", age: 33 },
  { id: 8, name: "Henry Ford", email: "henry@example.com", role: "Editor", age: 45 },
  { id: 9, name: "Ivy Chen", email: "ivy@example.com", role: "Viewer", age: 26 },
  { id: 10, name: "Jack Ryan", email: "jack@example.com", role: "Admin", age: 38 },
  { id: 11, name: "Kate Wilson", email: "kate@example.com", role: "Editor", age: 29 },
  { id: 12, name: "Liam Neeson", email: "liam@example.com", role: "Viewer", age: 55 },
  { id: 13, name: "Mia Wong", email: "mia@example.com", role: "Admin", age: 24 },
  { id: 14, name: "Noah Kim", email: "noah@example.com", role: "Editor", age: 31 },
  { id: 15, name: "Olivia Davis", email: "olivia@example.com", role: "Viewer", age: 36 },
];

const columns: Column<User>[] = [
  { key: "id", title: "ID", sortable: true, width: 60 },
  { key: "name", title: "Name", sortable: true, filterable: true, filterType: "text" },
  { key: "email", title: "Email", sortable: true, filterable: true, filterType: "text" },
  { key: "role", title: "Role", sortable: true, filterable: true, filterType: "select", filterOptions: ["Admin", "Editor", "Viewer"] },
  { key: "age", title: "Age", sortable: true, width: 80, filterable: true, filterType: "range" },
];

export default {
  title: "Table",
  component: Table,
};

// ===== Basic Table Story (Uncontrolled) =====
export const Basic = () => (
  <Table<User> columns={columns} data={mockUsers} rowKey="id">
    <Header />
    <Body />
    <Pagination />
  </Table>
);

// ===== With Selection Story =====
export const WithSelection = () => (
  <Table<User>
    columns={columns}
    data={mockUsers}
    rowKey="id"
    selectionMode="multiple"
  >
    <Header />
    <Body />
    <Pagination />
  </Table>
);

// ===== Controlled Sort Story =====
export const ControlledSort = () => {
  const [sortState, setSortState] = useState<SortState>({
    field: "",
    direction: "none",
  });

  return (
    <div>
      <div style={{ marginBottom: 8, fontFamily: "monospace" }}>
        Current sort: {sortState.field || "(none)"} / {sortState.direction}
      </div>
      <Table<User>
        columns={columns}
        data={mockUsers}
        rowKey="id"
        sortState={sortState}
        onSortChange={setSortState}
      >
        <Header />
        <Body />
        <Pagination />
      </Table>
    </div>
  );
};

// ===== Controlled Selection Story (S4) =====
export const ControlledSelection = () => {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const selectedItems = mockUsers.filter((u) => selectedRows.includes(u.id));

  return (
    <div>
      <div style={{ marginBottom: 8, fontFamily: "monospace" }}>
        Selected IDs: [{selectedRows.join(", ")}]
        <button onClick={() => setSelectedRows([])} style={{ marginLeft: 8 }}>
          Clear
        </button>
      </div>
      <div style={{ marginBottom: 8, fontSize: 12, color: "#666" }}>
        Selected names: {selectedItems.map((u) => u.name).join(", ") || "(none)"}
      </div>
      <Table<User>
        columns={columns}
        data={mockUsers}
        rowKey="id"
        selectionMode="multiple"
        selectedRows={selectedRows}
        onSelectionChange={(keys, items) => {
          console.log("Controlled selection changed:", keys, items);
          setSelectedRows(keys as number[]);
        }}
      >
        <Header />
        <Body />
        <Pagination />
      </Table>
    </div>
  );
};

// ===== Single Selection Story (S4) =====
export const SingleSelection = () => {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  return (
    <div>
      <div style={{ marginBottom: 8, fontFamily: "monospace" }}>
        Selected: {selectedRows.length > 0 ? selectedRows[0] : "(none)"}
      </div>
      <Table<User>
        columns={columns}
        data={mockUsers}
        rowKey="id"
        selectionMode="single"
        selectedRows={selectedRows}
        onSelectionChange={(keys) => setSelectedRows(keys as number[])}
      >
        <Header />
        <Body />
        <Pagination />
      </Table>
    </div>
  );
};

// ===== Filter Demo Story (S4) =====
export const FilterDemo = () => {
  const [filterState, setFilterState] = useState<FilterState>({});

  return (
    <div>
      <div style={{ marginBottom: 8, fontFamily: "monospace", fontSize: 12 }}>
        Active filters: {JSON.stringify(filterState)}
      </div>
      <Table<User>
        columns={columns}
        data={mockUsers}
        rowKey="id"
        filterState={filterState}
        onFilterChange={setFilterState}
      >
        <Header />
        <Body />
        <Pagination />
      </Table>
    </div>
  );
};

// ===== Column Visibility Demo Story (S4) =====
export const ColumnVisibilityDemo = () => (
  <Table<User> columns={columns} data={mockUsers} rowKey="id">
    <Header />
    <Body />
    <Pagination />
  </Table>
);

// ===== Full Featured Demo (S4) =====
export const FullFeatured = () => {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [sortState, setSortState] = useState<SortState>({ field: "", direction: "none" });
  const [filterState, setFilterState] = useState<FilterState>({});

  return (
    <div>
      <div style={{ marginBottom: 8, fontFamily: "monospace", fontSize: 12 }}>
        Sort: {sortState.field || "(none)"} / {sortState.direction} | Selected: [{selectedRows.join(", ")}] | Filters: {JSON.stringify(filterState)}
      </div>
      <Table<User>
        columns={columns}
        data={mockUsers}
        rowKey="id"
        selectionMode="multiple"
        selectedRows={selectedRows}
        onSelectionChange={(keys) => setSelectedRows(keys as number[])}
        sortState={sortState}
        onSortChange={setSortState}
        filterState={filterState}
        onFilterChange={setFilterState}
      >
        <Header />
        <Body />
        <Pagination />
      </Table>
    </div>
  );
};

// ===== Sort Cycle Demo Story =====
export const SortCycleDemo = () => {
  const [sortState, setSortState] = useState<SortState>({
    field: "",
    direction: "none",
  });

  const cycleSort = (field: string) => {
    setSortState((prev) => {
      if (prev.field !== field) return { field, direction: "asc" };
      if (prev.direction === "asc") return { field, direction: "desc" };
      if (prev.direction === "desc") return { field: "", direction: "none" };
      return { field, direction: "asc" };
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontFamily: "monospace" }}>
          Sort: {sortState.field || "(none)"} / {sortState.direction}
        </span>
        {" | "}
        <button onClick={() => cycleSort("name")}>Toggle Name Sort</button>
        {" "}
        <button onClick={() => cycleSort("age")}>Toggle Age Sort</button>
        {" "}
        <button onClick={() => setSortState({ field: "", direction: "none" })}>
          Reset
        </button>
      </div>
      <Table<User>
        columns={columns}
        data={mockUsers}
        rowKey="id"
        sortState={sortState}
        onSortChange={setSortState}
      >
        <Header />
        <Body />
        <Pagination />
      </Table>
    </div>
  );
};