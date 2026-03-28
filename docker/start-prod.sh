#!/bin/sh
set -e

echo "[start-prod] DB_TYPE=${DB_TYPE:-pgsql}"

# 尝试运行迁移
echo "[start-prod] running prisma migrate deploy..."
if ! ./node_modules/.bin/prisma migrate deploy --schema "./prisma/${DB_TYPE:-pgsql}/schema.prisma"; then
  echo "[start-prod] ⚠️  迁移失败，尝试解决..."

  # 尝试标记失败的迁移为已应用（适用于字段已存在的情况）
  echo "[start-prod] 尝试标记失败的迁移为已应用..."
  ./node_modules/.bin/prisma migrate resolve --applied "20260326090000_sync_user_settings_fields" \
    --schema "./prisma/${DB_TYPE:-pgsql}/schema.prisma" 2>/dev/null || true

  # 重新尝试迁移
  echo "[start-prod] 重新运行迁移..."
  ./node_modules/.bin/prisma migrate deploy --schema "./prisma/${DB_TYPE:-pgsql}/schema.prisma"
fi

echo "[start-prod] ✓ 迁移完成"
echo "[start-prod] starting Next.js standalone server..."
exec node server.js
