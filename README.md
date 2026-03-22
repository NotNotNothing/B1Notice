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

### Docker 开发环境（默认）

开发环境统一使用 Docker，避免本地 `next dev` 与容器并行启动导致端口、环境变量和 SQLite 路径不一致。

#### 快速启动

```bash
npm run dev
```

等价命令：

```bash
npm run docker:dev:build
```

默认基础镜像使用镜像源：

```bash
docker.m.daocloud.io/library/node:20-slim
```

默认 `pnpm` 拉包也使用镜像源并固定版本 `pnpm@10.32.1`，避免首次构建时出现 `ECONNRESET`、`EOF`、TLS handshake timeout。
Python 依赖默认也走 `https://pypi.tuna.tsinghua.edu.cn/simple`，避免 `akshare` 安装时出现 PyPI EOF/TLS 中断。

如果你确认本机可以稳定访问 Docker Hub，也可以临时覆盖：

```bash
NODE_IMAGE=node:20-slim npm run dev
```

如果你确认本机可以稳定访问官方 npm registry，也可以临时覆盖：

```bash
NPM_REGISTRY=https://registry.npmjs.org npm run dev
```

如需切回官方 PyPI：

```bash
PIP_INDEX_URL=https://pypi.org/simple npm run dev
```

#### 常用命令

```bash
# 查看日志
npm run docker:dev:logs

# 停止环境
npm run docker:dev:stop

# 重启环境
npm run docker:dev:restart

# 进入容器
npm run docker:dev:shell

# 清理环境
npm run docker:dev:clean
```

#### 详细文档

查看 [Docker 开发环境指南](./docs/docker-guide.md) 了解更多信息。

### 本地开发（仅调试/排障时使用）

除非明确需要调试宿主机环境，否则不要直接启动本地 `next dev`。

```bash
npm install
```

#### 使用 SQLite

```bash
npm run dev:local
```

如需仅验证 SQLite 构建，可执行：

```bash
npm run build:sqlite
```

说明：`build:sqlite` 只会生成 Prisma Client 并执行 Next.js 构建，不会对本地 SQLite 数据库执行迁移。若修改了 Schema，请先显式运行 `npm run db:push:sqlite` 再进行构建验证。

#### 使用 PostgreSQL

```bash
npm run dev:local:pg
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
