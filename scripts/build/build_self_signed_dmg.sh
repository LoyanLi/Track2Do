#!/bin/bash

# Track2Do 自签名 DMG 构建脚本
# 构建带有自签名证书的 DMG 安装包

set -e

echo "🔐 Track2Do 自签名 DMG 构建脚本"
echo "=============================="
echo "📦 构建自签名版本的 DMG 安装包"
echo ""

# 配置变量
APP_NAME="Track2Do"
VERSION=$(node -p "require('./package.json').version")
CERT_NAME="Track2Do Self-Signed Certificate"
KEYCHAIN_NAME="track2do-keychain"
KEYCHAIN_PATH="$HOME/Library/Keychains/${KEYCHAIN_NAME}.keychain-db"

# 检查依赖
check_dependencies() {
    echo "🔍 检查依赖..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ 错误: 未找到 Node.js"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "❌ 错误: 未找到 npm"
        exit 1
    fi
    
    if ! command -v openssl &> /dev/null; then
        echo "❌ 错误: 未找到 openssl"
        echo "   请安装: brew install openssl"
        exit 1
    fi
    
    echo "✅ 依赖检查完成"
}

# 创建自签名证书
create_self_signed_cert() {
    echo "🔑 创建自签名证书..."
    
    # 检查是否已存在证书
    if security find-identity -v -p codesigning | grep -q "$CERT_NAME"; then
        echo "✅ 自签名证书已存在: $CERT_NAME"
        return 0
    fi
    
    # 创建临时钥匙串
    echo "📦 创建临时钥匙串..."
    security delete-keychain "$KEYCHAIN_NAME" 2>/dev/null || true
    security delete-keychain "$KEYCHAIN_PATH" 2>/dev/null || true
    security create-keychain -p "track2do" "$KEYCHAIN_NAME"
    security set-keychain-settings -t 3600 -l "$KEYCHAIN_NAME"
    security unlock-keychain -p "track2do" "$KEYCHAIN_NAME"
    
    # 添加钥匙串到搜索列表
    security list-keychains -s "$KEYCHAIN_NAME" login.keychain
    
    # 创建证书配置文件
    cat > cert_config.txt << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = California
L = San Francisco
O = Track2Do Development
OU = Development Team
CN = Track2Do Self-Signed Certificate

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = codeSigning
EOF
    
    # 生成私钥
    openssl genrsa -out track2do_private.key 2048
    
    # 生成证书签名请求
    openssl req -new -key track2do_private.key -out track2do.csr -config cert_config.txt
    
    # 生成自签名证书
    openssl x509 -req -days 365 -in track2do.csr -signkey track2do_private.key -out track2do.crt -extensions v3_req -extfile cert_config.txt
    
    # 导入私钥和证书到钥匙串
    security unlock-keychain -p "track2do" "$KEYCHAIN_NAME"
    security import track2do_private.key -k "$KEYCHAIN_NAME" -T /usr/bin/codesign -A
    security import track2do.crt -k "$KEYCHAIN_NAME" -T /usr/bin/codesign -A
    
    # 设置证书信任
    security set-key-partition-list -S apple-tool:,apple: -s -k "track2do" "$KEYCHAIN_NAME"
    
    # 清理临时文件
    rm -f cert_config.txt track2do_private.key track2do.csr track2do.crt
    
    echo "✅ 自签名证书创建完成"
}

# 备份原始 package.json
backup_package_json() {
    echo "💾 备份 package.json..."
    cp package.json package.json.backup
}

# 修改 package.json 以支持自签名
modify_package_json() {
    echo "⚙️ 修改构建配置..."
    
    # 使用 Node.js 修改 package.json
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        // 修改 mac 配置以支持自签名
        pkg.build.mac.identity = '$CERT_NAME';
        delete pkg.build.mac.notarize;
        pkg.build.mac.gatekeeperAssess = false;
        pkg.build.mac.hardenedRuntime = false;
        
        // 添加 DMG 配置
        pkg.build.dmg = {
            title: 'Track2Do ${version}',
            icon: 'assets/icons/icon.icns',
            background: null,
            contents: [
                {
                    x: 130,
                    y: 220
                },
                {
                    x: 410,
                    y: 220,
                    type: 'link',
                    path: '/Applications'
                }
            ],
            window: {
                width: 540,
                height: 380
            }
        };
        
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "
    
    echo "✅ 构建配置修改完成"
}

# 恢复原始 package.json
restore_package_json() {
    echo "🔄 恢复原始配置..."
    mv package.json.backup package.json
}

# 构建应用
build_app() {
    echo "🔨 构建应用..."
    
    # 清理旧的构建文件
    rm -rf dist/
    rm -rf release/
    
    # 安装依赖
    echo "📦 安装依赖..."
    npm install
    
    # 构建主进程和渲染进程
    echo "🔨 构建主进程和渲染进程..."
    npm run build
    
    echo "✅ 应用构建完成"
}

# 打包 DMG
package_dmg() {
    echo "📱 打包 DMG..."
    
    # 设置环境变量以跳过公证
    export CSC_IDENTITY_AUTO_DISCOVERY=false
    export CSC_NAME="$CERT_NAME"
    
    # 打包 macOS 应用
    npm run package:mac
    
    echo "✅ DMG 打包完成"
}

# 签名 DMG 文件
sign_dmg() {
    echo "🔐 签名 DMG 文件..."
    
    # 查找生成的 DMG 文件
    DMG_X64="./release/${APP_NAME}-${VERSION}.dmg"
    DMG_ARM64="./release/${APP_NAME}-${VERSION}-arm64.dmg"
    
    # 签名 x64 DMG
    if [ -f "$DMG_X64" ]; then
        echo "🔐 签名 x64 DMG..."
        codesign -f -s "$CERT_NAME" -v "$DMG_X64" --deep
        
        if [ $? -eq 0 ]; then
            echo "✅ x64 DMG 签名成功"
            
            # 验证签名
            codesign -v -v "$DMG_X64"
            if [ $? -eq 0 ]; then
                echo "✅ x64 DMG 签名验证成功"
                
                # 重命名为自签名版本
                mv "$DMG_X64" "./release/${APP_NAME}-${VERSION}-self-signed.dmg"
                echo "📦 x64 自签名 DMG: ./release/${APP_NAME}-${VERSION}-self-signed.dmg"
            else
                echo "❌ x64 DMG 签名验证失败"
            fi
        else
            echo "❌ x64 DMG 签名失败"
        fi
    fi
    
    # 签名 ARM64 DMG
    if [ -f "$DMG_ARM64" ]; then
        echo "🔐 签名 ARM64 DMG..."
        codesign -f -s "$CERT_NAME" -v "$DMG_ARM64" --deep
        
        if [ $? -eq 0 ]; then
            echo "✅ ARM64 DMG 签名成功"
            
            # 验证签名
            codesign -v -v "$DMG_ARM64"
            if [ $? -eq 0 ]; then
                echo "✅ ARM64 DMG 签名验证成功"
                
                # 重命名为自签名版本
                mv "$DMG_ARM64" "./release/${APP_NAME}-${VERSION}-arm64-self-signed.dmg"
                echo "📦 ARM64 自签名 DMG: ./release/${APP_NAME}-${VERSION}-arm64-self-signed.dmg"
            else
                echo "❌ ARM64 DMG 签名验证失败"
            fi
        else
            echo "❌ ARM64 DMG 签名失败"
        fi
    fi
}

# 显示结果
show_results() {
    echo ""
    echo "🎉 自签名 DMG 构建完成！"
    echo "========================"
    echo "📁 构建产物位置: ./release/"
    echo ""
    
    # 列出生成的文件
    if ls ./release/*.dmg 1> /dev/null 2>&1; then
        echo "📦 生成的 DMG 文件:"
        ls -la ./release/*.dmg | while read line; do
            echo "   $line"
        done
    fi
    
    echo ""
    echo "📋 使用说明:"
    echo "============"
    echo "1. 自签名 DMG 无法通过 Gatekeeper 验证"
    echo "2. 用户安装时需要:"
    echo "   - 右键点击 DMG 文件选择 '打开'"
    echo "   - 在弹出对话框中点击 '打开'"
    echo "   - 或在系统偏好设置中允许运行"
    echo ""
    echo "3. 企业内部分发:"
    echo "   - 可通过 MDM 系统预先信任证书"
    echo "   - 或指导用户手动信任证书"
    echo ""
    echo "🔧 证书管理:"
    echo "   查看证书: security find-identity -v -p codesigning"
    echo "   删除证书: security delete-keychain $KEYCHAIN_NAME"
    echo "   重新创建: 删除证书后重新运行此脚本"
}

# 清理函数
cleanup() {
    echo "🧹 清理临时文件..."
    
    # 恢复 package.json（如果存在备份）
    if [ -f "package.json.backup" ]; then
        restore_package_json
    fi
    
    # 清理证书配置文件
    rm -f cert_config.txt
}

# 设置退出时清理
trap cleanup EXIT

# 主流程
main() {
    echo "🚀 开始构建自签名 DMG..."
    echo ""
    
    # 检查依赖
    check_dependencies
    echo ""
    
    # 创建自签名证书
    create_self_signed_cert
    echo ""
    
    # 备份并修改配置
    backup_package_json
    modify_package_json
    echo ""
    
    # 构建应用
    build_app
    echo ""
    
    # 打包 DMG
    package_dmg
    echo ""
    
    # 签名 DMG
    sign_dmg
    echo ""
    
    # 显示结果
    show_results
}

# 运行主流程
main