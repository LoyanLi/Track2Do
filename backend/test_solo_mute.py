#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试轨道Solo和Mute功能
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.append(str(Path(__file__).parent))

from core.ptsl_client import PTSLClient
from loguru import logger

async def test_solo_mute_functions():
    """测试solo和mute功能"""
    client = PTSLClient()
    
    try:
        # 连接到Pro Tools
        logger.info("正在连接到Pro Tools...")
        if not await client.connect():
            logger.error("连接Pro Tools失败")
            return False
        
        logger.info("连接成功，开始测试...")
        
        # 获取轨道列表
        tracks = await client.get_track_list()
        if not tracks:
            logger.error("没有找到轨道")
            return False
        
        logger.info(f"找到 {len(tracks)} 个轨道")
        
        # 选择第一个轨道进行测试
        test_track = tracks[0]
        track_name = test_track['name']
        logger.info(f"使用轨道进行测试: {track_name}")
        
        # 测试Mute功能
        logger.info("\n=== 测试Mute功能 ===")
        
        # 设置静音
        logger.info(f"设置轨道 '{track_name}' 为静音...")
        result = await client.set_track_mute_state([track_name], True)
        if result:
            logger.info("✓ 设置静音成功")
        else:
            logger.error("✗ 设置静音失败")
            return False
        
        # 等待一下
        await asyncio.sleep(2)
        
        # 取消静音
        logger.info(f"取消轨道 '{track_name}' 静音...")
        result = await client.set_track_mute_state([track_name], False)
        if result:
            logger.info("✓ 取消静音成功")
        else:
            logger.error("✗ 取消静音失败")
            return False
        
        # 测试Solo功能
        logger.info("\n=== 测试Solo功能 ===")
        
        # 设置独奏
        logger.info(f"设置轨道 '{track_name}' 为独奏...")
        result = await client.set_track_solo_state([track_name], True)
        if result:
            logger.info("✓ 设置独奏成功")
        else:
            logger.error("✗ 设置独奏失败")
            return False
        
        # 等待一下
        await asyncio.sleep(2)
        
        # 取消独奏
        logger.info(f"取消轨道 '{track_name}' 独奏...")
        result = await client.set_track_solo_state([track_name], False)
        if result:
            logger.info("✓ 取消独奏成功")
        else:
            logger.error("✗ 取消独奏失败")
            return False
        
        # 测试多轨道操作
        if len(tracks) > 1:
            logger.info("\n=== 测试多轨道操作 ===")
            
            # 选择前两个轨道
            track_names = [tracks[0]['name'], tracks[1]['name']]
            logger.info(f"测试轨道: {track_names}")
            
            # 同时设置多个轨道静音
            logger.info("设置多个轨道静音...")
            result = await client.set_track_mute_state(track_names, True)
            if result:
                logger.info("✓ 多轨道静音设置成功")
            else:
                logger.error("✗ 多轨道静音设置失败")
            
            await asyncio.sleep(2)
            
            # 取消多个轨道静音
            logger.info("取消多个轨道静音...")
            result = await client.set_track_mute_state(track_names, False)
            if result:
                logger.info("✓ 多轨道静音取消成功")
            else:
                logger.error("✗ 多轨道静音取消失败")
        
        logger.info("\n=== 所有测试完成 ===")
        return True
        
    except Exception as e:
        logger.error(f"测试过程中发生错误: {e}")
        return False
    
    finally:
        # 断开连接
        await client.disconnect()
        logger.info("已断开Pro Tools连接")

if __name__ == "__main__":
    logger.info("开始Solo/Mute功能测试")
    result = asyncio.run(test_solo_mute_functions())
    
    if result:
        logger.info("✓ 所有测试通过")
        sys.exit(0)
    else:
        logger.error("✗ 测试失败")
        sys.exit(1)