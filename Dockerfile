ARG NODE_IMAGE=docker.m.daocloud.io/library/node:22-slim
ARG PNPM_VERSION=10.32.1
ARG NPM_REGISTRY=https://registry.npmmirror.com
ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple

# ========================================
# 阶段 1: 基础镜像（仅运行时依赖）
# ========================================
FROM ${NODE_IMAGE} AS base

ARG PNPM_VERSION
ARG NPM_REGISTRY
ARG PIP_INDEX_URL

# 替换为阿里云镜像源
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
    (echo "deb http://mirrors.aliyun.com/debian/ bookworm main" > /etc/apt/sources.list && \
     echo "deb http://mirrors.aliyun.com/debian/ bookworm-updates main" >> /etc/apt/sources.list)

ENV npm_config_registry=${NPM_REGISTRY} \
    PIP_INDEX_URL=${PIP_INDEX_URL} \
    PIP_DEFAULT_TIMEOUT=120 \
    NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    postgresql-client \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --break-system-packages akshare requests \
    && npm install -g pnpm@${PNPM_VERSION}

WORKDIR /app

# ========================================
# 阶段 2: 编译环境（额外安装 build-essential）
# ========================================
FROM base AS build-env

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# ========================================
# 阶段 3: 安装 Node 依赖
# ========================================
FROM build-env AS deps

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# ========================================
# 阶段 4: 构建
# ========================================
FROM build-env AS builder

ENV NODE_ENV=production \
    DB_TYPE=pgsql

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm run db:generate \
    && pnpm exec next build --webpack

# ========================================
# 阶段 5: 运行（精简，不含编译工具）
# ========================================
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
