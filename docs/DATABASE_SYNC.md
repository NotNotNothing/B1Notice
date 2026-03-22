# 数据库同步管理指南

## 📋 概述

本项目支持开发和生产环境使用不同数据库类型，通过统一的 Schema 文件和自动化脚本来保持数据结构同步。

- **开发环境**: SQLite (`prisma/sqlite/`)
- **生产环境**: PostgreSQL (`prisma/pgsql/`)

## 🛠️ 使用方法

### 1. 快速开始

```bash
# 验证 Schema 一致性
npm run db:validate

# 查看所有可用命令
npm run db:sync help
```

### 2. 日常开发流程

#### 场景 1: 修改数据库 Schema

```bash
# 1. 修改 Schema 文件
# 编辑 prisma/sqlite/schema.prisma 和 prisma/pgsql/schema.prisma
# 确保两个文件的 model 定义保持一致

# 2. 验证一致性
npm run db:validate

# 3. SQLite 开发环境显式同步 Schema
npm run db:push development

# 4. 测试本地功能
npm run dev

# 5. 为生产环境生成迁移（如果需要）
npm run db:migrate:create production add_new_field

# 6. 部署到生产环境
git push origin main
```

#### 场景 2: 快速原型开发（无迁移文件）

```bash
# 修改 Schema 文件后直接推送
npm run db:push development  # 开发环境
npm run db:push production   # 生产环境（谨慎使用）
```

#### 场景 3: 同步生产环境结构到开发环境

```bash
# 确保两个环境的 Schema 文件一致后
npm run db:sync:prod-to-dev
```

### 3. 详细命令说明

#### 验证命令
```bash
npm run db:validate
# 检查开发和生产环境的 Schema 模型定义是否一致
```

#### 迁移管理
```bash
# 生成迁移文件
npm run db:migrate:create <env> <migration_name>
# 示例: npm run db:migrate:create production add_user_preferences

# 应用迁移
npm run db:migrate:deploy <env>
# 示例: npm run db:migrate:deploy development
```

#### Schema 推送
```bash
# 直接推送 Schema（无迁移文件）
npm run db:push <env>
# 示例: npm run db:push development
```

#### 状态检查
```bash
# 检查迁移状态
npm run db:status <env>
# 示例: npm run db:status production
```

#### 开发环境重置
```bash
# 重置开发环境数据库（仅限开发环境）
npm run db:reset development
```

## 🔧 工作原理

### 1. Schema 管理

- **两个 Schema 文件**:
  - `prisma/sqlite/schema.prisma` - SQLite 环境
  - `prisma/pgsql/schema.prisma` - PostgreSQL 环境

- **一致性保证**: 通过脚本验证两个文件的 model 定义是否一致

- **环境切换**: 通过 `DB_TYPE` 环境变量自动选择对应的 Schema

### 2. 自动化同步

构建与数据库同步的职责边界：

- `npm run build:sqlite`：仅生成 Prisma Client 并执行 Next.js 构建，不会对本地 SQLite 数据库执行迁移。
- `npm run build`：面向 PostgreSQL 生产链路，包含 `prisma migrate deploy`。
- `npm run db:push development`：用于 SQLite 开发环境显式同步 Schema。
- `npm run db:migrate:deploy production`：用于 PostgreSQL 生产环境应用迁移。

SQLite 开发数据库文件统一使用 `prisma/sqlite/dev.db`，避免命令误连到根目录 `dev.db`。

构建流程中的数据库同步阶段：

```toml
[phases.db-sync]
dependsOn = ["install"]
cmds = [
  "echo '🔍 验证数据库 Schema 一致性...'",
  "node scripts/db-sync.js validate",
  "echo '✅ Schema 验证完成，生成 Prisma Client...'"
]
```

### 3. 迁移文件分离

- **开发环境**: `prisma/sqlite/migrations/`
- **生产环境**: `prisma/pgsql/migrations/`

每个环境都有独立的迁移历史，互不干扰。

## 📝 最佳实践

### 1. Schema 修改流程

1. **先修改开发环境 Schema**
2. **测试功能正常**
3. **同步到生产环境 Schema**
4. **验证一致性**
5. **生成相应的迁移文件**
6. **按序部署**

### 2. 部署流程

```bash
# 1. 开发完成，准备部署
npm run db:validate

# 2. 生成生产迁移（如果需要）
npm run db:migrate:create production schema_update

# 3. 提交代码
git add .
git commit -m "feat: 更新数据库结构"
git push origin main

# 4. Dokploy 自动部署（包含数据库验证）
```

### 3. 故障排除

#### Schema 不一致
```bash
# 比较两个 Schema 文件
diff prisma/sqlite/schema.prisma prisma/pgsql/schema.prisma

# 手动同步不一致的部分
```

#### 生产环境部署失败
```bash
# 检查迁移状态
npm run db:status production

# 如果需要，手动应用迁移
DATABASE_URL="你的生产数据库URL" npx prisma migrate deploy --schema ./prisma/pgsql/schema.prisma
```

#### 开发环境数据丢失
```bash
# 如果有备份文件
cp prisma/sqlite/dev.db.backup prisma/sqlite/dev.db

# 或者重新初始化
npm run db:reset development
```

## ⚠️ 注意事项

1. **生产环境保护**: 禁止在生产环境执行重置操作
2. **迁移命名**: 使用描述性的迁移名称，便于追踪
3. **备份习惯**: 重置开发环境前自动备份现有数据
4. **Schema 一致性**: 始终保持两个环境的 Schema 文件同步
5. **测试验证**: 生产环境部署前充分测试开发环境

## 🚀 高级用法

### 1. 自定义同步脚本

可以扩展 `scripts/db-sync.js` 添加自定义功能：

```javascript
// 例如：数据迁移
function migrateData() {
  // 自定义数据迁移逻辑
}
```

### 2. CI/CD 集成

在 CI/CD 流程中添加数据库验证：

```yaml
# GitHub Actions 示例
- name: Validate Database Schema
  run: |
    npm run db:validate
    npm run db:status production
```

### 3. 环境特定配置

可以为不同环境添加特定的数据库配置：

```javascript
// scripts/db-sync.js 中的配置扩展
const ENVIRONMENTS = {
  staging: {
    // 预发布环境配置
  }
};
```