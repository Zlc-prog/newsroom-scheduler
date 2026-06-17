# CLAUDE.md — 智能排班软件（newsroom-scheduler）

## 项目概述

macOS 本地桌面应用，用于新闻编辑室的智能排班管理。基于 Tauri 2.x + React 19，数据全部存储于本地 SQLite。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2.x（Rust 后端） |
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite |
| 样式 | TailwindCSS v4（`@tailwindcss/vite` 插件，无配置文件） |
| 路由 | `@tanstack/react-router` |
| 状态管理 | Zustand |
| 数据库 | SQLite via `@tauri-apps/plugin-sql`（sqlx 连接池） |
| 日期处理 | dayjs + `isoWeek` 插件（周一=1，周日=7） |
| 拖拽排序 | `@hello-pangea/dnd`（React 19 兼容版） |
| 表格 | `@tanstack/react-table` |

---

## 目录结构

```
src/
├── components/
│   ├── layout/        # AppLayout、Sidebar
│   └── ui/            # Button、Modal、Input、Switch、Select 等通用组件
├── db/
│   ├── client.ts      # DB 初始化（WAL、busy_timeout、外键、迁移、seed）
│   ├── migrations.ts  # CREATE TABLE IF NOT EXISTS 语句数组
│   └── seed.ts        # 测试数据（员工1-14，部门：采访中心）
├── pages/
│   ├── employees/     # 员工管理（增删改查、拖拽排序、部门管理）
│   ├── department/    # 部门事项（排班事件 CRUD）
│   ├── schedule/      # 排班主页（周视图、手动添加、智能排班）
│   └── history/       # 历史排班（查看、复制）
├── services/
│   ├── employeeService.ts
│   ├── departmentService.ts
│   ├── scheduleService.ts
│   ├── scheduleEventService.ts
│   ├── historyService.ts
│   └── scheduleAlgorithm.ts   # 核心排班算法
├── stores/            # Zustand stores（employeeStore、scheduleStore 等）
├── types/             # TypeScript 类型定义
└── utils/
    └── week.ts        # getWeekDates(weekStart) → string[7]
```

---

## 数据库

- **路径**：`~/Library/Application Support/com.newsroom.scheduler/app.db`
- **WAL 模式**：已启用，支持并发读写
- **busy_timeout**：5000ms，防止 SQLITE_BUSY
- **外键**：已启用
- **无迁移版本控制**：所有建表语句用 `CREATE TABLE IF NOT EXISTS`，新字段需手动删除 app.db 重启

### 主要表

| 表 | 说明 |
|----|------|
| `departments` | 部门 |
| `employees` | 员工（is_leader、is_first_reviewer、mid_shift_only、day_shift_only、weekly_shifts） |
| `schedule_events` | 部门事项（出差/培训/假期等，block_scheduling 控制是否影响排班） |
| `schedule_event_employees` | 事项-员工关联 |
| `schedules` | 每周排班主记录（week_start UNIQUE） |
| `schedule_assignments` | 排班条目（shift_type: day/mid/topic/meeting/night） |
| `schedule_meetings` | 汇报会记录 |

---

## 排班算法（scheduleAlgorithm.ts）

### 班次类型

| 值 | 名称 | 说明 |
|----|------|------|
| `day` | 白班 | 08:00-15:00，领导必须在白班 |
| `mid` | 中班 | 14:00-20:30 |
| `topic` | 专题采制 | 每人每周一次，周一至周五无班日 |
| `night` | 夜班 | 特殊夜班（小夜/中夜/大夜） |
| `meeting` | 汇报会 | 手动添加 |

### 算法分阶段执行

1. **Phase 1**（硬规则）：工作日白班必须有领导，领导只排白班，不参与专题采制
2. **Phase 2**（硬规则）：白班必须有策划（初审员工），使用 plannerSchedule 配置
3. **Phase 3a**：仅中班员工优先安排中班
4. **Phase 3b**：仅白班员工优先安排白班
5. **Phase 3c**：普通员工按公平分数分配，白班至少保证1名编辑
6. **Phase 5**：每名非领导员工分配一次专题采制（周一至周五无班日）

### 每日均衡机制

```
perDayTarget = round(totalShifts/7)  预计算每日目标
adaptiveTarget = ceil(remaining / daysLeft)  自适应追赶
dailyShiftTarget = max(precomputed, adaptive)
```

### 公平分数（fairnessScore）

- 剩余班次多 → 优先排班（×100 权重）
- 周末上班多 → 降低优先级（×30）
- 周二上班多 → 降低优先级（×20）

---

## 重要编码规范

1. **不使用 SAVEPOINT**：`tauri-plugin-sql` 的 sqlx 连接池在每次 `execute()` 返回连接前会回滚未提交事务，跨 execute 的 SAVEPOINT 必然失败。所有写操作用顺序的单条 SQL。

2. **员工排序**：localStorage key `emp-sort-order`，存储员工 id 数组。默认顺序：领导 → 初审 → 其余（按 id 升序）。

3. **TailwindCSS v4**：不需要 `tailwind.config.js`，直接在 `src/index.css` 用 `@import "tailwindcss"`。

4. **dayjs isoWeek**：`isoWeekday()` 返回 1(周一)–7(周日)，`isoWeek()` 返回 ISO 周数。

5. **类型安全**：所有 store 的 action 类型写在 interface 里，不使用 `any`。

---

## 工作流规则（本项目必须遵守）

1. 新功能/修改 → 先进入 Plan Mode，生成方案，等待确认后再写代码
2. 完成独立模块 → 主动提示运行 /compact
3. 涉及 3 个以上文件或跨模块 → 列出计划等待确认；单文件小改动可直接执行
4. 每 5-6 轮对话 → 主动运行 /cost 汇报 token 消耗
5. 重大修改后 → 更新本 CLAUDE.md

---

## 最后更新

2026-05-29 — 初始版本，覆盖 Phase 1 全部功能模块。
