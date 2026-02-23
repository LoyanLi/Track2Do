#!/usr/bin/env python3
"""
测试py-ptsl轨道颜色获取
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from ptsl import open_engine
    PTSL_AVAILABLE = True
except ImportError:
    print("py-ptsl not available")
    PTSL_AVAILABLE = False
    sys.exit(1)

if __name__ == "__main__":
    if not PTSL_AVAILABLE:
        print("PTSL not available")
        sys.exit(1)
    
    try:
        with open_engine(company_name="PT-STEM", application_name="test_track_color") as engine:
            print("Connected to Pro Tools")
            
            # 获取轨道列表
            tracks = engine.track_list()
            print(f"Found {len(tracks)} tracks")
            
            # 打印前10个轨道的详细信息
            for i, track in enumerate(tracks[:10]):
                print(f"\nTrack {i+1}:")
                print(f"  Name: {track.name}")
                print(f"  ID: {track.id}")
                print(f"  Type: {track.type}")
                print(f"  Color: {track.color}")
                print(f"  Color type: {type(track.color)}")
                print(f"  Color repr: {repr(track.color)}")
                
                # 检查颜色是否为空
                if track.color:
                    print(f"  Color length: {len(str(track.color))}")
                    print(f"  Color as string: '{str(track.color)}'")
                else:
                    print(f"  Color is empty/None")
                    
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()