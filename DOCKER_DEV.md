# Docker 开发环境指南

本文档介绍如何使用 Docker 运行 B1Notice 开发环境，避免本地开发环境配置问题。

## 📋 前置要求

- Docker Desktop 已安装并运行
- 至少 4GB 可用内存
- 至少 10GB 可用磁盘空间

## 🚀 快速开始

### 1. 启动开发环境

```bash
# 方式一：使用启动脚本（推荐）
./dev-docker.sh start

# 方式二：直接使用 docker-compose
docker-compose -f docker-compose.dev.yml up -d
```

### 2. 访问应用

启动成功后，访问：http://localhost:3000

### 3. 查看日志

```bash
# 使用启动脚本
./dev-docker.sh logs

# 或使用 docker-compose
docker-compose -f docker-compose.dev.yml logs -f
```

### 4. 停止服务

```bash
# 使用启动脚本
./dev-docker.sh stop

# 或使用 docker-compose
docker-compose -f docker-compose.dev.yml down
```

## 🛠️ 可用命令

```bash
./dev-docker.sh start     # 启动开发环境
./dev-docker.sh stop      # 停止开发环境
./dev-docker.sh restart   # 重启开发环境
./dev-docker.sh logs      # 查看实时日志
./dev-docker.sh build     # 重新构建镜像
./dev-docker.sh clean     # 清理容器和数据卷（不删除本地 SQLite）
./dev-docker.sh help      # 显示帮助信息
```

## 📁 目录挂载说明

Docker 开发环境使用以下挂载策略：

| 本地路径 | 容器路径 | 说明 |
|---------|---------|------|
| `./src` | `/app/src` | 源代码（支持热重载）|
| `./public` | `/app/public` | 静态资源 |
| `./prisma` | `/app/prisma` | 数据库 schema |
| `./scripts` | `/app/scripts` | Python 脚本 |
| `node_modules` 卷 | `/app/node_modules` | Node.js 依赖（避免冲突）|
| `./prisma/sqlite/dev.db` | `/app/prisma/sqlite/dev.db` | 本地 SQLite 数据库文件 |

## 🔧 环境配置

### 环境变量

开发环境使用 `.env.docker` 文件中的配置。如需修改环境变量：

1. 编辑 `.env.docker` 文件
2. 重启容器：`./dev-docker.sh restart`

### 数据库配置

默认使用工作区内的 SQLite 数据库文件 `prisma/sqlite/dev.db`，容器和本地开发共用同一份数据。

如需重置数据库：

```bash
# 警告：这会删除本地 SQLite 数据库文件！
./dev-docker.sh clean
rm -f prisma/sqlite/dev.db
```

## 🔍 常见问题

### 1. 端口冲突

如果端口 3000 已被占用，可以修改 `docker-compose.dev.yml` 中的端口映射：

```yaml
ports:
  - "3001:3000"  # 改为其他端口
```

### 2. 权限问题

在 Linux 系统上可能需要使用 `sudo` 或将用户添加到 docker 组：

```bash
sudo usermod -aG docker $USER
```

### 3. 容器无法启动

检查日志：

```bash
./dev-docker.sh logs
```

或重新构建：

```bash
./dev-docker.sh build
./dev-docker.sh start
```

### 4. 热重载不生效

确保以下文件已正确挂载：

```bash
docker-compose -f docker-compose.dev.yml exec b1notice-dev ls -la /app/src
```

## 🐛 调试

### 进入容器

```bash
docker-compose -f docker-compose.dev.yml exec b1notice-dev sh
```

### 查看容器状态

```bash
docker-compose -f docker-compose.dev.yml ps
```

### 查看容器资源使用

```bash
docker stats b1notice-dev
```

## 📦 镜像信息

- **基础镜像**: node:20-alpine
- **Python 版本**: Python 3.x（用于 AKShare）
- **Node.js 版本**: Node 20 LTS
- **包管理器**: pnpm

## 🔄 更新依赖

如果修改了 `package.json`，需要重新构建：

```bash
./dev-docker.sh build
./dev-docker.sh restart
```

## 💡 开发建议

1. **代码编辑**：在本地编辑代码，变更会自动同步到容器
2. **数据库管理**：使用 Prisma Studio 查看数据库
3. **日志查看**：实时查看日志以监控应用状态
4. **环境隔离**：使用 Docker 避免污染本地开发环境

## 🎯 性能优化

Docker 开发环境已针对性能进行优化：

- 使用命名卷存储 `node_modules`，避免本地文件系统性能问题
- 使用 delegated 挂载策略，提高文件同步性能
- 健康检查确保服务稳定运行

## 📚 相关文档

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)
