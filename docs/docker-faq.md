# Docker 开发环境 FAQ

## 常见问题解答

### 1. Docker 镜像构建失败

**问题**: 运行 `npm run docker:dev:build` 时构建失败

**解决方案**:

```bash
# 清理 Docker 缓存
docker system prune -a

# 重新构建（不使用缓存）
docker-compose build --no-cache

# 查看详细错误信息
docker-compose build --progress=plain
```

---

### 2. 容器启动后无法访问 http://localhost:3000

**可能原因**:
1. 端口被占用
2. 服务未完全启动
3. 健康检查失败

**解决方案**:

```bash
# 1. 检查端口占用
lsof -i :3000

# 2. 查看容器日志
npm run docker:dev:logs

# 3. 检查容器状态
docker-compose ps

# 4. 等待更长时间（首次启动需要安装依赖）
# 服务启动可能需要 1-2 分钟
```

---

### 3. 代码修改后没有热更新

**解决方案**:

```bash
# 1. 检查数据卷挂载
docker-compose exec b1notice-dev ls -la /app/src

# 2. 重启容器
npm run docker:dev:restart

# 3. 查看日志确认 Next.js 是否检测到文件变化
npm run docker:dev:logs
```

---

### 4. 数据库连接失败

**问题**: 出现 `Error: Can't reach database server` 错误

**解决方案**:

```bash
# 1. 进入容器
npm run docker:dev:shell

# 2. 检查数据库文件
ls -la prisma/sqlite/

# 3. 手动运行迁移
npx prisma migrate deploy --schema ./prisma/sqlite/schema.prisma

# 4. 生成 Prisma Client
npx prisma generate --schema ./prisma/sqlite/schema.prisma
```

---

### 5. Python/AKShare 相关错误

**问题**: AKShare 模块找不到或连接失败

**解决方案**:

```bash
# 1. 进入容器验证 Python 环境
npm run docker:dev:shell
python3 --version
pip3 list | grep akshare

# 2. 如果 akshare 未安装
pip3 install akshare requests

# 3. 测试 AKShare
python3 scripts/akshare_proxy.py check

# 4. 重新构建镜像
npm run docker:dev:build
```

---

### 6. 磁盘空间不足

**问题**: Docker 占用大量磁盘空间

**解决方案**:

```bash
# 1. 查看空间使用
docker system df

# 2. 清理未使用的资源
docker system prune

# 3. 清理所有未使用的镜像和数据卷
docker system prune -a --volumes

# 4. 仅清理项目相关
npm run docker:dev:clean
```

---

### 7. 容器内网络问题

**问题**: 容器内无法访问外部网络或 localhost 服务

**解决方案**:

```bash
# 访问宿主机服务，使用特殊主机名
# 而不是 localhost 或 127.0.0.1
curl http://host.docker.internal:8080

# macOS/Windows
DATABASE_URL="postgresql://user:pass@host.docker.internal:5432/db"

# Linux（需要添加参数）
# 在 docker-compose.yml 中添加：
# extra_hosts:
#   - "host.docker.internal:host-gateway"
```

---

### 8. 权限问题

**问题**: 文件权限错误或无法写入文件

**解决方案**:

```bash
# 1. 检查文件权限
ls -la prisma/sqlite/

# 2. 修复权限（在宿主机执行）
chmod -R 755 prisma/

# 3. 如果是 node_modules 权限问题
# 删除并重新创建数据卷
docker-compose down -v
npm run docker:dev:build
```

---

### 9. 内存占用过高

**问题**: Docker 容器占用过多内存

**解决方案**:

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  b1notice-dev:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

### 10. 多个开发环境冲突

**问题**: 多个项目使用相同端口或容器名冲突

**解决方案**:

```bash
# 1. 修改项目名称（在 docker-compose.yml 顶部）
name: b1notice-dev

# 2. 修改容器名
services:
  b1notice-dev:
    container_name: b1notice-dev-unique

# 3. 修改端口映射
ports:
  - "3001:3000"
```

---

### 11. 如何查看容器内的环境变量

```bash
# 查看所有环境变量
docker-compose exec b1notice-dev env

# 查看特定环境变量
docker-compose exec b1notice-dev printenv DATABASE_URL
```

---

### 12. 如何在容器内运行 Prisma Studio

```bash
# 方式 1: 在容器内运行
npm run docker:dev:shell
npx prisma studio --schema ./prisma/sqlite/schema.prisma

# 方式 2: 从宿主机连接容器数据库
# 先找到容器 IP
docker inspect b1notice-dev | grep IPAddress

# 然后在宿主机运行
npx prisma studio --port 5555
```

---

### 13. 如何备份容器数据

```bash
# 备份 SQLite 数据库
docker cp b1notice-dev:/app/prisma/sqlite/dev.db ./backup_$(date +%Y%m%d).db

# 备份整个数据卷
docker run --rm -v b1notice-db-data:/data -v $(pwd):/backup alpine tar czf /backup/db-backup.tar.gz /data
```

---

### 14. 如何在多个终端访问同一个容器

```bash
# 打开多个终端，都执行
npm run docker:dev:shell

# 或使用 docker exec
docker exec -it b1notice-dev sh
```

---

### 15. Docker Compose 命令失败

**问题**: `docker-compose` 命令报错

**解决方案**:

```bash
# 1. 检查 docker-compose 版本
docker-compose --version

# 2. 如果版本过旧，更新
# macOS (使用 Homebrew)
brew upgrade docker-compose

# 3. 尝试使用新版命令格式（Docker Compose V2）
docker compose up -d  # 注意：没有连字符
```

---

## 获取更多帮助

1. **查看详细日志**: `npm run docker:dev:logs`
2. **进入容器调试**: `npm run docker:dev:shell`
3. **查看文档**: [docs/docker-guide.md](./docker-guide.md)
4. **Docker 官方文档**: https://docs.docker.com/
5. **提交 Issue**: 项目 GitHub 仓库

---

## 调试技巧总结

```bash
# 1. 查看容器状态
docker-compose ps

# 2. 查看容器日志（实时）
docker-compose logs -f b1notice-dev

# 3. 查看容器详细信息
docker inspect b1notice-dev

# 4. 查看容器资源使用
docker stats b1notice-dev

# 5. 进入容器 Shell
docker-compose exec b1notice-dev sh

# 6. 查看容器进程
docker top b1notice-dev

# 7. 导出容器文件系统（调试用）
docker export b1notice-dev > container.tar

# 8. 查看容器网络
docker network ls
docker network inspect b1notice-network
```
