# Docker 开发环境使用指南

## 📦 快速开始

### 1. 启动开发环境

```bash
# 首次启动或重新构建
npm run docker:dev:build

# 或者直接启动（如果已构建）
npm run docker:dev
```

### 2. 查看日志

```bash
npm run docker:dev:logs
```

### 3. 停止环境

```bash
npm run docker:dev:stop
```

### 4. 进入容器 Shell

```bash
npm run docker:dev:shell
```

## 🔧 可用命令

| 命令 | 说明 |
|------|------|
| `npm run docker:dev` | 启动开发环境 |
| `npm run docker:dev:build` | 重新构建并启动 |
| `npm run docker:dev:logs` | 查看实时日志 |
| `npm run docker:dev:stop` | 停止容器 |
| `npm run docker:dev:restart` | 重启容器 |
| `npm run docker:dev:shell` | 进入容器 Shell |
| `npm run docker:dev:clean` | 清理所有容器和数据卷（不删除本地 SQLite） |

## 🗄️ 数据库访问

### SQLite（默认）

SQLite 数据库文件位于工作区 `prisma/sqlite/dev.db`，容器内路径为 `/app/prisma/sqlite/dev.db`。

### PostgreSQL（可选）

如需使用 PostgreSQL，取消 `docker-compose.yml` 中 `postgres` 服务的注释，然后：

```bash
# 启动 PostgreSQL
docker-compose up -d postgres

# 连接数据库
npm run docker:psql
```

### MySQL（可选）

如需使用 MySQL，取消 `docker-compose.yml` 中 `mysql` 服务的注释，然后：

```bash
# 启动 MySQL
docker-compose up -d mysql

# 连接数据库
npm run docker:mysql
```

## 🔄 代码热更新

以下目录已挂载为数据卷，支持热更新：

- `./src` → `/app/src`
- `./public` → `/app/public`
- `./prisma` → `/app/prisma`
- `./scripts` → `/app/scripts`

修改这些目录中的代码后，Next.js 会自动重新编译。

## 🐛 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs b1notice-dev

# 重新构建镜像
npm run docker:dev:build
```

### 数据库连接失败

```bash
# 进入容器检查
npm run docker:dev:shell

# 手动运行迁移
npx prisma migrate deploy --schema ./prisma/sqlite/schema.prisma
```

### 端口冲突

如果 3000 端口被占用，修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "3001:3000"  # 改为 3001 或其他可用端口
```

### 清理环境

```bash
# 停止并删除容器、网络、数据卷
npm run docker:dev:clean

# 重新启动
npm run docker:dev:build
```

## 📊 资源监控

```bash
# 查看容器状态
docker-compose ps

# 查看资源使用情况
docker stats b1notice-dev

# 查看容器详情
docker inspect b1notice-dev
```

## 🔐 环境变量

环境变量配置文件：`.env.docker`

**重要配置项：**

- `DATABASE_URL`: 数据库连接字符串
- `NEXTAUTH_SECRET`: NextAuth 密钥
- `NEXTAUTH_URL`: 应用 URL
- `LONGPORT_*`: LongPort API 凭证
- `PUSHDEER_KEY`: 推送通知密钥

## 🚀 生产环境部署

生产环境建议使用独立的 `Dockerfile`（非 `Dockerfile.dev`），包含：

1. 多阶段构建优化
2. 生产环境配置
3. 更小的镜像体积
4. 更强的安全配置

## 📝 注意事项

1. **首次启动较慢**：需要安装依赖和编译，请耐心等待
2. **数据持久化**：SQLite 使用本地 `prisma/sqlite/dev.db`，`node_modules` 仍通过数据卷持久化
3. **性能考虑**：Docker 开发环境性能可能略低于本地开发
4. **网络访问**：容器内访问 `localhost` 需使用 `host.docker.internal`
5. **文件权限**：某些系统可能需要调整文件权限

## 🔗 相关链接

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Next.js Docker 示例](https://github.com/vercel/next.js/tree/canary/examples/with-docker)
