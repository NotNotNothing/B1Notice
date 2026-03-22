# Docker 登录问题排查指南

## 问题描述

在使用 Docker 开发环境时，无法登录系统。

## 快速解决方案

### 1. 同步数据库 Schema

```bash
# 在容器中同步数据库
docker compose exec b1notice-dev \
  npx prisma db push --schema ./prisma/sqlite/schema.prisma --accept-data-loss
```

### 2. 创建默认用户

```bash
# 运行创建默认用户脚本
docker compose exec b1notice-dev \
  node scripts/create-default-user.js
```

### 3. 重启容器

```bash
# 重启开发容器
docker compose restart b1notice-dev

# 等待 10 秒让服务完全启动
sleep 10
```

### 4. 使用登录凭据

访问 http://localhost:3000/login，并优先使用本地 `prisma/sqlite/dev.db` 中已有的账号。

如果你刚初始化数据库，也可以先创建默认账号后再登录：

- **用户名**: `admin`
- **密码**: `admin123`

## 详细排查步骤

### 步骤 1: 检查容器状态

```bash
docker compose ps
```

确认容器状态为 `Up` 且健康检查为 `(healthy)`。

### 步骤 2: 查看应用日志

```bash
# 查看最近 50 行日志
docker compose logs --tail=50 b1notice-dev

# 实时查看日志
docker compose logs -f b1notice-dev
```

查找错误信息，特别是：
- 数据库连接错误
- Prisma schema 不匹配
- NextAuth 配置错误

### 步骤 3: 检查数据库

```bash
# 进入容器
docker compose exec b1notice-dev sh

# 检查用户表
sqlite3 ./prisma/sqlite/dev.db "SELECT username, name, role FROM User;"

# 退出容器
exit
```

如果没有用户，运行步骤 2 中的创建用户脚本。

### 步骤 4: 验证密码

```bash
# 在容器中测试密码验证
docker compose exec b1notice-dev node -e "
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (user) {
    const valid = await bcrypt.compare('admin123', user.password);
    console.log('用户:', user.username);
    console.log('密码验证:', valid ? '成功' : '失败');
  } else {
    console.log('用户不存在');
  }
  await prisma.\$disconnect();
}

test();
"
```

### 步骤 5: 检查环境变量

```bash
# 查看容器中的环境变量
docker compose exec b1notice-dev env | grep -E '(DATABASE_URL|NEXTAUTH)'
```

确认：
- `DATABASE_URL` 指向本地挂载的 `prisma/sqlite/dev.db`
- `NEXTAUTH_SECRET` 已设置
- `NEXTAUTH_URL` 为 `http://localhost:3000`

## 常见错误及解决方案

### 错误 1: "The column User.b1NotifyEnabled does not exist"

**原因**: 数据库 schema 和代码不同步

**解决方案**:
```bash
docker compose exec b1notice-dev \
  npx prisma db push --schema ./prisma/sqlite/schema.prisma --accept-data-loss
```

### 错误 2: "用户名或密码错误"但密码正确

**原因**: Prisma Client 未重新生成

**解决方案**:
```bash
# 重新生成 Prisma Client
docker compose exec b1notice-dev \
  npx prisma generate --schema ./prisma/sqlite/schema.prisma

# 重启容器
docker compose restart b1notice-dev
```

### 错误 3: 登录后立即退出

**原因**: JWT 或 Session 配置问题

**解决方案**:
1. 清除浏览器 Cookie
2. 检查 `.env.docker` 中的 `NEXTAUTH_SECRET`
3. 重启容器

### 错误 4: 容器无法启动

**排查步骤**:
```bash
# 1. 查看详细日志
docker compose logs b1notice-dev

# 2. 重新构建镜像
./dev-docker.sh build

# 3. 清理并重启
./dev-docker.sh clean
./dev-docker.sh start
```

## 重置开发环境

如果以上步骤都无法解决问题，可以重置整个开发环境：

```bash
# ⚠️ 警告：这将删除所有数据！

# 1. 停止并删除容器和卷
docker compose down -v

# 2. 重新启动
./dev-docker.sh start

# 3. 等待容器启动（约 10-20 秒）
sleep 20

# 4. 同步数据库
docker compose exec b1notice-dev \
  npx prisma db push --schema ./prisma/sqlite/schema.prisma --accept-data-loss

# 5. 创建默认用户
docker compose exec b1notice-dev \
  node scripts/create-default-user.js

# 6. 重启容器
docker compose restart b1notice-dev
```

## 预防措施

1. **定期备份数据库**
   ```bash
   docker compose exec b1notice-dev \
     sqlite3 ./prisma/sqlite/dev.db ".backup ./prisma/sqlite/backup.db"
   ```

2. **更新代码后重新生成 Prisma Client**
   ```bash
   docker compose exec b1notice-dev \
     npx prisma generate --schema ./prisma/sqlite/schema.prisma
   ```

3. **监控容器健康状态**
   ```bash
   watch -n 5 'docker compose ps'
   ```

## 获取帮助

如果问题仍未解决：

1. 查看完整日志：`./dev-docker.sh logs`
2. 查看文档：`cat DOCKER_START.txt`
3. 检查 GitHub Issues 或联系开发团队
