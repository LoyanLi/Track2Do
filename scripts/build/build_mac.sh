#!/bin/bash

# PT Stem Exporter - macOS 一键打包脚本
# 使用方法: ./scripts/build/build_mac.sh

set -e  # 遇到错误立即退出

echo "🚀 开始构建 PT Stem Exporter (macOS)"
echo "======================================"

# 检查 Node.js 和 npm
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm，请先安装 npm"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"
echo ""

# 检查 Python3
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 python3，请先安装 Python 3"
    exit 1
fi

echo "✅ Python 版本: $(python3 --version)"
echo ""

# 安装依赖
echo "📦 安装 Node.js 依赖..."
npm install

echo "📦 安装 Python 依赖..."
cd backend
python3 -m pip install -r requirements.txt
cd ..

echo ""
echo "🔨 开始构建应用..."

# 清理旧的构建文件
echo "🧹 清理旧的构建文件..."
rm -rf dist/
rm -rf release/

# 构建应用
echo "🔨 构建主进程和渲染进程..."
npm run build

echo "📱 打包 macOS 应用..."
npm run package:mac

echo ""
echo "🎉 构建完成！"
echo "======================================"
echo "📁 打包文件位置: ./release/"
echo "💿 DMG 文件: ./release/Track2Do-*.dmg"
echo "📱 应用程序: ./release/mac*/Track2Do.app"
echo ""
echo "✨ 您可以在 release 目录中找到打包好的应用程序"
echo "🚀 双击 DMG 文件即可安装应用"
echo ""
echo "🔐 代码签名选项:"
echo "   Ad-hoc 签名 (本地测试): ./scripts/signing/simple_self_sign.sh"
echo "   自签名证书 (内部分发): ./scripts/signing/self_sign.sh"
echo "   开发者快速签名: ./scripts/signing/quick_sign.sh"
echo "   完整签名和公证: ./scripts/signing/sign_and_notarize.sh"
echo "   详细指南: 查看 ./scripts/docs/SIGNING_GUIDE.md"
