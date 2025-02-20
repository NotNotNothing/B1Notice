# B1Notice - 股票监控系统

基于 B1 策略的股票监控工具，支持实时监控股票价格、成交量、涨跌幅以及 KDJ 指标，并通过 PushDeer 发送通知。

## 环境变量配置

在项目根目录创建 `.env` 文件，并配置以下环境变量：

### 环境变量说明

- `DATABASE_URL`: 数据库连接字符串。支持 SQLite、PostgreSQL 和 MySQL
- `PUSHDEER_KEY`: PushDeer 推送服务的 Key，用于发送通知
- `LONGPORT_APP_KEY`: LongPort API 的 App Key
- `LONGPORT_APP_SECRET`: LongPort API 的 App Secret
- `LONGPORT_ACCESS_TOKEN`: LongPort API 的 Access Token

## 开发环境启动

```bash
npm install
```

### 使用 SQLite

```bash
npm run dev
```

### 使用 PostgreSQL

```bash
npm run dev:pg
```

## 功能特性

- 支持 A 股、港股、美股市场
- 实时监控股票价格、成交量、涨跌幅
- KDJ 指标计算和监控
- 自定义监控规则和阈值
- PushDeer 消息推送
- 支持多种数据库（SQLite、PostgreSQL、MySQL）

## 技术栈

- Next.js 15
- TypeScript
- Prisma
- TailwindCSS
- LongPort API
- PushDeer
