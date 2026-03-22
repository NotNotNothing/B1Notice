# AGENTS.md

本文件给后续参与 `B1Notice` 开发的 Agent / 助手使用，目标是：**快速理解项目、稳定加功能、少踩坑。**

## 0. 开发启动约定

从现在开始，**默认开发环境统一使用 Docker**，不要优先启动宿主机上的 `next dev`。

原因：

- 宿主机本地进程和 Docker 容器同时运行时，容易出现：
  - 3000 端口被错误进程占用
  - `NEXTAUTH_URL` / `DATABASE_URL` 实际生效值不一致
  - SQLite 文件路径解析不同，导致“页面连的是 A 库，脚本查的是 B 库”
  - 浏览器命中的并不是你刚改完的那个服务

推荐命令：

```bash
# 默认开发入口
npm run dev

# 等价于
npm run docker:dev:build

# 如果必须直接调用 Compose，请统一使用 Compose V2 语法
docker compose up -d --build
```

硬性约定：

- **默认入口永远是 `npm run dev` 或 `npm run docker:dev:*`，不要优先手敲 `docker compose`。**
- 如需直接调用 Docker Compose，**只允许使用 `docker compose`（Compose V2）**，不要再使用 `docker-compose`。
- 当前唯一的 Docker 开发编排文件是根目录 `docker-compose.yml`，不要再创建或引用 `docker-compose.dev.yml` 之类的平行开发配置。
- 排障顺序统一为：先确认 Docker Desktop / Docker Engine 已启动，再执行 `docker compose version`，最后看 `npm run docker:dev:logs`。
- 如果脚本报 `docker-compose: not found`，不要继续排应用代码，先把命令改回 `docker compose`。
- 不要让宿主机 `next dev` 和 Docker 容器同时争抢 3000 端口。

常用 Docker 开发命令：

```bash
# 启动/重建
npm run docker:dev:build

# 查看日志
npm run docker:dev:logs

# 停止
npm run docker:dev:stop

# 重启
npm run docker:dev:restart

# 进入容器
npm run docker:dev:shell
```

默认 `NODE_IMAGE` 使用镜像源，避免 Docker Hub 匿名 token 或 TLS/EOF 问题：

```bash
docker.m.daocloud.io/library/node:20-slim
```

默认 `pnpm` 使用固定版本 `pnpm@10.32.1`，并通过镜像源拉包，减少 Docker 构建阶段出现 `ECONNRESET`、`EOF`、TLS handshake timeout。
默认 Python 依赖通过 `https://pypi.tuna.tsinghua.edu.cn/simple` 安装，降低 `akshare` 安装时的 PyPI EOF/TLS 问题。

如需覆盖：

```bash
NODE_IMAGE=node:20-slim npm run dev
```

如需切回官方 npm registry：

```bash
NPM_REGISTRY=https://registry.npmjs.org npm run dev
```

如需切回官方 PyPI：

```bash
PIP_INDEX_URL=https://pypi.org/simple npm run dev
```

仅在明确需要排查宿主机环境问题时，才使用本地开发：

```bash
npm run dev:local
npm run dev:local:pg
npm run dev:local:mysql
```

如果你发现登录、环境变量、数据库路径、端口映射表现异常，**先检查是不是本地进程和 Docker 混跑了**。
如果你发现 Compose 命令不可用，**优先检查是否误用了 `docker-compose` 而不是 `docker compose`**。

## 1. 项目概览

`B1Notice` 是一个基于 **Next.js App Router** 的股票监控与提醒系统，核心能力包括：

- 管理股票池
- 拉取行情/K线数据
- 计算技术指标（KDJ、BBI 等）
- 生成买卖信号
- 配置监控条件（价格、涨跌幅、KDJ、BBI、卖出信号等）
- 记录交易
- 通过 PushDeer 发送通知
- 提供登录与用户级偏好配置

从首页 UI 看，主要分为三个业务区：

- **股票列表**
- **指标监控**
- **交易记录**

## 2. 技术栈

根据当前代码结构识别到的主要技术：

- **Next.js**（App Router）
- **React**
- **TypeScript**
- **NextAuth**（登录鉴权）
- **Prisma**
- **SQLite**（当前至少存在 `prisma/sqlite/schema.prisma`）
- **Zustand**（`useStockStore`）
- **node-schedule**（定时任务）
- **Tailwind CSS + shadcn/ui 风格组件**
- **Longbridge**（行情/K线数据）
- **PushDeer**（消息推送）

## 3. 目录结构（按职责理解）

> 以“业务职责”来理解，而不是只看文件名。

### 3.1 页面层：`src/app`

关键页面/入口：

- `src/app/page.tsx`
  - 首页总控台
  - 聚合股票列表、监控面板、交易记录
  - 定时调用 `fetchStocks()` 刷新前端数据
- `src/app/login/page.tsx`
  - 登录页

### 3.2 API 层：`src/app/api`

这是项目的主要后端入口。

已确认的重点接口：

- `src/app/api/auth/auth.config.ts`
  - NextAuth 配置
- `src/app/api/stocks/route.ts`
  - 股票列表 / 股票数据相关接口
- `src/app/api/stocks/signals/route.ts`
  - 股票信号相关接口
- `src/app/api/monitors/route.ts`
  - 监控项 CRUD / 查询
- `src/app/api/trades/route.ts`
  - 交易记录接口
- `src/app/api/user/pushdeer/route.ts`
  - 用户 PushDeer 配置
- `src/app/api/user/bbi-settings`（从首页调用可见）
  - 用户是否展示 BBI 趋势信号的设置

> 后续新增功能时，优先判断它属于：股票、信号、监控、交易、用户设置 中的哪一类，再放到对应 API 命名空间下。

### 3.3 组件层：`src/components`

从首页依赖看，当前核心组件包括：

- `StockList`
- `AlertPanel`
- `TradeBoard`
- `UserSettings`
- `ui/*` 基础组件

建议：

- **业务组件** 放 `src/components`
- **通用 UI 原子组件** 放 `src/components/ui`
- 不要把大量业务逻辑塞进页面文件里

### 3.4 状态层：`src/store`

- `useStockStore`
  - 前端股票列表状态管理
  - 已负责 `fetchStocks`、排序状态等逻辑

如果新增前端复杂交互（筛选、排序、批量操作、实时状态），优先考虑放 store，而不是层层 props 传递。

### 3.5 基础能力层：`src/lib`

重点文件：

- `src/lib/prisma.ts`
  - Prisma Client 单例封装
- `src/lib/scheduler.ts`
  - 定时拉数、检查监控条件、生成通知的核心调度逻辑

`scheduler.ts` 是项目的核心后端业务之一，不要轻易做大改；新增能力时，优先：

1. 抽成独立函数
2. 在调度器中编排调用
3. 保持“获取数据 / 计算指标 / 触发通知”职责清晰

### 3.6 服务层：`src/server`

根据引用可见至少存在：

- `src/server/longbridge/client`
  - 行情/K 线数据客户端
- `src/server/pushdeer`
  - PushDeer 通知发送逻辑

建议：

- **对外部服务的访问统一收敛在 `src/server/*`**
- API Route / Scheduler 不要直接写大量第三方调用细节

### 3.7 数据层：`prisma`

重点：

- `prisma/sqlite/schema.prisma`

当前项目明显依赖 Prisma schema 中的这些业务实体（从代码引用推断）：

- `Stock`
- `Quote`
- `Monitor`
- `Notification`
- `Kdj`
- `Bbi`
- `Trade` / `TradeRecord`（具体命名以 schema 为准）
- 用户相关表

后续开发前，**任何涉及“新增字段 / 新增表 / 关系调整”的需求，都先改 Prisma schema，再生成/迁移。**

---

## 4. 当前核心业务流

## 4.1 股票与信号展示

首页 `src/app/page.tsx` 会：

- 从 `useStockStore` 取股票数据
- 计算摘要：
  - 监控股票数
  - 买入信号数
  - 卖出信号数
  - 强势结构数
- 每 5 分钟自动刷新一次股票数据
- 按 Tab 展示股票列表、指标监控、交易记录

说明：

- **首页是聚合层，不应堆业务细节**
- 复杂统计建议下沉到服务层或 selector

## 4.2 监控调度

`src/lib/scheduler.ts` 显示该项目有成熟的调度器逻辑，大致职责包括：

- 启动时拉取股票数据
- 定时检查监控项
- 从数据库读取 quote / kdj / bbi 等指标
- 对不同监控类型做判断
- 条件满足时创建通知
- 出错时记录失败通知/日志
- 集成 PushDeer 发送提醒

已看到支持的监控类型包括：

- `PRICE`
- `VOLUME`
- `CHANGE_PERCENT`
- `KDJ_J`
- `WEEKLY_KDJ_J`
- `BBI_ABOVE_CONSECUTIVE`
- `BBI_BELOW_CONSECUTIVE`
- `SELL_SIGNAL`

这说明本项目新增“策略/提醒条件”时，通常需要同时改这几层：

1. Prisma 枚举/表结构（若涉及）
2. API 入参/出参
3. 前端监控配置 UI
4. `scheduler.ts` 中的取值与判断逻辑
5. 通知文案

## 4.3 通知链路

当前至少确认一条通知路径：

- 指标/条件命中
- 创建 `notification` 记录
- 调用 PushDeer 发送消息

新增通知渠道（如 Telegram / 邮件 / Webhook）时，建议做成统一抽象：

- `src/server/notifications/*`
- 统一 `sendNotification()` 入口
- PushDeer 作为一个 provider

不要把多渠道发送逻辑散落在 scheduler 和 route 里。

## 4.4 交易记录

首页已有 `TradeBoard`，且存在 `api/trades/route.ts`。

说明项目支持至少以下能力中的一部分：

- 新增交易
- 查询交易
- 展示交易记录
- 可能和股票池、信号联动

如果后续做盈亏统计、胜率、复盘分析，建议单独形成一块“交易分析”服务，而不是继续堆进 TradeBoard 组件。

---

## 5. 代码风格与开发约定

## 5.1 先分层，再编码

新增功能时优先按下面顺序思考：

1. **数据结构**：Prisma 是否需要变更？
2. **服务能力**：逻辑放 `src/server` 还是 `src/lib`？
3. **接口设计**：API 输入输出是什么？
4. **前端状态**：是否需要 store？
5. **UI 组件**：页面如何组合？

不要一上来就在页面组件里直接写 SQL/Prisma/复杂业务判断。

## 5.2 保持职责边界

- `app/page.tsx`：页面编排
- `components/*`：展示 + 轻交互
- `app/api/*`：请求入口、参数校验、响应格式
- `server/*`：第三方服务/业务服务
- `lib/*`：共享基础逻辑、调度、工具
- `prisma/*`：数据模型

## 5.3 API 设计建议

新增 Route 时建议：

- 明确 `GET / POST / PATCH / DELETE` 语义
- 统一错误返回格式
- 先做参数校验
- 不要把数据库异常直接原样暴露给前端

如果项目里尚未统一校验，后续可考虑引入 `zod` 做接口入参校验。

## 5.4 定时任务修改原则

修改 `scheduler.ts` 时要特别谨慎：

- 不要引入重复触发
- 注意生产/开发环境差异（代码中已有 `isProd`）
- 不要让单个监控异常影响全局调度
- 所有外部调用都要兜底日志和错误处理
- 尽量避免在循环里做高成本串行请求

## 5.5 数据一致性

涉及以下场景时注意事务/幂等：

- 生成通知时避免重复创建
- 批量更新行情时避免部分成功造成脏状态
- 交易记录新增/修改影响持仓统计时要保证一致性

---

## 6. 后续最可能开发的新功能

结合当前项目状态，后续高概率需求有：

### 6.1 新增监控条件 / 新策略

这是最自然的扩展方向。

新增一个策略时，通常检查点：

- [ ] schema 是否要加枚举/字段
- [ ] API 是否支持新增类型
- [ ] 前端是否能配置该类型
- [ ] scheduler 是否能读取当前值
- [ ] scheduler 是否能判断命中条件
- [ ] 通知文案是否清晰
- [ ] 股票列表 / 信号页是否需要展示

### 6.2 多通知渠道

当前 PushDeer 已存在，后续很可能想接：

- Telegram Bot
- 邮件
- 企业微信 / 飞书
- Webhook

建议先抽象 provider，避免以后每加一个渠道都改一遍核心流程。

### 6.3 回测 / 信号分析

目前更偏“监控提醒”，后续可能扩展到：

- 某策略历史命中率
- 买卖信号回测
- 交易绩效分析
- 多股票对比面板

这类能力建议单独做模块，不要把首页继续塞满。

### 6.4 用户级个性化

已经看到用户级设置（如 BBI 展示、PushDeer）。后续可继续扩展：

- 默认排序
- 自选股分组
- 指标显示偏好
- 通知静默时段
- 不同用户不同监控规则

---

## 7. 建议优先补强的地方

如果要继续长期开发，这几个方向值得优先整理：

### 7.1 补一份真正的环境变量文档

建议新增：

- `.env.example`
- `README` 中的环境变量说明

至少写清：

- NextAuth 相关变量
- 数据库路径
- Longbridge 凭证
- PushDeer Key
- 运行环境差异

### 7.2 抽离通知中心

现在通知能力看起来已成体系，建议尽快抽象为：

- `src/server/notifications/index.ts`
- `src/server/notifications/providers/pushdeer.ts`

这样后面加渠道会省很多事。

### 7.3 给策略判断加测试

像 `SELL_SIGNAL`、KDJ、BBI 这类逻辑，最好逐步补：

- 单元测试
- 样本数据测试
- 边界情况测试

尤其是技术指标类功能，最怕“看起来能跑，实际上算错”。

### 7.4 给 API 做统一返回规范

如果现在每个 route 风格不统一，后续越写越乱。建议尽早统一：

- `success`
- `message`
- `data`
- `errorCode`

---

## 8. 新功能开发建议流程

后续任何 Agent 接手开发时，推荐按这个顺序：

1. 先读：
   - `README.md`
   - `package.json`
   - `prisma/sqlite/schema.prisma`
   - 相关 `api/*/route.ts`
   - 相关 `components/*`
   - `src/lib/scheduler.ts`（如果功能涉及监控/信号/通知）
2. 明确改动范围：前端 / API / DB / 调度 / 通知
3. 先设计数据结构和接口
4. 再做 UI 和交互
5. 本地自测至少覆盖：
   - 正常路径
   - 空数据
   - 权限/未登录
   - 第三方接口失败
   - 重复触发/重复提交

---

## 9. 已知判断（基于当前代码扫描）

以下是当前对项目的工作性判断：

- 这是一个**已具备实用业务闭环**的项目，不是 demo
- 核心价值在于：**行情 → 指标 → 信号/监控 → 通知 → 交易记录**
- `scheduler.ts` 是关键枢纽文件
- Prisma schema 是整个项目的事实来源之一
- 首页 UI 已经偏产品化，不建议随意打散
- 后续新增功能，最容易影响的是：
  - API 契约
  - 调度逻辑
  - 数据模型一致性

---

## 10. 给后续 Agent 的一句话

在这个项目里，**最重要的不是把页面改出来，而是别破坏“数据、策略、通知”这条主链路。**

如果你要加新功能，先确认它落在哪一层：

- 展示层？
- 配置层？
- 策略层？
- 通知层？
- 数据层？

分清楚，再动手。

---

## 11. CLAUDE.md 补充内容

以下内容补充自 `CLAUDE.md`，并已按当前项目约定合并到本文件中。后续 Agent 不需要再单独依赖 `CLAUDE.md` 才能理解项目。

### 11.1 项目补充概述

- `B1Notice` 是一个基于 B1 策略的股票监控系统
- 支持 A 股、港股、美股
- 支持实时监控股票价格、成交量、涨跌幅、KDJ 指标，并通过 PushDeer 发送通知

### 11.2 常用开发命令

#### Docker 开发

```bash
npm run dev
npm run docker:dev:build
npm run docker:dev:logs
npm run docker:dev:stop
npm run docker:dev:shell
```

#### 本地开发（仅调试）

```bash
npm run dev:local
npm run dev:local:pg
npm run dev:local:mysql
```

#### 数据库操作

项目通过 `DB_TYPE` 环境变量切换数据库类型（sqlite/pgsql/mysql）：

```bash
# 生成 Prisma Client
npm run db:generate

# 部署迁移
npm run db:deploy

# 推送 schema 变更（开发环境）
npm run db:push:sqlite
npm run db:push:pg
npm run db:push:mysql

# 数据库同步管理系统（推荐）
npm run db:sync
npm run db:validate
npm run db:migrate:create
```

注意：

- 本地使用 SQLite 时，要特别注意 schema 路径和数据库路径是否一致
- 如果你不是在处理宿主机本地环境问题，优先在 Docker 环境里执行这些命令

#### 构建与部署

```bash
npm run build:sqlite
npm run build
npm run build:without-migrate
```

## 12. 核心架构补充

### 12.1 多数据源提供者模式

系统通过 `src/server/datasource/` 支持多个数据源：

- `providers/longbridge.ts`
- `providers/akshare.ts`
- `registry.ts`
- `index.ts`

统一入口：

```ts
const provider = await getQuoteProvider('akshare')
const quote = await provider.getQuote(symbol)
const kdj = await provider.calculateKDJ(symbol, KLINE_PERIOD.DAY)
```

市场与数据源映射：

- A 股（SH、SZ）→ AKShare
- 港股（HK）、美股（US）→ Longbridge

### 12.2 定时任务系统

任务系统位于 `src/server/tasks/`，采用“任务定义 + 任务执行”两层架构。

任务类型（`catalog.ts`）：

- `DATA_SYNC`
- `MONITOR`
- `INDICATOR`
- `SCREENING`

核心服务：

- `service.ts`
- `system-scheduler.ts`
- `executor.ts`

执行链路：

1. `TaskDefinition` 定义任务元数据
2. `TaskRun` 记录每次执行
3. `TaskRunEvent` 记录执行日志

### 12.3 收盘选股功能

位于 `src/server/screener/`，支持两种模式：

- `BASIC`
- `FORMULA`

通达信公式解析器位于：

- `src/server/screener/tdx-formula.ts`

## 13. API / 组件补充地图

### 13.1 API 模块

`src/app/api/` 主要分为：

- `/auth/`
- `/stocks/`
- `/monitors/`
- `/trades/`
- `/tasks/`
- `/closing-screener/`
- `/tdx-formulas/`
- `/user/`

### 13.2 关键业务组件

- `StockList.tsx`
- `StockCard.tsx`
- `KLineChart.tsx`
- `AlertPanel.tsx`
- `AlertForm.tsx`
- `AlertList.tsx`
- `TradeBoard.tsx`
- `TaskCenterPanel.tsx`
- `ClosingScreenerPanel.tsx`
- `TdxFormulaLibrary.tsx`

## 14. 数据模型补充

Schema 位于：

- `prisma/sqlite/schema.prisma`
- `prisma/pgsql/schema.prisma`

核心表：

- `Stock`
- `Quote`
- `Kdj`
- `Bbi`
- `ZhixingTrend`
- `Monitor`
- `Notification`
- `User`
- `TradeRecord`
- `TaskDefinition`
- `TaskRun`
- `TaskRunEvent`
- `MarketScreeningRun`
- `MarketScreeningSnapshot`
- `MarketScreeningResult`
- `TdxFormula`

关键字段：

- `User.dataSource`
- `User.closingScreenerMode`
- `Quote.dailyKdjId`
- `Quote.weeklyKdjId`
- `Quote.bbiId`
- `Quote.zhixingTrendId`

## 15. 开发注意事项补充

### 15.1 数据库迁移

修改 schema 后，优先执行：

```bash
npm run db:sync
```

如果需要创建迁移文件：

```bash
DB_TYPE=sqlite npm run db:migrate:dev:create
DB_TYPE=pgsql npm run db:migrate:dev:create
```

迁移目录：

- `prisma/sqlite/migrations/`
- `prisma/pgsql/migrations/`

### 15.2 环境变量

必需环境变量：

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `LONGPORT_APP_KEY`
- `LONGPORT_APP_SECRET`
- `LONGPORT_ACCESS_TOKEN`
- `PUSHDEER_KEY`

Docker 环境使用：

- `.env.docker`

### 15.3 添加新数据源

步骤：

1. 在 `src/server/datasource/providers/` 新建 provider
2. 实现 `IQuoteProvider`
3. 在 `index.ts` 注册
4. 在调度器里补市场映射

### 15.4 添加新任务类型

步骤：

1. 在 `catalog.ts` 定义任务
2. 在 `executor.ts` 实现执行逻辑
3. 在 `system-scheduler.ts` 添加调度规则

### 15.5 Python 脚本

`scripts/akshare_proxy.py` 是 AKShare 的 HTTP 代理服务，用于获取 A 股数据。

## 16. Docker 额外约定

详细文档参考：

- `docs/docker-guide.md`

额外提醒：

- 如果浏览器行为与容器内命令行结果不一致，优先检查端口 3000 当前到底由谁监听
- 不要让宿主机 `next dev` 和 Docker 容器同时争抢 3000，也不要再使用旧的 `docker-compose`
- 排查认证问题时，先确认浏览器命中的是不是容器里的服务

数据持久化：

- SQLite：`prisma/sqlite/dev.db`
- 代码热更新：`src/`、`public/`、`prisma/`、`scripts/`

## 17. 常见问题补充

### 17.1 本地数据库路径问题

运行 Prisma 命令时，要确认使用的是正确 schema：

```bash
npx prisma generate --schema=./prisma/sqlite/schema.prisma
npx prisma migrate dev --schema=./prisma/sqlite/schema.prisma
```

### 17.2 多数据源初始化

数据源 provider 采用延迟初始化，首次调用 `getQuoteProvider()` 时会自动初始化。初始化失败会抛异常。

### 17.3 任务执行超时

后台执行任务或测试时，单次不要超过 60 秒，避免任务长时间卡死。

### 17.4 前端性能优化

优先参考：

- `docs/` 目录
- React / Next.js 最佳实践
