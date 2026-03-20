# Docker 开发环境配置完成

## ✅ 已创建的文件

### Docker 配置文件
- ✅ `.dockerignore` - Docker 构建忽略文件
- ✅ `Dockerfile.dev` - 开发环境 Dockerfile
- ✅ `docker-compose.yml` - Docker Compose 编排文件
- ✅ `.env.docker` - Docker 环境变量配置

### 脚本文件
- ✅ `scripts/docker-start.sh` - 交互式启动脚本
- ✅ `scripts/verify-docker-env.sh` - 环境验证脚本

### 文档文件
- ✅ `docs/docker-guide.md` - 完整使用指南
- ✅ `docs/docker-quick-reference.md` - 快速参考卡片
- ✅ `docs/docker-faq.md` - 常见问题解答

### 配置更新
- ✅ `package.json` - 添加 Docker 相关 npm 脚本
- ✅ `.gitignore` - 添加 Docker 忽略规则
- ✅ `README.md` - 更新开发环境说明

## 🚀 快速开始

### 方式一：使用启动脚本（推荐）

```bash
./scripts/docker-start.sh
```

### 方式二：使用 npm 命令

```bash
# 首次启动或需要重新构建
npm run docker:dev:build

# 后续启动
npm run docker:dev
```

## 📋 可用命令

```bash
# 启动开发环境
npm run docker:dev

# 重新构建并启动
npm run docker:dev:build

# 查看日志
npm run docker:dev:logs

# 停止环境
npm run docker:dev:stop

# 重启环境
npm run docker:dev:restart

# 进入容器 Shell
npm run docker:dev:shell

# 清理环境
npm run docker:dev:clean
```

## 🌐 访问地址

启动成功后访问：
- **应用**: http://localhost:3000
- **健康检查**: http://localhost:3000/api/health

## 🔑 登录凭据

**默认管理员账户**:
- **用户名**: `admin`
- **密码**: `admin123`

⚠️ **安全提示**: 这是开发环境的默认账户，请勿在生产环境使用！

## 🔧 环境特性

### 已安装的依赖
- ✅ Node.js 20 (Alpine)
- ✅ Python 3 + pip
- ✅ pnpm 包管理器
- ✅ AKShare Python 库
- ✅ SQLite 数据库
- ✅ Prisma ORM

### 代码热更新
以下目录支持热更新：
- `src/` - 源代码
- `public/` - 静态资源
- `prisma/` - 数据库 Schema
- `scripts/` - 脚本文件

### 数据持久化
- SQLite 数据库通过 Docker Volume 持久化
- node_modules 通过 Volume 缓存，加速启动

## 📚 文档导航

1. **快速参考**: [docs/docker-quick-reference.md](./docker-quick-reference.md)
2. **详细指南**: [docs/docker-guide.md](./docker-guide.md)
3. **常见问题**: [docs/docker-faq.md](./docker-faq.md)

## 🐛 故障排查

### 登录问题

如果无法登录，请运行以下命令：

```bash
# 1. 同步数据库
docker-compose -f docker-compose.dev.yml exec b1notice-dev \
  npx prisma db push --schema ./prisma/sqlite/schema.prisma

# 2. 创建默认用户
docker-compose -f docker-compose.dev.yml exec b1notice-dev \
  node scripts/create-default-user.js

# 3. 重启容器
docker-compose -f docker-compose.dev.yml restart b1notice-dev
```

详细排查指南：[docs/docker-login-troubleshooting.md](./docker-login-troubleshooting.md)

### 查看日志
```bash
npm run docker:dev:logs
```

### 进入容器调试
```bash
npm run docker:dev:shell
```

### 验证环境
```bash
# 在容器内运行
./scripts/verify-docker-env.sh
```

### 重新构建
```bash
npm run docker:dev:build
```

## ⚡ 性能优化

- 使用 Alpine Linux 基础镜像，减小体积
- 多阶段构建，优化镜像层
- Docker Volume 缓存 node_modules
- Python 虚拟环境隔离依赖

## 🔐 安全提示

- `.env.docker` 文件包含敏感信息，已添加到 `.gitignore`
- 生产环境请使用独立的 Dockerfile 和环境变量
- 定期更新基础镜像版本

## 📊 资源使用

预估资源占用：
- **镜像大小**: ~800MB（包含所有依赖）
- **内存**: 1-2GB（运行时）
- **CPU**: 1-2 核心（开发环境）

## 🎯 下一步

1. **启动环境**: `./scripts/docker-start.sh`
2. **查看日志**: `npm run docker:dev:logs`
3. **访问应用**: http://localhost:3000
4. **开始开发**: 修改 `src/` 目录下的文件

## 💡 提示

- 首次启动需要下载镜像和安装依赖，可能需要 5-10 分钟
- 后续启动会快很多，通常在 1 分钟内完成
- 如果遇到问题，查看 [FAQ](./docs/docker-faq.md) 或运行验证脚本

## 📝 更新日志

### 2026-03-18
- ✅ 创建完整的 Docker 开发环境配置
- ✅ 添加 AKShare Python 环境支持
- ✅ 配置代码热更新和数据持久化
- ✅ 创建交互式启动脚本和验证脚本
- ✅ 编写完整文档和 FAQ

---

**问题反馈**: 如遇到问题，请查看 [Docker FAQ](./docs/docker-faq.md) 或提交 Issue
