#!/bin/bash

# ==============================================
# 会议白板助手 - 一键启动脚本 (macOS 双击版)
# ==============================================
# 使用方法：
#   方法一：直接双击此文件（推荐）
#   方法二：终端执行
#     1. 打开终端
#     2. 运行：./会议白板助手.command
#
# 依赖：Python 3（macOS 系统自带或通过 Xcode 安装）
# ==============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
CODE_DIR="$PROJECT_DIR/code"
DEFAULT_PORT=8080
PORT=$DEFAULT_PORT

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

find_available_port() {
    local port=$DEFAULT_PORT
    while check_port $port; do
        port=$((port + 1))
        if [ $port -gt 65535 ]; then
            echo "错误：无法找到可用端口"
            read -p "按 Enter 键退出"
            exit 1
        fi
    done
    echo $port
}

clear
echo "╔══════════════════════════════════════════════════╗"
echo "║              会议白板助手 - 一键启动脚本            ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

echo "正在进入项目目录..."
cd "$PROJECT_DIR" || { echo "错误：无法进入项目目录"; read -p "按 Enter 键退出"; exit 1; }

if [ ! -d "$CODE_DIR" ]; then
    echo "错误：代码目录不存在: $CODE_DIR"
    read -p "按 Enter 键退出"
    exit 1
fi

echo "正在检测端口..."
PORT=$(find_available_port)

if [ "$PORT" -ne "$DEFAULT_PORT" ]; then
    echo "注意：默认端口 $DEFAULT_PORT 已被占用，将使用端口 $PORT"
else
    echo "端口 $PORT 可用"
fi

if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo ""
    echo "错误：未找到 Python"
    echo "请先安装 Python 3，或运行以下命令安装："
    echo "  xcode-select --install"
    read -p "按 Enter 键退出"
    exit 1
fi

cd "$CODE_DIR" || { echo "错误：无法进入代码目录"; read -p "按 Enter 键退出"; exit 1; }

echo ""
echo "正在启动前端服务..."
echo "服务地址：http://localhost:$PORT"
echo ""

$PYTHON_CMD -m http.server $PORT &
SERVER_PID=$!

echo "正在等待服务启动..."
sleep 2

if ! check_port $PORT; then
    echo "错误：服务启动失败"
    kill $SERVER_PID 2>/dev/null
    read -p "按 Enter 键退出"
    exit 1
fi

echo "服务启动成功！正在打开浏览器..."

if command -v open &> /dev/null; then
    open "http://localhost:$PORT"
else
    echo "提示：请手动打开浏览器访问 http://localhost:$PORT"
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║          服务已启动，按 Ctrl+C 停止服务             ║"
echo "╚══════════════════════════════════════════════════╝"

wait $SERVER_PID