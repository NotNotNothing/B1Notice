#!/usr/bin/env node

/**
 * 数据库同步管理脚本
 * 用于管理开发和生产环境的数据库同步
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const DATABASES = {
  development: {
    type: 'sqlite',
    schemaPath: './prisma/sqlite/schema.prisma',
    migrationsPath: './prisma/sqlite/migrations',
    env: '.env',
    url: 'file:./dev.db'
  },
  production: {
    type: 'pgsql',
    schemaPath: './prisma/pgsql/schema.prisma',
    migrationsPath: './prisma/pgsql/migrations',
    env: '.env.production',
    url: process.env.PROD_DATABASE_URL || 'postgresql://postgres:gvjoaaoeewxevhjx@10.0.0.7:5431/postgres'
  }
};

/**
 * 执行命令并输出结果
 */
function execCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  console.log(`📝 执行命令: ${command}`);

  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log(`✅ ${description}完成`);
    return result;
  } catch (error) {
    console.error(`❌ ${description}失败:`, error.message);
    throw error;
  }
}

/**
 * 验证 Schema 一致性
 */
function validateSchemaConsistency() {
  console.log('\n🔍 验证 Schema 一致性...');

  const devSchema = fs.readFileSync(DATABASES.development.schemaPath, 'utf8');
  const prodSchema = fs.readFileSync(DATABASES.production.schemaPath, 'utf8');

  // 提取模型定义进行比较（排除 datasource 部分）
  const extractModels = (schema) => {
    const modelsMatch = schema.match(/model\s+\w+\s*{[^}]+}/gs);
    return modelsMatch ? modelsMatch.sort().join('\n') : '';
  };

  const devModels = extractModels(devSchema);
  const prodModels = extractModels(prodSchema);

  if (devModels === prodModels) {
    console.log('✅ Schema 模型定义一致');
    return true;
  } else {
    console.log('❌ Schema 模型定义不一致');
    console.log('\n🔍 开发环境模型:');
    console.log(devModels);
    console.log('\n🔍 生产环境模型:');
    console.log(prodModels);
    return false;
  }
}

/**
 * 生成迁移文件
 */
function generateMigration(env, migrationName) {
  const db = DATABASES[env];
  const envFile = env === 'production' ? '.env.production' : '.env';

  const command = env === 'production'
    ? `DATABASE_URL="${db.url}" npx prisma migrate dev --create-only --name ${migrationName} --schema ${db.schemaPath}`
    : `DB_TYPE=sqlite npx prisma migrate dev --create-only --name ${migrationName} --schema ${db.schemaPath}`;

  execCommand(command, `为${env}环境生成迁移文件 ${migrationName}`);
}

/**
 * 应用迁移
 */
function applyMigration(env) {
  const db = DATABASES[env];

  const command = env === 'production'
    ? `DATABASE_URL="${db.url}" npx prisma migrate deploy --schema ${db.schemaPath}`
    : `DB_TYPE=sqlite npx prisma migrate deploy --schema ${db.schemaPath}`;

  execCommand(command, `应用${env}环境迁移`);
}

/**
 * 推送 Schema 变更（无迁移文件）
 */
function pushSchema(env) {
  const db = DATABASES[env];

  const command = env === 'production'
    ? `DATABASE_URL="${db.url}" npx prisma db push --schema ${db.schemaPath}`
    : `DB_TYPE=sqlite npx prisma db push --schema ${db.schemaPath}`;

  execCommand(command, `推送${env}环境 Schema`);
}

/**
 * 重置数据库
 */
function resetDatabase(env) {
  const db = DATABASES[env];

  console.log(`⚠️  警告: 即将重置${env}环境数据库，所有数据将被删除`);

  if (env === 'production') {
    console.log('❌ 禁止在生产环境执行重置操作');
    return;
  }

  const command = `DB_TYPE=sqlite npx prisma migrate reset --force --schema ${db.schemaPath}`;
  execCommand(command, `重置${env}环境数据库`);
}

/**
 * 检查迁移状态
 */
function checkMigrationStatus(env) {
  const db = DATABASES[env];

  const command = env === 'production'
    ? `DATABASE_URL="${db.url}" npx prisma migrate status --schema ${db.schemaPath}`
    : `DB_TYPE=sqlite npx prisma migrate status --schema ${db.schemaPath}`;

  execCommand(command, `检查${env}环境迁移状态`);
}

/**
 * 同步生产环境数据结构到开发环境
 */
function syncProdToDev() {
  console.log('\n🔄 同步生产环境数据结构到开发环境...');

  // 1. 验证 Schema 一致性
  if (!validateSchemaConsistency()) {
    console.log('❌ Schema 不一致，请先同步 Schema 文件');
    return;
  }

  // 2. 备份开发环境
  if (fs.existsSync('./dev.db.backup')) {
    fs.unlinkSync('./dev.db.backup');
  }
  if (fs.existsSync('./dev.db')) {
    fs.copyFileSync('./dev.db', './dev.db.backup');
    console.log('✅ 开发环境数据库已备份');
  }

  // 3. 应用生产环境的最新迁移到开发环境
  applyMigration('development');

  console.log('✅ 生产环境数据结构已同步到开发环境');
}

/**
 * 主函数
 */
function main() {
  const command = process.argv[2];
  const env = process.argv[3];
  const migrationName = process.argv[4];

  console.log('🗄️  数据库同步管理工具');
  console.log('=' .repeat(50));

  try {
    switch (command) {
      case 'validate':
        validateSchemaConsistency();
        break;

      case 'migrate':
        if (!env || !['development', 'production'].includes(env)) {
          console.log('❌ 请指定环境: development 或 production');
          process.exit(1);
        }
        if (!migrationName) {
          console.log('❌ 请提供迁移名称');
          process.exit(1);
        }
        generateMigration(env, migrationName);
        break;

      case 'deploy':
        if (!env || !['development', 'production'].includes(env)) {
          console.log('❌ 请指定环境: development 或 production');
          process.exit(1);
        }
        applyMigration(env);
        break;

      case 'push':
        if (!env || !['development', 'production'].includes(env)) {
          console.log('❌ 请指定环境: development 或 production');
          process.exit(1);
        }
        pushSchema(env);
        break;

      case 'reset':
        if (!env || !['development', 'production'].includes(env)) {
          console.log('❌ 请指定环境: development 或 production');
          process.exit(1);
        }
        resetDatabase(env);
        break;

      case 'status':
        if (!env || !['development', 'production'].includes(env)) {
          console.log('❌ 请指定环境: development 或 production');
          process.exit(1);
        }
        checkMigrationStatus(env);
        break;

      case 'sync-prod-to-dev':
        syncProdToDev();
        break;

      case 'help':
      case '--help':
      case '-h':
        console.log(`
用法: node scripts/db-sync.js <命令> [环境] [迁移名称]

命令:
  validate                    验证开发和生产环境 Schema 一致性
  migrate <env> <name>       为指定环境生成迁移文件
  deploy <env>               应用迁移到指定环境
  push <env>                 推送 Schema 到指定环境（无迁移文件）
  reset <env>                重置指定环境数据库
  status <env>               检查指定环境迁移状态
  sync-prod-to-dev           同步生产环境数据结构到开发环境
  help                       显示帮助信息

环境:
  development                开发环境 (SQLite)
  production                 生产环境 (PostgreSQL)

示例:
  node scripts/db-sync.js validate
  node scripts/db-sync.js migrate production add_user_preferences
  node scripts/db-sync.js deploy development
  node scripts/db-sync.js push production
  node scripts/db-sync.js sync-prod-to-dev
        `);
        break;

      default:
        console.log(`❌ 未知命令: ${command}`);
        console.log('使用 "help" 查看可用命令');
        process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 操作失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateSchemaConsistency,
  generateMigration,
  applyMigration,
  pushSchema,
  resetDatabase,
  checkMigrationStatus,
  syncProdToDev
};