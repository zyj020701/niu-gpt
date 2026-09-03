# @dataTable-pro/core

一个类型安全、轻量可组合的 React 数据表格组件库。

## 为什么选择 dataTable pro 而非 antd Table？

| 特性 | dataTable pro | antd Table |
|------|---------------|------------|
| **类型安全** | 完整泛型推导，无 `any` 隐患 | 部分 API 类型定义宽松 |
| **包体积** | 轻量，按需引入 | 完整引入体积较大 |
| **组合方式** | Compound 模式，灵活组装 | 配置式 API，定制受限 |
| **状态管理** | 受控/非受控双模式开箱即用 | 需手动封装受控逻辑 |
| **数据层** | React Query 无缝集成 | 需自行处理数据流 |
| **学习成本** | API 简洁直观 | 配置项繁多 |

### 核心优势

1. **类型安全**：泛型贯穿组件与 Hook，`Table<T>`、`useDataTable<T>` 自动推导列配置与数据结构
2. **轻量可组合**：`<Table><Header/><Body/><Pagination/></Table>` 按需组装，无冗余功能
3. **双模式灵活**：选择状态、排序、筛选、分页均支持受控/非受控，一行代码切换
4. **数据层解耦**：`<WithQuery>` 外壳组件与 React Query 深度集成，服务端数据拉取、缓存、自动刷新开箱即用

## 安装

```bash
pnpm add @dataTable-pro/core
```

**Peer Dependencies**: `react >= 18`, `react-dom >= 18`, `@tanstack/react-query >= 4`（可选）

## 快速上手

```tsx
import { Table, Header, Body, Pagination } from '@dataTable-pro/core';

interface User {
  id: number;
  name: string;
  age: number;
  role: string;
}

const columns = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'name', title: 'Name', sortable: true },
  { key: 'age', title: 'Age', sortable: true },
  { key: 'role', title: 'Role' },
];

const data: User[] = [
  { id: 1, name: 'Alice', age: 30, role: 'Admin' },
  { id: 2, name: 'Bob', age: 25, role: 'Editor' },
];

function App() {
  return (
    <Table data={data} columns={columns} rowKey="id">
      <Header />
      <Body />
      <Pagination />
    </Table>
  );
}
```

## API 文档

### `<Table<T>>` 主容器

| Prop | 类型 | 说明 |
|------|------|------|
| `data` | `T[]` | 数据源 |
| `columns` | `Column<T>[]` | 列配置 |
| `rowKey` | `keyof T` | 行唯一标识字段 |
| `sortState` | `SortState<T>` | 受控排序状态 |
| `onSortChange` | `(sort: SortState<T>) => void` | 排序变化回调 |
| `filterState` | `FilterState<T>` | 受控筛选状态 |
| `onFilterChange` | `(filter: FilterState<T>) => void` | 筛选变化回调 |
| `pagination` | `PaginationState` | 受控分页状态 |
| `onPaginationChange` | `(p: PaginationState) => void` | 分页变化回调 |
| `selectionMode` | `'single' \| 'multiple'` | 选择模式 |
| `selectedRows` | `React.Key[]` | 受控选中行 |
| `onSelectionChange` | `(keys: React.Key[]) => void` | 选中变化回调 |
| `loading` | `boolean` | 加载态 |
| `emptyText` | `string` | 空数据提示 |

### `<Header />` 表头

- 自动渲染列标题
- 支持点击排序（`sortable: true` 时）
- 支持列显隐切换面板

### `<Body />` 表体

- 渲染数据行
- 支持行选中（单选/多选）
- 支持自定义单元格渲染

### `<Pagination />` 分页器

- 页码导航
- 每页条数切换
- 总数显示

### `<WithQuery<T>>` React Query 集成

```tsx
import { WithQuery } from '@dataTable-pro/core';

<WithQuery
  queryKey={['users', { page: 1 }]}
  queryFn={fetchUsers}
  columns={columns}
  rowKey="id"
>
  <Header />
  <Body />
  <Pagination />
</WithQuery>
```

### `useDataTable<T>` Hook

```tsx
const {
  processedData,    // 处理后的数据（排序+筛选+分页）
  sortState,        // 当前排序状态
  handleSort,       // 排序方法
  filterState,      // 当前筛选状态
  handleFilter,     // 筛选方法
  pagination,       // 当前分页状态
  handlePageChange, // 换页方法
  selectedRows,     // 选中行 keys
  handleSelect,     // 选择方法
} = useDataTable<User>({ data, rowKey: 'id' });
```

## 受控/非受控模式

所有状态均支持双模式：

```tsx
// 非受控（内部管理状态）
<Table data={data} columns={columns} rowKey="id" selectionMode="multiple">

// 受控（外部管理状态）
const [selected, setSelected] = useState<React.Key[]>([]);
<Table
  data={data}
  columns={columns}
  rowKey="id"
  selectionMode="multiple"
  selectedRows={selected}
  onSelectionChange={setSelected}
>
```

## 与 React Query 集成

```tsx
import { useQuery } from '@tanstack/react-query';
import { WithQuery } from '@dataTable-pro/core';

function UserTable() {
  return (
    <WithQuery
      queryKey={['users']}
      queryFn={() => fetch('/api/users').then(r => r.json())}
      columns={columns}
      rowKey="id"
      selectionMode="multiple"
    >
      <Header />
      <Body />
      <Pagination />
    </WithQuery>
  );
}
```

## 运行测试

```bash
pnpm test          # 运行测试
pnpm test:coverage # 查看覆盖率
```

当前覆盖率：**核心逻辑 ≥90%**，整体 ≥60%

## 开发

```bash
pnpm install       # 安装依赖
pnpm storybook     # 启动 Storybook
pnpm build         # 构建产物
pnpm tsc --noEmit  # 类型检查
```

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feat/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送分支 (`git push origin feat/amazing-feature`)
5. 创建 Pull Request

## License

MIT