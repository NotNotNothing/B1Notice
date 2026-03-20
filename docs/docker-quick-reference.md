# Docker 快速参考卡片

## 🚀 一键启动

```bash
# 方式 1: 使用启动脚本（推荐）
./scripts/docker-start.sh

# 方式 2: 使用 npm 命令
npm run docker:dev:build
```

## 📋 常用命令

| 操作 | 命令 |
|------|------|
| 启动环境 | `npm run docker:dev` |
| 重新构建并启动 | `npm run docker:dev:build` |
| 查看日志 | `npm run docker:dev:logs` |
| 停止环境 | `npm run docker:dev:stop` |
| 重启环境 | `npm run docker:dev:restart` |
| 进入容器 | `npm run docker:dev:shell` |
| 清理环境 | `npm run docker:dev:clean` |

## 🌐 访问地址

- **应用**: http://localhost:3000
- **健康检查**: http://localhost:3000/api/health

## 🗄️ 数据库

- **类型**: SQLite（默认）
- **位置**: `/app/prisma/sqlite/dev.db`
- **持久化**: 通过 Docker Volume 持久化

## 🔧 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs b1notice-dev

# 重新构建
npm run docker:dev:build
```

### 端口冲突

修改 `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # 改为其他端口
```

### 数据库问题

```bash
# 进入容器
npm run docker:dev:shell

# 重新运行迁移
npx prisma migrate deploy --schema ./prisma/sqlite/schema.prisma
```

## 📊 监控命令

```bash
# 查看容器状态
docker-compose ps

# 查看资源使用
docker stats b1notice-dev

# 查看容器日志（最近 100 行）
docker-compose logs --tail=100 b1notice-dev
```

## 🔄 重置环境

```bash
# 停止并删除容器（保留数据卷）
npm run docker:dev:stop

# 完全清理（包括数据卷）
npm run docker:dev:clean

# 重新启动
npm run docker:dev:build
```

## 🐛 调试技巧

### 进入容器调试

```bash
# 进入 Shell
npm run docker:dev:shell

# 在容器内执行命令
node -v
python3 --version
npx prisma --version
```

### 查看容器内文件

```bash
# 列出文件
docker-compose exec b1notice-dev ls -la

# 查看环境变量
docker-compose exec b1notice-dev env
```

### 复制文件到容器

```bash
docker cp ./local-file.txt b1notice-dev:/app/
```

### 从容器复制文件

```bash
docker cp b1notice-dev:/app/file.txt ./
```

## ⚡ 性能优化

### 加速构建

1. 使用国内镜像源（如需要）
2. 利用 Docker 构建缓存
3. 只在必要时使用 `--no-cache`

### 减少磁盘占用

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理未使用的数据卷
docker volume prune

# 全面清理
docker system prune -a --volumes
```

## 🔐 安全提示

- 不要在 `.env.docker` 中存储生产环境密钥
- 定期更新基础镜像版本
- 不要在容器中使用 root 用户运行应用（生产环境）

## 📝 开发工作流

1. **启动环境**: `./scripts/docker-start.sh`
2. **修改代码**: 编辑 `src/` 目录下的文件
3. **查看日志**: `npm run docker:dev:logs`
4. **测试功能**: 访问 http://localhost:3000
5. **停止环境**: `npm run docker:dev:stop`

## 🆘 获取帮助

- 详细文档: [docs/docker-guide.md](./docker-guide.md)
- Docker 官方文档: https://docs.docker.com/
- 问题反馈: 提交 Issue
