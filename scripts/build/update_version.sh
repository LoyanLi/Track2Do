#!/bin/bash

# Track2Do 版本号统一更新脚本
# 使用方法: ./scripts/build/update_version.sh <新版本号>
# 例如: ./scripts/build/update_version.sh 0.2.0

set -e  # 遇到错误立即退出

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 项目根目录（脚本在 scripts/build/ 下，所以需要向上两级）
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 切换到项目根目录
cd "$PROJECT_ROOT"
echo "工作目录: $(pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查参数
if [ $# -eq 0 ]; then
    echo -e "${RED}错误: 请提供新的版本号${NC}"
    echo -e "${YELLOW}使用方法: $0 <版本号>${NC}"
    echo -e "${YELLOW}例如: $0 0.2.0${NC}"
    exit 1
fi

NEW_VERSION="$1"

# 验证版本号格式 (简单的语义版本检查)
if ! [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}错误: 版本号格式不正确，请使用语义版本格式 (例如: 1.0.0)${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 开始更新 Track2Do 版本号到 ${NEW_VERSION}${NC}"
echo "======================================"

# 获取当前版本号
CURRENT_VERSION=$(grep '"version":' package.json | sed 's/.*"version": "\([^"]*\)".*/\1/')
echo -e "${YELLOW}当前版本: ${CURRENT_VERSION}${NC}"
echo -e "${YELLOW}新版本: ${NEW_VERSION}${NC}"
echo ""

# 确认更新
read -p "确认要更新版本号吗? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}取消更新${NC}"
    exit 0
fi

echo -e "${GREEN}开始更新文件...${NC}"
echo ""

# 1. 更新 package.json
echo -e "${BLUE}📦 更新 package.json${NC}"
if [ -f "package.json" ]; then
    # 使用 sed 更新版本号
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/g" package.json
    else
        # Linux
        sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/g" package.json
    fi
    echo -e "${GREEN}✅ package.json 更新完成${NC}"
else
    echo -e "${RED}❌ package.json 文件不存在${NC}"
fi

# 2. 更新 README.md 中的版本引用（如果有的话）
echo -e "${BLUE}📖 检查 README.md${NC}"
if [ -f "README.md" ]; then
    # 查找是否有版本号引用
    if grep -q "$CURRENT_VERSION" README.md; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/$CURRENT_VERSION/$NEW_VERSION/g" README.md
        else
            sed -i "s/$CURRENT_VERSION/$NEW_VERSION/g" README.md
        fi
        echo -e "${GREEN}✅ README.md 中的版本引用已更新${NC}"
    else
        echo -e "${YELLOW}ℹ️  README.md 中未发现版本号引用${NC}"
    fi
else
    echo -e "${YELLOW}ℹ️  README.md 文件不存在${NC}"
fi

# 3. 更新 scripts/build/build_mac.sh 中的版本引用（如果有的话）
echo -e "${BLUE}🔨 检查 scripts/build/build_mac.sh${NC}"
if [ -f "scripts/build/build_mac.sh" ]; then
    if grep -q "$CURRENT_VERSION" scripts/build/build_mac.sh; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/$CURRENT_VERSION/$NEW_VERSION/g" scripts/build/build_mac.sh
        else
            sed -i "s/$CURRENT_VERSION/$NEW_VERSION/g" scripts/build/build_mac.sh
        fi
        echo -e "${GREEN}✅ scripts/build/build_mac.sh 中的版本引用已更新${NC}"
    else
        echo -e "${YELLOW}ℹ️  scripts/build/build_mac.sh 中未发现版本号引用${NC}"
    fi
else
    echo -e "${YELLOW}ℹ️  scripts/build/build_mac.sh 文件不存在${NC}"
fi

# 4. 检查并更新后端相关文件中的版本引用
echo -e "${BLUE}🐍 检查后端文件${NC}"
BACKEND_FILES=("backend/main.py" "backend/start.py" "backend/core/config.py")

for file in "${BACKEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        if grep -q "$CURRENT_VERSION" "$file"; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/$CURRENT_VERSION/$NEW_VERSION/g" "$file"
            else
                sed -i "s/$CURRENT_VERSION/$NEW_VERSION/g" "$file"
            fi
            echo -e "${GREEN}✅ $file 中的版本引用已更新${NC}"
        else
            echo -e "${YELLOW}ℹ️  $file 中未发现版本号引用${NC}"
        fi
    else
        echo -e "${YELLOW}ℹ️  $file 文件不存在${NC}"
    fi
done

# 5. 更新 Electron 相关文件中的版本引用
echo -e "${BLUE}⚡ 检查 Electron 文件${NC}"
ELECTRON_FILES=("electron/main.ts" "electron/preload.ts")

for file in "${ELECTRON_FILES[@]}"; do
    if [ -f "$file" ]; then
        if grep -q "$CURRENT_VERSION" "$file"; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/$CURRENT_VERSION/$NEW_VERSION/g" "$file"
            else
                sed -i "s/$CURRENT_VERSION/$NEW_VERSION/g" "$file"
            fi
            echo -e "${GREEN}✅ $file 中的版本引用已更新${NC}"
        else
            echo -e "${YELLOW}ℹ️  $file 中未发现版本号引用${NC}"
        fi
    else
        echo -e "${YELLOW}ℹ️  $file 文件不存在${NC}"
    fi
done

# 6. 创建版本更新记录
echo -e "${BLUE}📝 创建版本更新记录${NC}"
VERSION_LOG="docs/release/version_history.txt"
echo "$(date '+%Y-%m-%d %H:%M:%S') - 版本更新: $CURRENT_VERSION -> $NEW_VERSION" >> "$VERSION_LOG"
echo -e "${GREEN}✅ 版本更新记录已添加到 $VERSION_LOG${NC}"

echo ""
echo -e "${GREEN}🎉 版本号更新完成！${NC}"
echo "======================================"
echo -e "${YELLOW}更新摘要:${NC}"
echo -e "${YELLOW}• 旧版本: ${CURRENT_VERSION}${NC}"
echo -e "${YELLOW}• 新版本: ${NEW_VERSION}${NC}"
echo -e "${YELLOW}• 更新时间: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""
echo -e "${BLUE}建议的后续操作:${NC}"
echo -e "${YELLOW}1. 检查更新结果: git diff${NC}"
echo -e "${YELLOW}2. 测试应用: npm run dev${NC}"
echo -e "${YELLOW}3. 构建应用: ./scripts/build/build_mac.sh${NC}"
echo -e "${YELLOW}4. 提交更改: git add . && git commit -m \"chore: bump version to $NEW_VERSION\"${NC}"
echo -e "${YELLOW}5. 创建标签: git tag v$NEW_VERSION${NC}"
echo ""
echo -e "${GREEN}✨ 版本更新脚本执行完毕！${NC}"
