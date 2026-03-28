ARG NODE_IMAGE=docker.m.daocloud.io/library/node:22-slim
ARG PNPM_VERSION=10.32.1
ARG NPM_REGISTRY=https://registry.npmmirror.com
ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple

FROM ${NODE_IMAGE} AS base

# 重新声明 ARG 变量，使其在当前阶段可用
ARG PNPM_VERSION
ARG NPM_REGISTRY
ARG PIP_INDEX_URL

ENV npm_config_registry=${NPM_REGISTRY} \
    npm_config_fetch_retries=5 \
    npm_config_fetch_retry_mintimeout=20000 \
    npm_config_fetch_retry_maxtimeout=120000 \
    npm_config_network_timeout=300000 \
    PIP_INDEX_URL=${PIP_INDEX_URL} \
    PIP_DEFAULT_TIMEOUT=120 \
    PIP_RETRIES=5 \
    NEXT_TELEMETRY_DISABLED=1 \
    PYTHONIOENCODING=utf-8

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    sqlite3 \
    postgresql-client \
    default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --break-system-packages \
    akshare \
    requests

RUN npm install -g pnpm@${PNPM_VERSION}

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml ./

RUN pnpm config set registry ${NPM_REGISTRY} \
    && pnpm config set fetch-retries 5 \
    && pnpm config set fetch-retry-mintimeout 20000 \
    && pnpm config set fetch-retry-maxtimeout 120000 \
    && pnpm config set network-timeout 300000 \
    && pnpm install --frozen-lockfile

FROM base AS builder

ENV NODE_ENV=production \
    DB_TYPE=pgsql

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm run db:generate \
    && pnpm exec next build --webpack

FROM base AS runner

ENV NODE_ENV=production \
    DB_TYPE=pgsql \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/scripts ./scripts
COPY docker/start-prod.sh /start-prod.sh

RUN chmod +x /start-prod.sh

EXPOSE 3000

CMD ["/start-prod.sh"]
