# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

ARG DB_TYPE=pgsql
ENV DB_TYPE=$DB_TYPE

# 复制 package.json 和 package-lock.json
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建应用
RUN npm run build

# 生产阶段
FROM node:20-alpine AS runner

WORKDIR /app

ARG DB_TYPE=pgsql
ENV DB_TYPE=$DB_TYPE
ENV NODE_ENV=production

# 复制必要的文件
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# 暴露端口
EXPOSE 3100

# 设置环境变量
ENV PORT 3100
ENV HOSTNAME "0.0.0.0"
ENV DATABASE_URL ${DATABASE_URL}
ENV REDIS_PATH ${REDIS_PATH}
ENV LONGPORT_APP_KEY ${LONGPORT_APP_KEY}
ENV LONGPORT_APP_SECRET ${LONGPORT_APP_SECRET}
ENV LONGPORT_ACCESS_TOKEN ${LONGPORT_ACCESS_TOKEN}

# 启动应用
CMD ["node", "server.js"]
