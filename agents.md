# dataTable pro — 分阶段 Agent 执行指令集

> 本文件将 S1~S7 拆分为 7 个独立的 Agent 模块，每个模块包含：
> - **阶段目标**：该阶段做什么
> - **验收标准**：通过什么才算完成
> - **执行指令**：可直接复制给 AI 执行
> - **红线提醒**：末尾附上 spec.md 中 8 条易踩坑的对应提醒

---

## Agent S1 — 项目基建

### 做什么
搭建项目骨架：初始化 TypeScript 项目，配置 tsup 作为构建工具，初始化 Storybook 开发环境，确保基础工程链路可运行。

### 验收标准
`pnpm storybook` 启动成功，浏览器能打开 Storybook 空页面，无语法报错。

### 执行指令

```
你是一个严格遵循分阶段交付的 AI 工程师。当前是 S1 阶段。

【任务】：搭建 dataTable pro 组件库的项目基建。

1. 使用 pnpm 初始化项目，包名为 @dataTable-pro/core。
2. 安装核心依赖：
   - React 18+、react-dom（peerDependencies）
   - TypeScript 严格模式（strict: true）
   - tsup 作为构建打包工具，输出 ESModule 格式
   - Storybook（用 @storybook/react + @storybook/builder-vite 或 @storybook/react-vite 初始化）
3. 配置目录结构：
   ```
   src/
     components/
       Table/
         index.tsx
         Header.tsx
         Body.tsx
         Pagination.tsx
     hooks/
       useDataTable.ts
     types/
       index.ts
     index.ts
   ```
4. 确保 package.json 拥有 main、module、types、files、exports 字段（占位，后续完善）。
5. 配置 tsconfig.json，开启 strict 模式。
6. 配置 tsup.config.ts，输出 esm 格式。
7. 初始化 Storybook，确保 `pnpm storybook` 可正常启动。
8. 在 Storybook 中创建一个最简单的 Welcome 页面，验证链路通畅。

【验收检查点】：
- pnpm storybook 启动无报错，浏览器可访问
- TypeScript 编译无错误（pnpm tsc --noEmit）
- 目录结构符合要求

【红线提醒】：
⚠️ 以下 8 条红线贯穿整个项目，本阶段请特别注意：
- 红线01：Compound 组件 Context 默认值必须设 `createContext<ContextType | null>(null)`，自定义 Hook 中抛出友好错误提示，防止组件单独使用崩溃。
- 红线02：泛型必须透传至内部 Hook，确保 `useDataTable<T>` 与组件泛型保持一致，避免 Hook 退化为 any。
- 红线03：选择状态双数据源冲突，需判断是否传值来决定受控/非受控模式。
- 红线04：QueryKey 引用不稳定，需用 useMemo 缓存或扁平化处理查询参数。
- 红线05：Storybook 遵循"先丑后美"，先实现核心功能展示，再逐步完善规范。
- 红线06：单测首日目标 60% 即可，优先覆盖 useDataTable 核心逻辑。
- 红线07：package.json 必须齐 main、module、types、files、exports 字段。
- 红线08：README 不仅要写"怎么装怎么用"，更要写"为何选它而非 antd Table"。
```

---

## Agent S2 — 类型定义与核心骨架

### 做什么
定义完整的 TypeScript 泛型系统：`DataTable<T>` 泛型类型、Column 定义、排序/筛选/分页类型，构建 Table 组件骨架与 Compound 组件结构（Table + Header + Body + Pagination）。

### 验收标准
TypeScript 编译通过，Table 组件可渲染出基本的表格结构（表头+行+分页区域），Storybook 中能看到组件渲染，排序功能未实现但骨架完整。

### 执行指令

```
你是一个严格遵循分阶段交付的 AI 工程师。当前是 S2 阶段。

【任务】：实现类型定义与核心组件骨架。

1. 在 src/types/index.ts 中定义：
   - `DataTable<T>` 泛型接口，包含 columns、data、sort、filter、pagination、selection 等配置
   - `Column<T>` 类型，包含 key、title、sortable、filterable、render、visible 等字段
   - `SortState` 类型（field、direction）
   - `FilterState` 类型
   - `PaginationState` 类型
   - `SelectionMode` 类型（'single' | 'multiple'）
   - 所有类型使用严格模式，禁止 any

2. 实现 Compound 组件结构：
   - `Table.tsx`：主容器，通过 React Context 向下传递状态（Context 默认值设为 null，并在消费时抛出友好错误）
   - `Header.tsx`：渲染列头，预留排序点击事件
   - `Body.tsx`：渲染数据行，预留选中行事件
   - `Pagination.tsx`：分页器 UI 骨架
   - 导出方式：`export { Table, Header, Body, Pagination }` 且支持 `<Table><Header/><Body/><Pagination/></Table>`

3. 在 Storybook 中创建一个基础 Story，传入静态 mock 数据，验证组件可渲染。

【验收检查点】：
- pnpm tsc --noEmit 无类型错误
- Storybook 中 Table 组件渲染出 3 列 5 行数据
- Header、Body、Pagination 均可单独使用（Context 为 null 时抛出友好错误而非白屏）

【红线提醒】：
⚠️ 本阶段特别关注：
- **红线01**：Compound 漏 Context 默认值 → createContext 必须设 null，Hook 内抛错。
- **红线02**：泛型未透传至内部 Hook → 确保 `Table<T>` 的泛型传入 `useDataTable<T>`。
- **红线05**：Storybook 先丑后美，不要纠结样式，功能优先。
- 其他红线在后续阶段会逐步涉及，请保持意识。
```

---

## Agent S3 — Hook 封装与排序功能

### 做什么
抽离 `useDataTable` Hook，将排序、筛选、分页等业务逻辑封装进去，实现列排序功能（点击表头升降序切换）。

### 验收标准
Storybook 中表格表头可点击排序，点击后数据按升序/降序重新排列，排序状态正确切换。

### 执行指令

```
你是一个严格遵循分阶段交付的 AI 工程师。当前是 S3 阶段。

【任务】：封装 useDataTable Hook 并实现排序功能。

1. 在 src/hooks/useDataTable.ts 中实现：
   - 泛型 Hook：`function useDataTable<T>(options: UseDataTableOptions<T>)`
   - 内部状态管理：sortState、filterState、paginationState
   - 支持受控/非受控模式：通过判断外部是否传入对应值来决定
   - 排序逻辑：接收 sortState，返回排序后的数据，暴露 handleSort 方法
   - 分页逻辑：接收 pagination，返回分页后的数据
   - 筛选逻辑（占位，后续实现）

2. 在 Table 组件中集成 useDataTable Hook：
   - Table 组件内部调用 useDataTable，将状态通过 Context 传递给子组件
   - Header 组件点击列头触发 handleSort，切换排序方向（none → asc → desc → none）
   - Body 组件根据排序后的数据渲染行

3. 更新 Storybook Story：
   - 展示排序前后对比
   - 验证点击表头排序正常

【验收检查点】：
- 点击列头，数据按升序排列
- 再次点击，切换为降序
- 第三次点击，取消排序恢复原始顺序
- 类型推导正确，无 any 类型

【红线提醒】：
⚠️ 本阶段特别关注：
- **红线02**：泛型必须透传 → `useDataTable<T>` 的泛型与 `Table<T>` 组件保持一致。
- **红线03**：选择状态双数据源冲突（本阶段虽未实现选择，但 Hook 设计时需预留受控/非受控判断逻辑）。
- **红线04**：QueryKey 引用不稳定（本阶段尚未涉及 React Query，但设计 Hook 时注意参数稳定性）。
- 其他红线继续保持意识。
```

---

## Agent S4 — 选择器双模式与列显隐/筛选

### 做什么
实现行选中功能（受控/非受控双模式）、列筛选功能（文本/下拉/范围）、列显示/隐藏控制。

### 验收标准
Storybook 中可选择行（单选/多选），可切换外部控制与内部控制模式，列的筛选与显隐功能正常。

### 执行指令

```
你是一个严格遵循分阶段交付的 AI 工程师。当前是 S4 阶段。

【任务】：实现选择器双模式、列筛选、列显隐功能。

1. 行选中功能：
   - 支持 `selectionMode: 'single' | 'multiple'`
   - 受控模式：外部传入 `selectedRows` 和 `onSelectionChange`
   - 非受控模式：内部 useState 管理选中状态
   - 判断逻辑：`const isControlled = 'selectedRows' in props`
   - Body 组件渲染 checkbox/radio，选中行高亮
   - 暴露 `selectedRows` 和批量操作方法给父组件

2. 列筛选功能：
   - 支持文本筛选（输入框模糊匹配）
   - 支持下拉筛选（多选枚举值）
   - 支持范围筛选（数字范围/日期范围）
   - 筛选逻辑集成到 useDataTable Hook 中

3. 列显隐控制：
   - 支持通过外部配置 `columns.visible` 控制列显示/隐藏
   - 支持动态切换列显隐

4. 批量操作：
   - 选中行后，通过回调暴露给父组件
   - 父组件可获取选中行数据执行批量操作

5. 更新 Storybook Story：
   - 展示受控/非受控两种模式切换
   - 展示筛选交互
   - 展示列显隐切换

【验收检查点】：
- 单选/多选模式选择正确
- 受控模式下外部状态与内部状态同步
- 非受控模式下内部状态独立管理
- 文本/下拉/范围筛选均生效
- 列显隐切换正常
- 无类型错误

【红线提醒】：
⚠️ 本阶段特别关注：
- **红线01**：Compound 漏 Context 默认值 → 选择状态通过 Context 传递时注意默认值处理。
- **红线03**：选择状态双数据源冲突 → 严格判断 `isControlled`，避免受控/非受控状态不同步。
- **红线02**：泛型透传 → 选中行的类型必须与 `Table<T>` 泛型一致。
- 其他红线继续保持意识。
```

---

## Agent S5 — React Query 集成与数据联动

### 做什么
集成 React Query，提供 `<WithQuery>` 外壳组件，支持服务端数据拉取、缓存与自动刷新，实现 useDataTable 与 React Query 的数据联动。

### 验收标准
Storybook 中使用 `<WithQuery>` 组件配合 mock 数据源，成功拉取数据并渲染表格，支持缓存、加载态、错误态展示。

### 执行指令

```
你是一个严格遵循分阶段交付的 AI 工程师。当前是 S5 阶段。

【任务】：集成 React Query，实现服务端数据联动。

1. 安装 @tanstack/react-query 依赖（作为 peerDependency）。

2. 实现 `<WithQuery>` 组件：
   - 泛型组件：`<WithQuery<T>>` 
   - 接收 `queryKey`、`queryFn`、`options` 等参数
   - 内部使用 `useQuery` 拉取数据
   - 处理 loading、error、empty、success 四种状态
   - 将数据传递给 Table 子组件渲染

3. 实现 useDataTable 与 React Query 的联动：
   - `useDataTable` 接收 `queryResult` 参数（从 useQuery 返回的结果）
   - 当数据源为服务端时，排序/筛选/分页参数需传递给 queryFn
   - 使用 useMemo 缓存 queryKey，避免重复请求

4. 创建 Storybook Story：
   - 使用 Mock Service Worker (MSW) 或 mock 函数模拟 API 请求
   - 展示加载态骨架屏
   - 展示数据渲染
   - 展示错误态
   - 展示空数据态

5. 支持排序/筛选/分页与服务端联动：
   - 排序参数变化时重新请求数据
   - 筛选参数变化时重新请求数据
   - 分页变化时重新请求数据

【验收检查点】：
- Mock 数据成功拉取并渲染
- 加载态有骨架屏或 loading 指示器
- 错误态有错误提示 UI
- 排序/筛选/分页触发重新请求
- 无重复请求（queryKey 稳定）

【红线提醒】：
⚠️ 本阶段特别关注：
- **红线04**：QueryKey 引用不稳定 → 必须用 `useMemo` 缓存 queryKey 对象，或使用扁平化参数（字符串/元组），防止每次渲染生成新对象导致重复请求。
- **红线02**：泛型透传 → `<WithQuery<T>>` 的泛型需与 `Table<T>` 和 `useDataTable<T>` 保持一致。
- **红线01**：Compound Context 默认值 → WithQuery 作为外壳组件，数据通过 Context 传递时注意 null 安全。
- 其他红线继续保持意识。
```

---

## Agent S6 — 单元测试与文档编写

### 做什么
编写核心单元测试（覆盖率 ≥60%），重点覆盖 useDataTable Hook 的核心逻辑与边界场景，撰写完整 README 文档（含 API 文档、示例、设计权衡与核心优势）。

### 验收标准
单元测试覆盖率 ≥60%，`pnpm test` 全部通过，无语法报错。README 包含 API 文档、完整示例，以及"为何选它而非 antd Table"的设计权衡说明。

### 执行指令

```
你是一个严格遵循分阶段交付的 AI 工程师。当前是 S6 阶段。

【任务】：编写核心单测与 README 文档。

1. 单元测试（Jest + React Testing Library）：
   - 优先覆盖 `useDataTable` Hook 的核心逻辑：
     - 排序功能（升序/降序/取消排序）
     - 筛选功能（文本/下拉/范围筛选）
     - 分页功能（页码切换/每页条数）
     - 行选中（受控模式/非受控模式）
     - 列显隐切换
   - 覆盖边界场景：
     - 空数据
     - 单行数据
     - 大数据量分页
     - 重复 key 值
   - 覆盖组件渲染测试：
     - Table 组件渲染
     - Header 排序点击
     - Body 行选中
     - Pagination 分页交互
   - 覆盖率目标：≥60%（但不要为了凑覆盖率而写无意义测试）

2. 撰写 README.md：
   - 项目简介与设计理念
   - 安装指南（pnpm add @dataTable-pro/core）
   - 快速上手示例（完整代码可复制运行）
   - API 文档（Table、Header、Body、Pagination、WithQuery、useDataTable）
   - 受控/非受控模式说明
   - 与 React Query 集成指南
   - **设计权衡与核心优势**：为什么选择这个组件库而非 antd Table？
     - 类型安全：完整泛型推导，无 any 隐患
     - 轻量可组合：Compound 模式，按需组装
     - 双模式灵活：受控/非受控开箱即用
     - 数据层解耦：React Query 集成，服务端数据无缝衔接
   - 贡献指南

【验收检查点】：
- pnpm test 全部通过
- 覆盖率报告显示 ≥60%
- pnpm tsc --noEmit 无类型错误
- README 内容完整，包含 API 文档与设计权衡

【红线提醒】：
⚠️ 本阶段特别关注：
- **红线06**：单测首日目标 60% 即可，优先覆盖 useDataTable 核心逻辑与边界场景，拒绝为覆盖率而测试无意义代码。
- **红线08**：README 不仅要写"怎么装怎么用"，更要写"为何选它而非 antd Table"，补充设计权衡与核心优势段落。
- 其他红线继续保持意识。
```

---

## Agent S7 — 发布部署与最终验收

### 做什么
完成 NPM 发布配置，确保包可被正确引用，发布至 NPM Public 源，最终验收全部质量标准。

### 验收标准
`pnpm publish` 成功发布至 NPM，包可被 `pnpm add @dataTable-pro/core` 安装并按需引入（ESModule），Storybook 部署上线（可选），覆盖率 ≥60%，README 完整。

### 执行指令

```
你是一个严格遵循分阶段交付的 AI 工程师。当前是 S7 阶段。

【任务】：完成发布部署与最终验收。

1. 检查 package.json 配置完整性：
   - `"main": "./dist/index.js"`（CommonJS 入口）
   - `"module": "./dist/index.mjs"`（ESModule 入口）
   - `"types": "./dist/index.d.ts"`（类型声明入口）
   - `"files": ["dist"]`（仅发布 dist 目录）
   - `"exports"` 字段配置子路径导出（如 `./styles`、`./hooks` 等）
   - `"peerDependencies"` 声明 React 18+ 和 @tanstack/react-query
   - 确保 `"private": false`
   - 确保 `"name"` 为 `@dataTable-pro/core` 或期望的包名

2. 构建验证：
   - 运行 `pnpm build` 确认构建成功
   - 检查 dist 目录包含 index.js、index.mjs、index.d.ts
   - 验证 `pnpm pack --dry-run` 输出内容正确（只包含需要的文件）

3. 发布到 NPM：
   - 确保已登录 npm（如果没有，提示用户手动登录）
   - 运行 `pnpm publish --access public` 发布

4. 安装验证：
   - 在一个新项目中 `pnpm add @dataTable-pro/core`
   - 验证 `import { Table, Header, Body, Pagination } from '@dataTable-pro/core'` 可正常使用
   - 验证类型推导正常

5. 最终验收清单：
   - [ ] Storybook 组件案例覆盖 ≥6 个场景
   - [ ] 单元测试覆盖率 ≥60%，无语法报错
   - [ ] README 完整，含 API 文档与示例
   - [ ] 成功发布至 NPM Public 源，支持按需引入
   - [ ] 所有 8 条红线已规避

【红线提醒】：
⚠️ 本阶段特别关注：
- **红线07**：npm 发布漏关键配置字段 → package.json 必须齐 main、module、types、files、exports 字段，否则包无法被正确引用。发布前务必 `pnpm pack --dry-run` 检查。
- **红线08**：README 只写用法无卖点 → 确认 README 中已包含"为何选它而非 antd Table"的设计权衡段落。
- **红线06**：确认覆盖率 ≥60% 且测试全部通过。
- 其他红线作为贯穿性要求，已在各阶段落实。
```

---

> **总结**：以上 7 个 Agent 模块（S1~S7）严格遵循 spec.md 的分阶段交付原则，每次执行一个 Agent，验收通过后再进入下一个。每个 Agent 末尾均附有对应的 8 条红线提醒，确保不踩坑。