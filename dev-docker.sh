#!/bin/bash

# Docker 开发环境启动脚本
# 用法: ./dev-docker.sh [命令]
# 命令: start | stop | restart | logs | build | clean

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

compose() {
    docker compose "$@"
}

# 检查 Docker 是否运行
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker 未运行，请先启动 Docker"
        exit 1
    fi

    if ! docker compose version > /dev/null 2>&1; then
        print_error "Docker Compose V2 不可用，请先确认 'docker compose version' 可执行"
        exit 1
    fi
}

# 检查必要文件
check_files() {
    if [ ! -f .env.docker ]; then
        print_warning "未找到 .env.docker 文件"
        exit 1
    fi
    print_success "环境配置文件检查通过"
}

# 启动开发环境
start_dev() {
    print_info "启动 B1Notice 开发环境..."

    check_files

    # 停止旧容器
    print_info "清理旧容器..."
    compose down 2>/dev/null || true

    # 构建镜像（如果需要）
    print_info "检查并构建 Docker 镜像..."
    compose build

    # 启动容器
    print_info "启动开发容器..."
    compose up -d

    # 等待服务启动
    print_info "等待服务启动..."
    sleep 5

    # 检查容器状态
    if compose ps | grep -q "Up"; then
        print_success "开发环境已成功启动"
        print_info "访问地址: http://localhost:3000"
        print_info "查看日志: ./dev-docker.sh logs"
        print_info "停止服务: ./dev-docker.sh stop"
    else
        print_error "容器启动失败，请查看日志"
        compose logs
        exit 1
    fi
}

# 停止开发环境
stop_dev() {
    print_info "停止 B1Notice 开发环境..."
    compose down
    print_success "开发环境已停止"
}

# 重启开发环境
restart_dev() {
    stop_dev
    sleep 2
    start_dev
}

# 查看日志
view_logs() {
    print_info "显示日志（按 Ctrl+C 退出）..."
    compose logs -f
}

# 重新构建
build_dev() {
    print_info "重新构建 Docker 镜像..."
    compose build --no-cache
    print_success "构建完成"
}

# 清理容器和卷
clean_all() {
    print_warning "这将删除所有容器、卷和镜像，不会删除本地 prisma/sqlite/dev.db！"
    read -p "确定要继续吗？(y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "清理所有 Docker 资源..."
        compose down -v --rmi local
        print_success "清理完成"
    else
        print_info "已取消清理"
    fi
}

# 显示帮助
show_help() {
    echo "B1Notice Docker 开发环境管理脚本"
    echo ""
    echo "用法: ./dev-docker.sh [命令]"
    echo ""
    echo "命令:"
    echo "  start    - 启动开发环境（默认）"
    echo "  stop     - 停止开发环境"
    echo "  restart  - 重启开发环境"
    echo "  logs     - 查看日志"
    echo "  build    - 重新构建镜像"
    echo "  clean    - 清理容器、网络和数据卷（不删除本地 SQLite）"
    echo "  help     - 显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  ./dev-docker.sh start"
    echo "  ./dev-docker.sh logs"
}

# 主函数
main() {
    check_docker

    case "${1:-start}" in
        start)
            start_dev
            ;;
        stop)
            stop_dev
            ;;
        restart)
            restart_dev
            ;;
        logs)
            view_logs
            ;;
        build)
            build_dev
            ;;
        clean)
            clean_all
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
