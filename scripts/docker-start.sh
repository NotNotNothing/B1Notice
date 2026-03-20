#!/bin/bash

# B1Notice Docker 开发环境快速启动脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓ ${NC}$1"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${NC}$1"
}

print_error() {
    echo -e "${RED}✗ ${NC}$1"
}

# 显示横幅
show_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════╗"
    echo "║     B1Notice Docker 开发环境启动脚本       ║"
    echo "╚════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        echo "安装指南: https://docs.docker.com/get-docker/"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装"
        echo "安装指南: https://docs.docker.com/compose/install/"
        exit 1
    fi

    print_success "Docker 环境检查通过"
}

# 检查 Docker 服务是否运行
check_docker_running() {
    if ! docker info &> /dev/null; then
        print_error "Docker 服务未运行，请启动 Docker"
        exit 1
    fi
    print_success "Docker 服务运行正常"
}

# 检查环境文件
check_env_file() {
    if [ ! -f ".env.docker" ]; then
        print_warning ".env.docker 文件不存在，正在创建..."
        if [ -f ".env" ]; then
            cp .env .env.docker
            print_success "已从 .env 复制到 .env.docker"
        else
            print_error "请先创建 .env.docker 文件"
            exit 1
        fi
    else
        print_success "环境文件检查通过"
    fi
}

# 构建镜像
build_image() {
    print_info "正在构建 Docker 镜像..."
    if docker-compose build --no-cache; then
        print_success "镜像构建成功"
    else
        print_error "镜像构建失败"
        exit 1
    fi
}

# 启动容器
start_containers() {
    print_info "正在启动容器..."
    if docker-compose up -d; then
        print_success "容器启动成功"
    else
        print_error "容器启动失败"
        exit 1
    fi
}

# 等待服务就绪
wait_for_service() {
    print_info "等待服务启动..."
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:3000 &> /dev/null; then
            print_success "服务已就绪"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done

    echo ""
    print_warning "服务启动时间较长，请稍后手动检查"
    print_info "运行 'npm run docker:dev:logs' 查看日志"
}

# 显示状态
show_status() {
    echo ""
    print_info "容器状态:"
    docker-compose ps
    echo ""

    print_success "🎉 开发环境已启动！"
    echo ""
    echo -e "${GREEN}访问地址:${NC} http://localhost:3000"
    echo ""
    echo -e "${YELLOW}常用命令:${NC}"
    echo "  查看日志:   npm run docker:dev:logs"
    echo "  停止环境:   npm run docker:dev:stop"
    echo "  进入容器:   npm run docker:dev:shell"
    echo "  重启服务:   npm run docker:dev:restart"
    echo ""
}

# 主函数
main() {
    show_banner

    # 检查环境
    check_docker
    check_docker_running
    check_env_file

    # 询问是否重新构建
    read -p "$(echo -e ${YELLOW}是否重新构建镜像？[y/N]: ${NC})" rebuild
    if [[ $rebuild =~ ^[Yy]$ ]]; then
        build_image
    fi

    # 启动容器
    start_containers

    # 等待服务就绪
    wait_for_service

    # 显示状态
    show_status
}

# 运行主函数
main
