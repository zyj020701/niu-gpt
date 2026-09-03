import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WithQuery, Header, Body, Pagination } from "../src";
import type { Column, ServerQueryFn } from "../src";

// ===== Mock Data =====
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  age: number;
}

const generateUsers = (count: number): User[] => {
  const roles = ["Admin", "Editor", "Viewer"];
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: roles[i % roles.length],
    age: 20 + (i % 40),
  }));
};

const ALL_USERS = generateUsers(50);

// ===== Mock Server API =====
const mockServerQuery: ServerQueryFn<User> = async (params) => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  let filtered = [...ALL_USERS];

  // Server-side filtering
  if (params.filter) {
    Object.entries(params.filter).forEach(([key, filterValue]) => {
      if (!filterValue || filterValue.value === null) return;
      if (filterValue.type === "text") {
        const searchText = filterValue.value as string;
        filtered = filtered.filter((u) =>
          String(u[key as keyof User]).toLowerCase().includes(searchText.toLowerCase())
        );
      } else if (filterValue.type === "select") {
        const selected = filterValue.value as string[];
        filtered = filtered.filter((u) => selected.includes(String(u[key as keyof User])));
      } else if (filterValue.type === "range") {
        const [min, max] = filterValue.value as [number, number];
        filtered = filtered.filter((u) => {
          const val = Number(u[key as keyof User]);
          return val >= min && val <= max;
        });
      }
    });
  }

  // Server-side sorting
  if (params.sort && params.sort.field) {
    const { field, direction } = params.sort;
    filtered.sort((a, b) => {
      const aVal = a[field as keyof User];
      const bVal = b[field as keyof User];
      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  const total = filtered.length;

  // Server-side pagination
  const { page = 1, pageSize = 10 } = params.pagination ?? {};
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return { data, total };
};

const columns: Column<User>[] = [
  { key: "id", title: "ID", sortable: true, width: 60 },
  { key: "name", title: "Name", sortable: true, filterable: true, filterType: "text" },
  { key: "email", title: "Email", sortable: true, filterable: true, filterType: "text" },
  { key: "role", title: "Role", sortable: true, filterable: true, filterType: "select", filterOptions: ["Admin", "Editor", "Viewer"] },
  { key: "age", title: "Age", sortable: true, width: 80, filterable: true, filterType: "range" },
];

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

export default {
  title: "WithQuery",
  decorators: [
    (Story: any) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
};

// ===== Basic Server-Side Table =====
export const ServerSideTable = () => (
  <WithQuery<User>
    columns={columns}
    rowKey="id"
    queryKey={["users"]}
    queryFn={mockServerQuery}
  >
    <Header />
    <Body />
    <Pagination />
  </WithQuery>
);

// ===== With Selection =====
export const ServerSideWithSelection = () => {
  const [selectedRows, setSelectedRows] = React.useState<number[]>([]);

  return (
    <div>
      <div style={{ marginBottom: 8, fontFamily: "monospace", fontSize: 12 }}>
        Selected: [{selectedRows.join(", ")}]
      </div>
      <WithQuery<User>
        columns={columns}
        rowKey="id"
        queryKey={["users", "with-selection"]}
        queryFn={mockServerQuery}
        selectionMode="multiple"
        selectedRows={selectedRows}
        onSelectionChange={(keys) => setSelectedRows(keys as number[])}
      >
        <Header />
        <Body />
        <Pagination />
      </WithQuery>
    </div>
  );
};

// ===== With Loading Skeleton =====
export const WithLoadingSkeleton = () => (
  <WithQuery<User>
    columns={columns}
    rowKey="id"
    queryKey={["users", "skeleton"]}
    queryFn={async (params) => {
      // Longer delay to show skeleton
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return mockServerQuery(params);
    }}
    loadingFallback={
      <div style={{ padding: 20, border: "1px solid #ddd", borderRadius: 4 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                height: 40,
                background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s infinite",
                borderRadius: 4,
              }}
            />
          ))}
        </div>
      </div>
    }
  >
    <Header />
    <Body />
    <Pagination />
  </WithQuery>
);

// ===== With Error State =====
export const WithErrorState = () => (
  <WithQuery<User>
    columns={columns}
    rowKey="id"
    queryKey={["users", "error"]}
    queryFn={async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      throw new Error("Failed to fetch users: Network timeout");
    }}
    errorFallback={(error, retry) => (
      <div style={{ padding: 40, textAlign: "center", border: "1px solid #ff4d4f", borderRadius: 4, background: "#fff1f0" }}>
        <div style={{ color: "#ff4d4f", fontSize: 16, marginBottom: 8 }}>⚠️ {error.message}</div>
        <button onClick={retry} style={{ padding: "8px 16px", background: "#ff4d4f", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
          Retry
        </button>
      </div>
    )}
  >
    <Header />
    <Body />
    <Pagination />
  </WithQuery>
);

// ===== With Empty State =====
export const WithEmptyState = () => (
  <WithQuery<User>
    columns={columns}
    rowKey="id"
    queryKey={["users", "empty"]}
    queryFn={async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { data: [], total: 0 };
    }}
    emptyText="No users found. Try adjusting your filters."
  >
    <Header />
    <Body />
    <Pagination />
  </WithQuery>
);

// ===== Full Featured Server-Side =====
export const FullFeaturedServerSide = () => {
  const [selectedRows, setSelectedRows] = React.useState<number[]>([]);

  return (
    <div>
      <div style={{ marginBottom: 8, fontFamily: "monospace", fontSize: 12 }}>
        Selected: [{selectedRows.join(", ")}] | Total: 50 users (server-side)
      </div>
      <WithQuery<User>
        columns={columns}
        rowKey="id"
        queryKey={["users", "full-featured"]}
        queryFn={mockServerQuery}
        selectionMode="multiple"
        selectedRows={selectedRows}
        onSelectionChange={(keys) => setSelectedRows(keys as number[])}
        options={{
          refetchOnWindowFocus: false,
        }}
      >
        <Header />
        <Body />
        <Pagination />
      </WithQuery>
    </div>
  );
};