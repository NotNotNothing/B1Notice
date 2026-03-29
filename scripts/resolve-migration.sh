#!/bin/bash
# 解决 Prisma 迁移失败问题

set -e

echo "=== 解决失败的 Prisma 迁移 ==="
echo ""
echo "失败的迁移: 20260326090000_sync_user_settings_fields"
echo ""
echo "方案选择:"
echo "1) 标记为已应用（如果字段已存在）"
echo "2) 回滚迁移（如果迁移部分应用）"
echo ""
read -p "选择方案 (1/2): " choice

case $choice in
  1)
    echo "标记迁移为已应用..."
    npx prisma migrate resolve --applied "20260326090000_sync_user_settings_fields" --schema=./prisma/pgsql/schema.prisma
    echo "✓ 迁移已标记为已应用"
    ;;
  2)
    echo "回滚迁移..."
    npx prisma migrate resolve --rolled-back "20260326090000_sync_user_settings_fields" --schema=./prisma/pgsql/schema.prisma
    echo "✓ 迁移已标记为已回滚"
    ;;
  *)
    echo "无效选择"
    exit 1
    ;;
esac

echo ""
echo "现在可以重新运行迁移:"
echo "  npx prisma migrate deploy --schema=./prisma/pgsql/schema.prisma"
