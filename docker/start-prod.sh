#!/bin/sh
set -eu

echo "[start-prod] DB_TYPE=${DB_TYPE:-pgsql}"
echo "[start-prod] running prisma migrate deploy..."
./node_modules/.bin/prisma migrate deploy --schema "./prisma/${DB_TYPE:-pgsql}/schema.prisma"

echo "[start-prod] starting Next.js standalone server..."
exec node server.js
