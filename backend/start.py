#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PT-STEM Backend 启动脚本
"""

import os
import sys
import argparse
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="PT-STEM Backend Server")
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="服务器主机地址 (默认: 127.0.0.1)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="服务器端口 (默认: 8000)"
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="启用自动重载 (开发模式)"
    )
    parser.add_argument(
        "--log-level",
        default="info",
        choices=["debug", "info", "warning", "error"],
        help="日志级别 (默认: info)"
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="工作进程数 (默认: 1)"
    )
    
    args = parser.parse_args()
    
    # 确保必要的目录存在
    os.makedirs("logs", exist_ok=True)
    os.makedirs("output", exist_ok=True)
    os.makedirs("temp", exist_ok=True)
    
    # 启动服务器
    import uvicorn
    
    print(f"正在启动 PT-STEM Backend Server...")
    print(f"主机: {args.host}")
    print(f"端口: {args.port}")
    print(f"重载: {args.reload}")
    print(f"日志级别: {args.log_level}")
    print(f"工作进程: {args.workers}")
    print("-" * 50)
    
    uvicorn.run(
        "main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level=args.log_level,
        workers=args.workers if not args.reload else 1
    )


if __name__ == "__main__":
    main()