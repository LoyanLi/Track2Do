#!/bin/bash

# Track2Do - 图标转换脚本
# 将PNG格式的logo自动转换为Electron应用所需的各种图标格式
# 使用方法: ./scripts/build/convert_icon.sh [PNG文件路径]

set -e  # 遇到错误立即退出

# 默认输入文件
INPUT_PNG="${1:-assets/icons/source/T2D.png}"
OUTPUT_DIR="assets/icons"
ICONSET_DIR="$OUTPUT_DIR/icon.iconset"

echo "🎨 Track2Do 图标转换工具"
echo "====================================="
echo "📁 输入文件: $INPUT_PNG"
echo "📁 输出目录: $OUTPUT_DIR"
echo ""

# 检查输入文件是否存在
if [ ! -f "$INPUT_PNG" ]; then
    echo "❌ 错误: 找不到输入文件 '$INPUT_PNG'"
    echo "💡 使用方法: ./scripts/build/convert_icon.sh [PNG文件路径]"
    echo "💡 示例: ./scripts/build/convert_icon.sh assets/icons/source/T2D.png"
    exit 1
fi

# 检查是否安装了 sips (macOS 自带)
if ! command -v sips &> /dev/null; then
    echo "❌ 错误: 未找到 sips (macOS 工具)"
    echo "💡 此脚本需要在 macOS 系统上运行"
    exit 1
fi

# 检查是否安装了 iconutil (macOS 自带)
if ! command -v iconutil &> /dev/null; then
    echo "❌ 错误: 未找到 iconutil (macOS 工具)"
    echo "💡 此脚本需要在 macOS 系统上运行"
    exit 1
fi

echo "✅ sips 可用 (macOS 图像处理工具)"
echo "✅ iconutil 可用"
echo ""

# 创建输出目录
echo "📁 创建输出目录..."
mkdir -p "$OUTPUT_DIR"
mkdir -p "$ICONSET_DIR"

# 复制原始PNG文件
echo "📋 复制原始PNG文件..."
cp "$INPUT_PNG" "$OUTPUT_DIR/icon.png"

# 生成各种尺寸的PNG图标 (用于iconset)
echo "🔄 生成各种尺寸的PNG图标..."

# iconset 需要的尺寸
declare -a sizes=("16" "32" "128" "256" "512")
declare -a retina_sizes=("32" "64" "256" "512" "1024")

for i in "${!sizes[@]}"; do
    size=${sizes[$i]}
    retina_size=${retina_sizes[$i]}
    
    echo "  📐 生成 ${size}x${size} 图标..."
    sips -z "$size" "$size" "$INPUT_PNG" --out "$ICONSET_DIR/icon_${size}x${size}.png" > /dev/null
    
    echo "  📐 生成 ${size}x${size}@2x 图标..."
    sips -z "$retina_size" "$retina_size" "$INPUT_PNG" --out "$ICONSET_DIR/icon_${size}x${size}@2x.png" > /dev/null
done

echo ""
echo "🍎 生成 macOS .icns 文件..."
iconutil -c icns "$ICONSET_DIR" -o "$OUTPUT_DIR/icon.icns"

echo "🪟 生成 Windows .ico 文件..."
# 创建临时目录用于ico转换
TEMP_ICO_DIR="/tmp/ico_temp_$$"
mkdir -p "$TEMP_ICO_DIR"

# 生成不同尺寸的PNG文件用于ico转换
declare -a ico_sizes=("16" "32" "48" "64" "128" "256")
for size in "${ico_sizes[@]}"; do
    sips -z "$size" "$size" "$INPUT_PNG" --out "$TEMP_ICO_DIR/icon_${size}.png" > /dev/null
done

# 使用Python脚本生成ico文件 (如果可用)
if command -v python3 &> /dev/null; then
    python3 -c "
import os
try:
    from PIL import Image
    images = []
    temp_dir = '$TEMP_ICO_DIR'
    sizes = [16, 32, 48, 64, 128, 256]
    for size in sizes:
        img_path = os.path.join(temp_dir, f'icon_{size}.png')
        if os.path.exists(img_path):
            img = Image.open(img_path)
            images.append(img)
    if images:
        images[0].save('$OUTPUT_DIR/icon.ico', format='ICO', sizes=[(img.width, img.height) for img in images])
        print('✅ 使用 PIL 生成 ico 文件')
    else:
        print('❌ 未找到临时PNG文件')
except ImportError:
    # 如果没有PIL，复制一个PNG文件作为备用
    import shutil
    shutil.copy('$INPUT_PNG', '$OUTPUT_DIR/icon.ico')
    print('⚠️  PIL 不可用，复制PNG文件作为ico (建议安装: pip3 install Pillow)')
except Exception as e:
    print(f'❌ 生成ico文件失败: {e}')
    import shutil
    shutil.copy('$INPUT_PNG', '$OUTPUT_DIR/icon.ico')
" 2>/dev/null || {
     echo "⚠️  Python不可用，跳过ico文件生成"
     cp "$INPUT_PNG" "$OUTPUT_DIR/icon.ico"
 }
 else
     echo "⚠️  Python不可用，跳过ico文件生成"
     cp "$INPUT_PNG" "$OUTPUT_DIR/icon.ico"
 fi

# 清理临时文件
rm -rf "$TEMP_ICO_DIR"

echo ""
echo "🎉 图标转换完成！"
echo "====================================="
echo "📁 生成的文件:"
echo "   🖼️  $OUTPUT_DIR/icon.png (原始PNG)"
echo "   🍎 $OUTPUT_DIR/icon.icns (macOS图标)"
echo "   🪟 $OUTPUT_DIR/icon.ico (Windows图标)"
echo "   📁 $ICONSET_DIR/ (iconset目录)"
echo ""
echo "✨ 所有图标文件已准备就绪，可以用于Electron应用打包！"
echo "🚀 运行 './scripts/build/build_mac.sh' 开始构建应用"
