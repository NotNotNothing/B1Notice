# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

B1Notice 是一个基于 B1 策略的股票监控系统，支持实时监控股票价格、成交量、涨跌幅、KDJ 指标，并通过 PushDeer 发送通知。系统支持 A 股、港股、美股市场。

**技术栈**: Next.js 15, TypeScript, Prisma, TailwindCSS, LongPort API, AKShare

## 常用开发命令

### 本地开发

```bash
# SQLite（默认）
npm run dev

# PostgreSQL
npm run dev:pg

# MySQL
npm run dev:mysql
```

### Docker 开发（推荐）

```bash
# 首次启动或重新构建
npm run docker:dev:build

# 查看日志
npm run docker:dev:logs

# 停止环境
npm run docker:dev:stop

# 进入容器
npm run docker:dev:shell
```

### 数据库操作

项目通过 `DB_TYPE` 环境变量切换数据库类型（sqlite/pgsql/mysql）：

```bash
# 生成 Prisma Client
npm run db:generate

# 部署迁移
npm run db:deploy

# 推送 schema 变更（开发环境）
npm run db:push:sqlite  # SQLite
npm run db:push:pg      # PostgreSQL

# 数据库同步管理系统（推荐）
npm run db:sync         # 同步所有 schema
npm run db:validate     # 验证 schema 一致性
npm run db:migrate:create  # 创建迁移
```

**注意**：本地开发使用 SQLite 时，必须指定 schema 路径：
```bash
npx prisma generate --schema=./prisma/sqlite/schema.prisma
```

### 构建与部署

```bash
# SQLite 构建
npm run build:sqlite

# PostgreSQL 构建（生产环境）
npm run build

# 不带迁移的构建
npm run build:without-migrate
```

## 核心架构

### 多数据源提供者模式

系统采用提供者模式支持多个数据源（LongPort、AKShare），位于 `src/server/datasource/`：

- `providers/longbridge.ts`: LongPort API 实现（港股、美股）
- `providers/akshare.ts`: AKShare 实现（A股）
- `registry.ts`: 提供者注册中心
- `index.ts`: 统一入口 `getQuoteProvider()`

**使用方式**：
```typescript
const provider = await getQuoteProvider('akshare');  // 或 'longbridge'
const quote = await provider.getQuote(symbol);
const kdj = await provider.calculateKDJ(symbol, KLINE_PERIOD.DAY);
```

**市场与数据源映射**：
- A股（SH、SZ）→ AKShare
- 港股（HK）、美股（US）→ LongPort

### 定时任务系统

位于 `src/server/tasks/`，采用任务定义 + 任务执行的两层架构：

**任务类型** (`catalog.ts`)：
- `DATA_SYNC`: 行情刷新（A股、港股、美股）
- `MONITOR`: 指标监控
- `INDICATOR`: KDJ 计算
- `SCREENING`: 收盘选股

**任务执行流程**：
1. 任务定义（`TaskDefinition`）定义任务元数据
2. 任务运行（`TaskRun`）记录每次执行
3. 任务事件（`TaskRunEvent`）记录执行日志

**核心服务**：
- `service.ts`: 任务中心服务
- `system-scheduler.ts`: 系统调度器
- `executor.ts`: 任务执行器

### 监控调度器

`src/lib/scheduler.ts` 的 `MonitorScheduler` 类负责：

1. **行情数据获取和存储**：从数据源获取股票报价、KDJ、BBI、知行多空趋势线
2. **指标监控**：检查监控规则（价格、成交量、KDJ、BBI 等）
3. **通知推送**：通过 PushDeer 发送通知
4. **收盘选股**：执行选股策略并推送结果

**监控类型**：
- PRICE: 价格监控
- VOLUME: 成交量监控
- CHANGE_PERCENT: 涨跌幅监控
- KDJ_J / WEEKLY_KDJ_J: KDJ 指标监控
- BBI_ABOVE_CONSECUTIVE / BBI_BELOW_CONSECUTIVE: BBI 连续天数监控
- SELL_SIGNAL: 卖出信号监控

**交易时段监控**（每 5 分钟）：
- A股: 9:30-11:30, 13:00-15:00
- 港股: 9:30-12:00, 13:00-16:00
- 美股: 21:30-04:00

**KDJ 计算时段**：
- A股: 14:50-15:00
- 港股: 15:50-16:00

**收盘选股时段**：
- A股: 15:10-16:00

### 收盘选股功能

位于 `src/server/screener/`，支持两种模式：

1. **基础模式**（BASIC）：预设选股条件（J 值、BBI、量比等）
2. **公式模式**（FORMULA）：支持通达信公式语法

**通达信公式解析器**：`tdx-formula.ts`

### API 路由结构

`src/app/api/` 按功能模块组织：

- `/auth/`: 认证相关（登录、注册、NextAuth）
- `/stocks/`: 股票数据（行情、K线、买卖信号）
- `/monitors/`: 监控规则管理
- `/trades/`: 交易记录管理
- `/tasks/`: 任务中心 API
- `/closing-screener/`: 收盘选股 API
- `/tdx-formulas/`: 通达信公式库 API
- `/user/`: 用户设置（PushDeer、数据源、BBI 设置等）

### 前端组件结构

`src/components/` 包含业务组件和 UI 组件：

**核心业务组件**：
- `StockList.tsx`: 股票列表
- `StockCard.tsx`: 股票卡片（展示报价、KDJ、BBI）
- `KLineChart.tsx`: K 线图表
- `AlertPanel.tsx` / `AlertForm.tsx` / `AlertList.tsx`: 监控规则管理
- `TradeBoard.tsx`: 交易记录看板
- `TaskCenterPanel.tsx`: 任务中心面板
- `ClosingScreenerPanel.tsx`: 收盘选股面板
- `TdxFormulaLibrary.tsx`: 通达信公式库

**UI 组件**：使用 Radix UI + TailwindCSS（`components/ui/`）

### 状态管理

使用 Zustand（`src/store/useStockStore.ts`）管理客户端状态。

## 数据库 Schema

支持三种数据库，schema 位于 `prisma/<db-type>/schema.prisma`：

**核心表**：
- `Stock`: 股票基础信息
- `Quote`: 股票报价（关联 KDJ、BBI、知行趋势）
- `Kdj`: KDJ 指标（日线、周线）
- `Bbi`: BBI 指标
- `ZhixingTrend`: 知行多空趋势线
- `Monitor`: 监控规则
- `Notification`: 通知记录
- `User`: 用户配置（数据源、PushDeer Key、选股参数等）
- `TradeRecord`: 交易记录
- `TaskDefinition` / `TaskRun` / `TaskRunEvent`: 任务系统
- `MarketScreeningRun` / `MarketScreeningSnapshot` / `MarketScreeningResult`: 收盘选股
- `TdxFormula`: 通达信公式库

**重要字段**：
- `User.dataSource`: 用户首选数据源（longbridge/akshare）
- `User.closingScreenerMode`: 选股模式（BASIC/FORMULA）
- `Quote` 通过外键关联 `dailyKdj`、`weeklyKdj`、`bbi`、`zhixingTrend`

## 开发注意事项

### 数据库迁移

1. 修改 schema 后，需要同步所有数据库的 schema：
   ```bash
   npm run db:sync
   ```

2. 为每种数据库创建迁移文件：
   ```bash
   # SQLite
   DB_TYPE=sqlite npm run db:migrate:dev:create

   # PostgreSQL
   DB_TYPE=pgsql npm run db:migrate:dev:create
   ```

3. 迁移文件需要手动创建在对应目录：
   - `prisma/sqlite/migrations/`
   - `prisma/pgsql/migrations/`

### 环境变量

必需的环境变量（`.env`）：
- `DATABASE_URL`: 数据库连接字符串
- `NEXTAUTH_SECRET`: NextAuth 密钥
- `NEXTAUTH_URL`: 应用 URL
- `LONGPORT_APP_KEY`, `LONGPORT_APP_SECRET`, `LONGPORT_ACCESS_TOKEN`: LongPort API 凭证
- `PUSHDEER_KEY`: PushDeer 推送密钥

Docker 环境使用 `.env.docker`

### 添加新数据源

1. 在 `src/server/datasource/providers/` 创建新提供者
2. 实现 `IQuoteProvider` 接口（`types.ts`）
3. 在 `index.ts` 中注册提供者
4. 在 `getProviderForMarket()` 中添加市场映射（`scheduler.ts`）

### 添加新任务类型

1. 在 `catalog.ts` 中定义任务
2. 在 `executor.ts` 中实现执行逻辑
3. 在 `system-scheduler.ts` 中添加调度规则

### 通达信公式开发

公式解析器位于 `src/server/screener/tdx-formula.ts`，支持的函数和语法参考该文件注释。

### Python 脚本

`scripts/akshare_proxy.py` 是 AKShare 的 HTTP 代理服务，用于获取 A 股数据。

## Docker 开发环境

详细文档见 `docs/docker-guide.md`

**快速命令**：
- 启动：`npm run docker:dev:build`
- 日志：`npm run docker:dev:logs`
- 停止：`npm run docker:dev:stop`
- 进入容器：`npm run docker:dev:shell`

**数据持久化**：
- SQLite: `prisma/sqlite/dev.db`（本地文件）
- 代码热更新：`src/`、`public/`、`prisma/`、`scripts/`

## 常见问题

### 本地开发数据库路径问题

确保在运行 Prisma 命令时指定正确的 schema 路径：
```bash
npx prisma generate --schema=./prisma/sqlite/schema.prisma
npx prisma migrate dev --schema=./prisma/sqlite/schema.prisma
```

### 多数据源初始化

数据源提供者采用延迟初始化，首次调用 `getQuoteProvider()` 时会自动初始化。如果初始化失败，会抛出异常。

### 任务执行超时

后台执行单元测试时，最大不能超过 60s，避免任务卡死。

### 前端性能优化

参考 `docs/` 目录下的相关文档，以及 React 和 Next.js 最佳实践。
