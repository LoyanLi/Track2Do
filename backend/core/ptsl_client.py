#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PTSL 客户端封装
基于 py-ptsl 库的 Pro Tools 控制客户端
"""

import asyncio
import os
import uuid
from typing import Optional, Dict, List, Any, Union
from pathlib import Path
from datetime import datetime

from loguru import logger

try:
    import ptsl
    from ptsl import Engine
    from ptsl import PTSL_pb2
    PTSL_AVAILABLE = True
except ImportError:
    logger.warning("py-ptsl 库未安装，将使用模拟模式")
    PTSL_AVAILABLE = False
    ptsl = None
    Engine = None
    PTSL_pb2 = None


class PTSLClient:
    """PTSL 客户端封装类"""
    
    def __init__(self, host: str = "127.0.0.1", port: int = 31416, timeout: int = 30):
        """
        初始化 PTSL 客户端
        
        Args:
            host: Pro Tools 主机地址
            port: PTSL 端口
            timeout: 连接超时时间
        """
        self.host = host
        self.port = port
        self.timeout = timeout
        self.engine: Optional[Engine] = None
        self._connected = False
        self._session_info = {}
        self._tracks = []
        self._export_cancelled = False  # 导出取消标志
    
    def _normalize_bit_depth(self, bit_depth_value: Any) -> int:
        """
        标准化 bit depth 为整数（16/24/32）。
        
        PTSL 在不同版本/调用场景下可能返回枚举值、整数或字符串（如 "32 Float"）。
        这里统一转为 int，避免 API 模型校验失败及后续导出参数判断错误。
        """
        if bit_depth_value is None:
            return 24

        # 处理 protobuf/enum 包装值
        if hasattr(bit_depth_value, "value"):
            enum_value = getattr(bit_depth_value, "value")
            if isinstance(enum_value, int):
                bit_depth_value = enum_value

        if isinstance(bit_depth_value, (int, float)):
            numeric_value = int(bit_depth_value)
            numeric_mapping = {
                1: 16,   # Bit16
                2: 24,   # Bit24
                3: 32,   # Bit32Float
                16: 16,
                24: 24,
                32: 32,
            }
            return numeric_mapping.get(numeric_value, 24)

        text = str(bit_depth_value).strip().lower()
        compact = text.replace(" ", "").replace("_", "").replace("-", "")

        if compact in {"1", "16", "16bit", "bit16"}:
            return 16
        if compact in {"2", "24", "24bit", "bit24"}:
            return 24
        if compact in {"3", "32", "32bit", "32float", "32bitfloat", "float32", "bit32float", "bit32"}:
            return 32

        logger.warning(f"未知位深度值 '{bit_depth_value}'，将回退到 24-bit")
        return 24
        
    @property
    def is_connected(self) -> bool:
        """检查是否已连接"""
        return self._connected and self.engine is not None
    
    async def connect(self) -> bool:
        """连接到 Pro Tools"""
        if not PTSL_AVAILABLE:
            logger.warning("PTSL 库不可用，使用模拟模式")
            self._connected = True
            return True
            
        try:
            logger.info(f"正在连接到 Pro Tools PTSL: {self.host}:{self.port}")
            
            # 创建 py-ptsl Engine
            address = f"{self.host}:{self.port}"
            self.engine = Engine(
                company_name="PT-STEM",
                application_name="PT-STEM Backend",
                address=address
            )
            
            # 测试连接 - 发送 HostReadyCheck 命令
            await asyncio.wait_for(
                asyncio.to_thread(self.engine.host_ready_check),
                timeout=self.timeout
            )
            
            self._connected = True
            logger.info("已成功连接到 Pro Tools")
            return True
            
        except asyncio.TimeoutError:
            logger.error(f"连接 Pro Tools 超时 ({self.timeout}s)")
            self._connected = False
            return False
        except Exception as e:
            logger.error(f"连接 Pro Tools 失败: {e}")
            self._connected = False
            return False
    
    async def disconnect(self):
        """断开连接"""
        if self._connected:
            try:
                if self.engine:
                    self.engine.close()
                logger.info("已断开 Pro Tools 连接")
            except Exception as e:
                logger.error(f"断开连接时出错: {e}")
            finally:
                self._connected = False
                self.engine = None
    
    async def get_session_info(self) -> Dict[str, Any]:
        """获取当前会话信息"""
        if not self.is_connected:
            raise ConnectionError("未连接到 Pro Tools")
        
        if not PTSL_AVAILABLE:
            # 模拟模式返回示例数据
            return {
                "session_name": "Demo Session",
                "session_path": "/Users/demo/Documents/Demo Session.ptx",
                "sample_rate": 48000,
                "bit_depth": 24,
                "is_playing": False,
                "is_recording": False
            }
        
        try:
            # 使用 py-ptsl Engine 获取会话信息（调用方法）
            session_name = await asyncio.to_thread(lambda: self.engine.session_name())
            session_path = await asyncio.to_thread(lambda: self.engine.session_path())
            
            # 获取传输状态
            transport_state = await asyncio.to_thread(lambda: self.engine.transport_state)
            is_playing = transport_state == "Playing"  # 根据实际返回值调整
            is_recording = transport_state == "Recording"  # 根据实际返回值调整
            
            # 获取会话设置
            session_sample_rate = await asyncio.to_thread(lambda: self.engine.session_sample_rate())
            session_bit_depth_raw = await asyncio.to_thread(lambda: self.engine.session_bit_depth())
            
            # 统一为整数位深度，避免 32-bit float 场景下类型不兼容
            session_bit_depth = self._normalize_bit_depth(session_bit_depth_raw)
            
            return {
                "session_name": session_name,
                "session_path": session_path,
                "sample_rate": session_sample_rate,
                "bit_depth": session_bit_depth,
                "is_playing": is_playing,
                "is_recording": is_recording
            }
            
        except Exception as e:
            logger.error(f"获取会话信息失败: {e}")
            raise
    
    async def get_track_list(self) -> List[Dict[str, Any]]:
        """获取轨道列表"""
        if not self.is_connected:
            raise ConnectionError("未连接到 Pro Tools")
        
        if not PTSL_AVAILABLE:
            # 模拟模式返回示例轨道
            return [
                {
                    "id": "track_1",
                    "name": "Kick",
                    "type": "audio",
                    "is_muted": False,
                    "is_soloed": False,
                    "volume": 0.0,
                    "pan": 0.0
                },
                {
                    "id": "track_2",
                    "name": "Snare",
                    "type": "audio",
                    "is_muted": False,
                    "is_soloed": False,
                    "volume": 0.0,
                    "pan": 0.0
                },
                {
                    "id": "track_3",
                    "name": "Bass",
                    "type": "audio",
                    "is_muted": False,
                    "is_soloed": False,
                    "volume": 0.0,
                    "pan": 0.0
                }
            ]
        
        try:
            # 使用 py-ptsl Engine 获取轨道列表
            tracks = await asyncio.to_thread(lambda: self.engine.track_list())
            
            track_list = []
            for track in tracks:
                # 转换轨道类型枚举为字符串
                track_type = "audio"  # 默认值
                if hasattr(track, 'type'):
                    type_value = str(track.type)
                    type_int = int(track.type) if hasattr(track.type, '__int__') else None
                    
                    # 获取颜色值
                    color_value = track.color
                    
                    # 根据 PTSL.proto 的 TrackType 枚举值映射
                    if type_int == 1 or "Midi" in type_value or "TT_Midi" in type_value or "TType_Midi" in type_value:
                        track_type = "midi"
                    elif type_int == 2 or "AudioTrack" in type_value or "TT_Audio" in type_value or "TType_Audio" in type_value:
                        track_type = "audio"
                    elif type_int == 3 or "Aux" in type_value or "TT_Aux" in type_value or "TType_Aux" in type_value:
                        track_type = "aux"
                    elif type_int == 11 or "Instrument" in type_value or "TT_Instrument" in type_value or "TType_Instrument" in type_value:
                        track_type = "instrument"
                    elif type_int == 12 or "Master" in type_value or "TT_Master" in type_value or "TType_Master" in type_value:
                        track_type = "master"
                    else:
                        # 其他类型默认为 audio
                        track_type = "audio"
                
                # 处理颜色信息
                color_value = None
                if track.color:
                    color_value = str(track.color)
                
                track_dict = {
                    "id": track.id,
                    "name": track.name,
                    "type": track_type,
                    "is_muted": track.track_attributes.is_muted,
                    "is_soloed": track.track_attributes.is_soloed,
                    "is_record_enabled": False,  # 默认值，可以后续从track属性获取
                    "volume": 0.0,  # 默认值，可以后续从track属性获取
                    "pan": 0.0,  # 默认值，可以后续从track属性获取
                    "color": color_value,
                    "comments": None  # 默认值，可以后续从track属性获取
                }
                
                # 轨道信息已处理
                track_list.append(track_dict)
            
            return track_list
            
        except Exception as e:
            logger.error(f"获取轨道列表失败: {e}")
            raise
    
    async def play(self) -> bool:
        """开始播放"""
        if not self.is_connected:
            raise ConnectionError("未连接到 Pro Tools")
        
        if not PTSL_AVAILABLE:
            logger.info("模拟模式：播放命令")
            return True
        
        try:
            # 使用 py-ptsl Engine 开始播放
            await asyncio.to_thread(self.engine.play)
            logger.info("开始播放")
            return True
        except Exception as e:
            logger.error(f"播放失败: {e}")
            return False
    
    async def stop(self) -> bool:
        """停止播放/录音"""
        if not self.is_connected:
            raise ConnectionError("未连接到 Pro Tools")
        
        if not PTSL_AVAILABLE:
            logger.info("模拟模式：停止命令")
            return True
        
        try:
            # 使用 py-ptsl Engine 停止播放
            await asyncio.to_thread(self.engine.stop)
            logger.info("停止播放")
            return True
        except Exception as e:
            logger.error(f"停止失败: {e}")
            return False
    
    async def record(self) -> bool:
        """开始录音"""
        if not self.is_connected:
            raise ConnectionError("未连接到 Pro Tools")
        
        if not PTSL_AVAILABLE:
            logger.info("模拟模式：录音命令")
            return True
        
        try:
            # 使用 py-ptsl Engine 开始录音
            await asyncio.to_thread(self.engine.record)
            logger.info("开始录音")
            return True
        except Exception as e:
            logger.error(f"录音失败: {e}")
            return False
    
    async def is_playing(self) -> bool:
        """检查是否正在播放"""
        if not self.is_connected:
            return False
        
        if not PTSL_AVAILABLE:
            return False
        
        try:
            # 使用 py-ptsl Engine 检查播放状态（使用属性）
            transport_state = await asyncio.to_thread(lambda: self.engine.transport_state)
            return transport_state == "Playing"
        except Exception as e:
            logger.error(f"检查播放状态失败: {e}")
            return False
    
    async def is_recording(self) -> bool:
        """检查是否正在录音"""
        if not self.is_connected:
            return False
        
        if not PTSL_AVAILABLE:
            return False
        
        try:
            # 使用 py-ptsl Engine 检查录音状态（使用属性）
            transport_state = await asyncio.to_thread(lambda: self.engine.transport_state)
            return transport_state == "Recording"
        except Exception as e:
            logger.error(f"检查录音状态失败: {e}")
            return False
    

    

    

    
    async def set_track_mute_state(self, track_names: List[str], enabled: bool) -> bool:
        """设置轨道静音状态
        
        Args:
            track_names: 轨道名称列表
            enabled: True为静音，False为取消静音
        """
        if not self.is_connected:
            raise ConnectionError("未连接到 Pro Tools")
        
        if not PTSL_AVAILABLE:
            logger.info(f"模拟模式：设置轨道静音状态 {track_names} -> {enabled}")
            return True
        
        try:
            # 创建请求体字典
            request_data = {
                "track_names": track_names,
                "enabled": enabled
            }
            
            # 使用client.run_command发送命令
            await asyncio.to_thread(
                self.engine.client.run_command,
                PTSL_pb2.CommandId.SetTrackMuteState,
                request_data
            )
            
            logger.info(f"轨道静音状态设置成功: {track_names} -> {'静音' if enabled else '取消静音'}")
            return True
            
        except Exception as e:
            logger.error(f"设置轨道静音状态失败: {e}")
            return False
    
    async def set_track_solo_state(self, track_names: List[str], enabled: bool) -> bool:
        """设置轨道独奏状态
        
        Args:
            track_names: 轨道名称列表
            enabled: True为独奏，False为取消独奏
        """
        if not self.is_connected:
            raise ConnectionError("未连接到 Pro Tools")
        
        if not PTSL_AVAILABLE:
            logger.info(f"模拟模式：设置轨道独奏状态 {track_names} -> {enabled}")
            return True
        
        try:
            # 创建请求体字典
            request_data = {
                "track_names": track_names,
                "enabled": enabled
            }
            
            # 使用client.run_command发送命令
            await asyncio.to_thread(
                self.engine.client.run_command,
                PTSL_pb2.CommandId.SetTrackSoloState,
                request_data
            )
            
            logger.info(f"轨道独奏状态设置成功: {track_names} -> {'独奏' if enabled else '取消独奏'}")
            return True
            
        except Exception as e:
            logger.error(f"设置轨道独奏状态失败: {e}")
            return False
    
    async def apply_snapshot(self, snapshot_data: Dict[str, Any]) -> Dict[str, Any]:
        """应用快照到Pro Tools
        
        Args:
            snapshot_data: 快照数据，包含轨道状态信息
        """
        if not self.is_connected:
            raise ConnectionError("未连接到 Pro Tools")
        
        if not PTSL_AVAILABLE:
            logger.info(f"模拟模式：应用快照 {snapshot_data.get('name', 'Unknown')}")
            track_count = len(snapshot_data.get('snapshot', {}).get('trackStates', []))
            return {
                "success": True,
                "total_tracks": track_count,
                "success_count": track_count,
                "error_count": 0,
                "skipped_count": 0,
                "errors": []
            }
        
        try:
            snapshot = snapshot_data.get('snapshot', {})
            track_states = snapshot.get('trackStates', [])
            
            logger.info(f"开始应用快照: {snapshot.get('name', 'Unknown')}")
            
            # 首先获取当前轨道状态
            current_tracks = await self.get_track_list()
            current_track_states = {track['name']: track for track in current_tracks}
            
            # 分别处理静音和独奏状态，只修改状态不同的轨道
            muted_tracks = []
            unmuted_tracks = []
            soloed_tracks = []
            unsoloed_tracks = []
            skipped_tracks = []
            
            for track_state in track_states:
                track_name = track_state.get('trackName')
                target_muted = track_state.get('is_muted', False)
                target_soloed = track_state.get('is_soloed', False)
                
                # 检查轨道是否存在于当前工程中
                if track_name not in current_track_states:
                    logger.warning(f"轨道 {track_name} 在当前工程中不存在，跳过")
                    continue
                
                current_track = current_track_states[track_name]
                current_muted = current_track.get('is_muted', False)
                current_soloed = current_track.get('is_soloed', False)
                
                # 只有当目标状态与当前状态不同时才进行修改
                if target_muted != current_muted:
                    if target_muted:
                        muted_tracks.append(track_name)
                    else:
                        unmuted_tracks.append(track_name)
                else:
                    logger.debug(f"轨道 {track_name} 静音状态已是目标状态 ({target_muted})，跳过")
                    
                if target_soloed != current_soloed:
                    if target_soloed:
                        soloed_tracks.append(track_name)
                    else:
                        unsoloed_tracks.append(track_name)
                else:
                    logger.debug(f"轨道 {track_name} 独奏状态已是目标状态 ({target_soloed})，跳过")
                
                # 如果两个状态都不需要修改，记录为跳过的轨道
                if target_muted == current_muted and target_soloed == current_soloed:
                    skipped_tracks.append(track_name)
            
            logger.info(f"状态检查完成 - 需要修改静音: {len(muted_tracks + unmuted_tracks)} 个轨道, 需要修改独奏: {len(soloed_tracks + unsoloed_tracks)} 个轨道, 跳过: {len(skipped_tracks)} 个轨道")
            
            # 应用静音状态（逐个处理以避免单个轨道错误影响整体）
            success_count = 0
            error_count = 0
            errors = []
            
            for track_name in muted_tracks:
                try:
                    await self.set_track_mute_state([track_name], True)
                    success_count += 1
                except Exception as e:
                    error_msg = f"轨道 {track_name} 静音设置失败: {e}"
                    logger.warning(error_msg)
                    errors.append(error_msg)
                    error_count += 1
                    
            for track_name in unmuted_tracks:
                try:
                    await self.set_track_mute_state([track_name], False)
                    success_count += 1
                except Exception as e:
                    error_msg = f"轨道 {track_name} 取消静音设置失败: {e}"
                    logger.warning(error_msg)
                    errors.append(error_msg)
                    error_count += 1
                
            # 应用独奏状态（逐个处理以避免单个轨道错误影响整体）
            for track_name in soloed_tracks:
                try:
                    await self.set_track_solo_state([track_name], True)
                    success_count += 1
                except Exception as e:
                    error_msg = f"轨道 {track_name} 独奏设置失败: {e}"
                    logger.warning(error_msg)
                    errors.append(error_msg)
                    error_count += 1
                    
            for track_name in unsoloed_tracks:
                try:
                    await self.set_track_solo_state([track_name], False)
                    success_count += 1
                except Exception as e:
                    error_msg = f"轨道 {track_name} 取消独奏设置失败: {e}"
                    logger.warning(error_msg)
                    errors.append(error_msg)
                    error_count += 1
            
            total_tracks = len(track_states)
            skipped_count = len(skipped_tracks)
            
            if error_count > 0:
                logger.warning(f"快照应用完成: {snapshot.get('name', 'Unknown')} - 成功: {success_count}, 失败: {error_count}, 跳过: {skipped_count}")
            else:
                logger.info(f"快照应用成功: {snapshot.get('name', 'Unknown')} - 成功设置: {success_count}, 跳过: {skipped_count} 个轨道状态")
            
            return {
                "success": True,
                "total_tracks": total_tracks,
                "success_count": success_count,
                "error_count": error_count,
                "skipped_count": skipped_count,
                "errors": errors
            }
            
        except Exception as e:
            logger.error(f"应用快照失败: {e}")
            return {
                "success": False,
                "total_tracks": len(snapshot_data.get('snapshot', {}).get('trackStates', [])),
                "success_count": 0,
                "error_count": 1,
                "errors": [str(e)]
            }
    
    async def bounce_to_disk_direct(self, 
                                    output_path: str, 
                                    file_format: str = "wav", 
                                    sample_rate: Optional[int] = None,
                                    bit_depth: Optional[int] = None,
                                    export_type: str = "stereo",
                                    normalize: bool = False,
                                    dither: bool = False) -> Dict[str, Any]:
        """
        直接导出音频到磁盘（不处理快照）
        
        Args:
            output_path: 输出文件路径
            file_format: 文件格式 (wav, aiff, mp3, flac)
            sample_rate: 采样率（None表示使用工程设置）
            bit_depth: 位深度（None表示使用工程设置）
            export_type: 导出类型 (stereo, mono, multi_channel)
            normalize: 是否标准化
            dither: 是否抖动
        
        Returns:
            导出结果字典
        """
        if not self.is_connected:
            raise ConnectionError("未连接到 Pro Tools")
        
        if not PTSL_AVAILABLE:
            logger.info(f"模拟模式：导出音频到 {output_path}")
            # 模拟导出延时
            await asyncio.sleep(2)
            return {
                "success": True,
                "output_path": output_path,
                "file_size": 1024 * 1024 * 10,  # 模拟10MB文件
                "duration": 2.0
            }
        
        try:
            # 获取会话信息以确定默认采样率和位深度
            session_info = await self.get_session_info()
            actual_sample_rate = sample_rate or session_info.get("sample_rate", 48000)
            actual_bit_depth = self._normalize_bit_depth(
                bit_depth if bit_depth is not None else session_info.get("bit_depth", 24)
            )
            
            logger.info(f"开始直接导出音频: {output_path}")
            logger.info(f"格式: {file_format}, 采样率: {actual_sample_rate}, 位深度: {actual_bit_depth}")
            
            # 使用 py-ptsl Engine 执行 export_mix (bounce)
            # 根据 py-ptsl API 文档调整参数
            
            # 根据py-ptsl文档，创建正确的源信息
            source_info = PTSL_pb2.EM_SourceInfo()
            source_info.source_type = PTSL_pb2.EM_SourceType.Bus  # 使用Bus类型
            source_info.name = "Ref Print"  # 使用Ref Print bus
            
            # 创建音频信息
            audio_info = PTSL_pb2.EM_AudioInfo()
            
            # 确定文件类型（作为单独参数传递给 export_mix）
            if file_format.lower() == "wav":
                file_type = PTSL_pb2.EM_FileType.EM_WAV
            elif file_format.lower() == "aiff":
                file_type = PTSL_pb2.EM_FileType.EM_AIFF
            else:
                file_type = PTSL_pb2.EM_FileType.EM_WAV  # 默认WAV
            
            # 设置采样率
            if actual_sample_rate == 44100:
                audio_info.sample_rate = PTSL_pb2.SampleRate.SR_44100
            elif actual_sample_rate == 48000:
                audio_info.sample_rate = PTSL_pb2.SampleRate.SR_48000
            elif actual_sample_rate == 96000:
                audio_info.sample_rate = PTSL_pb2.SampleRate.SR_96000
            else:
                audio_info.sample_rate = PTSL_pb2.SampleRate.SR_48000  # 默认48kHz
            
            # 设置位深度
            if actual_bit_depth == 16:
                audio_info.bit_depth = PTSL_pb2.BitDepth.Bit16
            elif actual_bit_depth == 24:
                audio_info.bit_depth = PTSL_pb2.BitDepth.Bit24
            elif actual_bit_depth == 32:
                audio_info.bit_depth = PTSL_pb2.BitDepth.Bit32Float
            else:
                audio_info.bit_depth = PTSL_pb2.BitDepth.Bit24  # 默认24bit
            
            # 创建视频信息（空）
            video_info = PTSL_pb2.EM_VideoInfo()
            
            # 使用更短的路径避免Pro Tools路径处理问题
            output_dir = "/tmp"
            simple_filename = "export"
            safe_output_path = str(Path(output_dir) / f"{simple_filename}.{file_format}")
            
            # 创建位置信息
            location_info = PTSL_pb2.EM_LocationInfo()
            location_info.file_destination = PTSL_pb2.EM_FileDestination.EM_FD_Directory
            location_info.directory = output_dir
            
            # 创建Dolby Atmos信息（空）
            dolby_atmos_info = PTSL_pb2.EM_DolbyAtmosInfo()
            
            # 执行导出
            bounce_result = await asyncio.to_thread(
                self.engine.export_mix,
                base_name=simple_filename,  # 文件名（不含扩展名）
                file_type=file_type,
                sources=[source_info],  # 使用正确配置的源信息
                audio_info=audio_info,
                video_info=video_info,
                location_info=location_info,
                dolby_atmos_info=dolby_atmos_info,
                offline_bounce=PTSL_pb2.TripleBool.TB_True
            )
            
            # 检查文件是否成功创建
            output_file = Path(safe_output_path)
            if output_file.exists():
                file_size = output_file.stat().st_size
                logger.info(f"导出成功: {safe_output_path}, 文件大小: {file_size} 字节")
                
                return {
                    "success": True,
                    "output_path": str(output_file),
                    "file_size": file_size,
                    "sample_rate": actual_sample_rate,
                    "bit_depth": actual_bit_depth,
                    "format": file_format
                }
            else:
                raise Exception(f"导出文件未创建: {safe_output_path}")
                
        except Exception as e:
            logger.error(f"导出音频失败: {e}")
            return {
                "success": False,
                "error": str(e),
                "output_path": output_path
            }
    
    def _create_source_info(self, source_name: str, source_type: str) -> 'PTSL_pb2.EM_SourceInfo':
        """
        创建混音源信息对象
        
        Args:
            source_name: 混音源名称
            source_type: 混音源类型字符串
            
        Returns:
            EM_SourceInfo: 混音源信息对象
        """
        source_info = PTSL_pb2.EM_SourceInfo()
        source_info.name = source_name
        
        # 根据 py-ptsl 文档，EM_SourceType 只有三个值：PhysicalOut=0, Bus=1, Output=2
        if source_type.lower() == "physicalout":
            source_info.source_type = PTSL_pb2.EM_SourceType.PhysicalOut
        elif source_type.lower() == "bus":
            source_info.source_type = PTSL_pb2.EM_SourceType.Bus
        else:  # Output
            source_info.source_type = PTSL_pb2.EM_SourceType.Output
        
        return source_info
    
    def _create_audio_info(self, sample_rate: int, bit_depth: int) -> 'PTSL_pb2.EM_AudioInfo':
        """
        创建音频信息对象
        
        Args:
            sample_rate: 采样率
            bit_depth: 位深度
            
        Returns:
            EM_AudioInfo: 音频信息对象
        """
        audio_info = PTSL_pb2.EM_AudioInfo()
        
        # 设置采样率
        if sample_rate == 44100:
            audio_info.sample_rate = PTSL_pb2.SampleRate.SR_44100
        elif sample_rate == 48000:
            audio_info.sample_rate = PTSL_pb2.SampleRate.SR_48000
        elif sample_rate == 96000:
            audio_info.sample_rate = PTSL_pb2.SampleRate.SR_96000
        elif sample_rate == 192000:
            audio_info.sample_rate = PTSL_pb2.SampleRate.SR_192000
        else:
            audio_info.sample_rate = PTSL_pb2.SampleRate.SR_48000
        
        # 标准化位深度后再映射
        bit_depth = self._normalize_bit_depth(bit_depth)

        # 设置位深度
        if bit_depth == 16:
            audio_info.bit_depth = PTSL_pb2.BitDepth.Bit16
        elif bit_depth == 24:
            audio_info.bit_depth = PTSL_pb2.BitDepth.Bit24
        elif bit_depth == 32:
            audio_info.bit_depth = PTSL_pb2.BitDepth.Bit32Float
        else:
            audio_info.bit_depth = PTSL_pb2.BitDepth.Bit24
        
        # 设置导出格式
        audio_info.export_format = PTSL_pb2.ExportFormat.EF_Interleaved
        audio_info.compression_type = PTSL_pb2.CompressionType.CT_PCM
        
        return audio_info
    
    def _create_location_info(self, export_path: str) -> 'PTSL_pb2.EM_LocationInfo':
        """
        创建位置信息
        
        Args:
            export_path: 导出文件路径
            
        Returns:
            EM_LocationInfo: 位置信息对象
        """
        location_info = PTSL_pb2.EM_LocationInfo()
        
        # 设置目录路径 - MacOS 路径必须以冒号结尾
        directory_path = os.path.dirname(export_path)
        if not directory_path.endswith(":"):
            directory_path += ":"
        location_info.directory = directory_path
        
        # 使用 EM_FD_SessionFolder (值为1) - 避免断言失败问题
        # EM_FD_Directory (值为2) 会导致 Pro Tools 内部断言失败
        location_info.file_destination = PTSL_pb2.EM_FileDestination.EM_FD_SessionFolder
        
        # 设置导入选项
        location_info.import_after_bounce = PTSL_pb2.TripleBool.TB_False
        
        # 确保目录存在
        os.makedirs(os.path.dirname(export_path), exist_ok=True)
        
        return location_info

    async def export_mix_with_source(self,
                                   output_path: str,
                                   source_name: str,
                                   source_type: str,
                                   file_format: str = "wav",
                                   offline_bounce: bool = True) -> Dict[str, Any]:
        """
        使用指定混音源导出音频（基于已测试的 ProToolsMixer 实现）
        
        Args:
            output_path: 输出文件路径
            source_name: 混音源名称
            source_type: 混音源类型 (PhysicalOut, Bus, Output)
            file_format: 文件格式
            offline_bounce: 是否离线导出
        
        Returns:
            导出结果字典
        """
        if not self.is_connected:
            raise ConnectionError("未连接到 Pro Tools")
        
        # 重置取消标志
        self._export_cancelled = False
        
        if not PTSL_AVAILABLE:
            logger.info(f"模拟模式：使用源 {source_name}({source_type}) 导出音频到 {output_path}")
            # 模拟导出延时，并检查取消标志
            for i in range(20):  # 分成20个小段检查
                if self._export_cancelled:
                    logger.info("导出已取消")
                    return {
                        "success": False,
                        "cancelled": True,
                        "output_path": output_path,
                        "source_name": source_name,
                        "source_type": source_type
                    }
                await asyncio.sleep(0.1)
            return {
                "success": True,
                "output_path": output_path,
                "file_size": 1024 * 1024 * 10,  # 模拟10MB文件
                "source_name": source_name,
                "source_type": source_type
            }
        
        try:
            # 检查取消标志
            if self._export_cancelled:
                logger.info("导出在开始前已取消")
                return {
                    "success": False,
                    "cancelled": True,
                    "output_path": output_path,
                    "source_name": source_name,
                    "source_type": source_type
                }
            
            # 获取工程信息以获取采样率和位深度
            session_info = await self.get_session_info()
            sample_rate = session_info.get('sample_rate', 48000)
            bit_depth = self._normalize_bit_depth(session_info.get('bit_depth', 24))
            
            logger.info(f"开始导出混音: 源={source_name}, 类型={source_type}, 路径={output_path}")
            
            # 确保输出目录存在
            output_dir = Path(output_path).parent
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # 再次检查取消标志
            if self._export_cancelled:
                logger.info("导出在准备阶段已取消")
                return {
                    "success": False,
                    "cancelled": True,
                    "output_path": output_path,
                    "source_name": source_name,
                    "source_type": source_type
                }
            
            # 创建导出参数 - 只使用文件名（不含扩展名）
            base_name = os.path.splitext(os.path.basename(output_path))[0]
            
            # 设置文件类型 - 只支持WAV和AIFF格式
            if file_format.upper() == "WAV":
                file_type = PTSL_pb2.EM_FileType.EM_WAV
            elif file_format.upper() == "AIFF":
                file_type = PTSL_pb2.EM_FileType.EM_AIFF
            else:
                logger.warning(f"不支持的文件格式 {file_format}，将使用 WAV 格式代替")
                file_type = PTSL_pb2.EM_FileType.EM_WAV  # 默认WAV
            
            # 创建混音源列表
            sources = [self._create_source_info(source_name, source_type)]
            
            # 创建音频信息
            audio_info = self._create_audio_info(sample_rate, bit_depth)
            
            # 创建视频信息（空）
            video_info = PTSL_pb2.EM_VideoInfo()
            video_info.include_video = PTSL_pb2.TripleBool.TB_False
            
            # 创建位置信息
            location_info = self._create_location_info(output_path)
            
            # 创建 Dolby Atmos 信息（空）
            dolby_atmos_info = PTSL_pb2.EM_DolbyAtmosInfo()
            
            # 设置离线导出选项
            offline_bounce_option = PTSL_pb2.TripleBool.TB_True if offline_bounce else PTSL_pb2.TripleBool.TB_False
            
            # 最后检查取消标志
            if self._export_cancelled:
                logger.info("导出在执行前已取消")
                return {
                    "success": False,
                    "cancelled": True,
                    "output_path": output_path,
                    "source_name": source_name,
                    "source_type": source_type
                }
            
            # 执行混音导出
            await asyncio.to_thread(
                self.engine.export_mix,
                base_name=base_name,
                file_type=file_type,
                sources=sources,
                audio_info=audio_info,
                video_info=video_info,
                location_info=location_info,
                dolby_atmos_info=dolby_atmos_info,
                offline_bounce=offline_bounce_option
            )
            
            # 检查是否在导出过程中被取消
            if self._export_cancelled:
                logger.info("导出在执行过程中已取消")
                # 尝试删除可能已创建的文件
                output_file = Path(output_path)
                if output_file.exists():
                    try:
                        output_file.unlink()
                        logger.info(f"已删除取消的导出文件: {output_path}")
                    except Exception as e:
                        logger.warning(f"删除取消的导出文件失败: {e}")
                return {
                    "success": False,
                    "cancelled": True,
                    "output_path": output_path,
                    "source_name": source_name,
                    "source_type": source_type
                }
            
            # 检查文件是否成功创建
            output_file = Path(output_path)
            if output_file.exists():
                file_size = output_file.stat().st_size
                logger.info(f"导出成功: {output_path}, 文件大小: {file_size} 字节")
                
                return {
                    "success": True,
                    "output_path": str(output_file),
                    "file_size": file_size,
                    "sample_rate": sample_rate,
                    "bit_depth": bit_depth,
                    "format": file_format,
                    "source_name": source_name,
                    "source_type": source_type
                }
            else:
                raise Exception(f"导出文件未创建: {output_path}")
                
        except Exception as e:
            logger.error(f"导出音频失败: {e}")
            return {
                "success": False,
                "error": str(e),
                "output_path": output_path,
                "source_name": source_name,
                "source_type": source_type
            }
    
    async def get_session_length(self) -> float:
        """获取会话长度（秒）"""
        if not self.is_connected:
            raise ConnectionError("未连接到 Pro Tools")
        
        if not PTSL_AVAILABLE:
            return 180.0  # 模拟3分钟
        
        try:
            # 使用 py-ptsl Engine 获取会话长度
            length = await asyncio.to_thread(lambda: self.engine.session_length())
            return float(length)
        except Exception as e:
            logger.error(f"获取会话长度失败: {e}")
            return 0.0
    
    async def set_bounce_range(self, start_time: Optional[float] = None, end_time: Optional[float] = None) -> bool:
        """设置导出范围
        
        Args:
            start_time: 开始时间（秒），None表示从头开始
            end_time: 结束时间（秒），None表示到结尾
        """
        if not self.is_connected:
            raise ConnectionError("未连接到 Pro Tools")
        
        if not PTSL_AVAILABLE:
            logger.info(f"模拟模式：设置导出范围 {start_time} - {end_time}")
            return True
        
        try:
            # 如果没有指定范围，使用整个会话
            if start_time is None:
                start_time = 0.0
            if end_time is None:
                end_time = await self.get_session_length()
            
            # 使用 py-ptsl Engine 设置选择范围
            await asyncio.to_thread(
                self.engine.set_timeline_selection,
                start=start_time,
                end=end_time
            )
            
            logger.info(f"设置导出范围: {start_time:.2f}s - {end_time:.2f}s")
            return True
            
        except Exception as e:
            logger.error(f"设置导出范围失败: {e}")
            return False
    
    def cancel_export(self):
        """取消当前导出操作"""
        self._export_cancelled = True
        logger.info("导出取消请求已发送")
    
    def is_export_cancelled(self) -> bool:
        """检查导出是否已被取消"""
        return self._export_cancelled
