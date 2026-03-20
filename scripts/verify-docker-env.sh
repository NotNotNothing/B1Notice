#!/bin/bash

# Docker 环境验证脚本
# 在容器内运行此脚本以验证环境配置

set -e

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_command() {
    local name=$1
    local command=$2
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -n "测试 $name... "
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ 失败${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

test_file_exists() {
    local file=$1
    local description=$2
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -n "检查 $description... "
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ 存在${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ 不存在${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

test_directory_exists() {
    local dir=$1
    local description=$2
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -n "检查 $description... "
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓ 存在${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ 不存在${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# 显示横幅
echo -e "${YELLOW}"
echo "╔════════════════════════════════════════════╗"
echo "║     B1Notice Docker 环境验证脚本           ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# 系统环境测试
echo "=== 系统环境 ==="
test_command "Node.js" "node --version"
test_command "npm" "npm --version"
test_command "pnpm" "pnpm --version"
test_command "Python 3" "python3 --version"
test_command "pip3" "pip3 --version"
echo ""

# Python 包测试
echo "=== Python 依赖 ==="
test_command "akshare" "python3 -c 'import akshare'"
test_command "requests" "python3 -c 'import requests'"
echo ""

# Node.js 依赖测试
echo "=== Node.js 依赖 ==="
test_directory_exists "node_modules" "node_modules 目录"
test_command "Prisma CLI" "npx prisma --version"
test_command "Next.js CLI" "npx next --version"
echo ""

# 项目文件测试
echo "=== 项目文件 ==="
test_file_exists "package.json" "package.json"
test_file_exists ".env" "环境变量文件"
test_file_exists "next.config.ts" "Next.js 配置"
test_directory_exists "src" "源代码目录"
test_directory_exists "public" "静态资源目录"
test_directory_exists "prisma" "Prisma 目录"
test_directory_exists "scripts" "脚本目录"
echo ""

# 数据库测试
echo "=== 数据库配置 ==="
test_file_exists "prisma/sqlite/schema.prisma" "SQLite Schema"
test_command "Prisma Client" "node -e 'require(\"@prisma/client\")'"
echo ""

# 环境变量测试
echo "=== 环境变量 ==="
test_command "DATABASE_URL" "printenv DATABASE_URL"
test_command "NEXTAUTH_SECRET" "printenv NEXTAUTH_SECRET"
test_command "NEXTAUTH_URL" "printenv NEXTAUTH_URL"
echo ""

# AKShare 功能测试（可选）
echo "=== AKShare 功能测试 ==="
echo -n "测试 AKShare 连接... "
if python3 scripts/akshare_proxy.py check 2>/dev/null | grep -q '"available": true'; then
    echo -e "${GREEN}✓ 可用${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${YELLOW}⚠ 警告：AKShare 可能不可用（需要网络连接）${NC}"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# 网络端口测试
echo "=== 网络配置 ==="
echo -n "检查端口 3000... "
if netstat -tuln 2>/dev/null | grep -q ":3000" || ss -tuln 2>/dev/null | grep -q ":3000"; then
    echo -e "${GREEN}✓ 已监听${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${YELLOW}⚠ 端口未监听（服务可能未启动）${NC}"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# 显示测试总结
echo -e "${YELLOW}╔════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║              测试总结                       ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════╝${NC}"
echo ""
echo "总测试数: $TOTAL_TESTS"
echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！环境配置正确。${NC}"
    exit 0
else
    echo -e "${RED}✗ 部分测试失败，请检查上述错误信息。${NC}"
    exit 1
fi
