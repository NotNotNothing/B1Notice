#!/bin/sh
set -e

SCHEMA="./prisma/${DB_TYPE:-pgsql}/schema.prisma"

echo "[start-prod] DB_TYPE=${DB_TYPE:-pgsql}"

# 如果设置了 RESET_DB=true，则重置数据库
if [ "${RESET_DB:-false}" = "true" ]; then
  echo "[start-prod] ⚠️  RESET_DB=true，正在重置数据库..."
  ./node_modules/.bin/prisma db execute --schema "$SCHEMA" --stdin <<'SQL'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
SQL
  echo "[start-prod] ✓ 数据库已重置"
fi

# 尝试运行迁移
echo "[start-prod] running prisma migrate deploy..."
if ! ./node_modules/.bin/prisma migrate deploy --schema "$SCHEMA"; then
  echo "[start-prod] ⚠️  迁移失败，尝试解决..."

  # 尝试标记失败的迁移为已应用（适用于字段已存在的情况）
  echo "[start-prod] 尝试标记失败的迁移为已应用..."
  ./node_modules/.bin/prisma migrate resolve --applied "20260326090000_sync_user_settings_fields" \
    --schema "$SCHEMA" 2>/dev/null || true

  # 重新尝试迁移
  echo "[start-prod] 重新运行迁移..."
  ./node_modules/.bin/prisma migrate deploy --schema "$SCHEMA"
fi

echo "[start-prod] ✓ 迁移完成"
echo "[start-prod] starting Next.js standalone server..."
exec node server.js
