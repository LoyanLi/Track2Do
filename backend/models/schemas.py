#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API 数据模型定义
"""

from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, validator


# 导出相关的数据模型
class AudioFormat(str, Enum):
    """音频格式"""
    WAV = "wav"
    AIFF = "aiff"


class ExportType(str, Enum):
    """导出类型"""
    STEREO = "stereo"
    MONO = "mono"
    MULTI_CHANNEL = "multi_channel"


class MixSourceType(str, Enum):
    """混音源类型"""
    PHYSICAL_OUT = "PhysicalOut"
    BUS = "Bus"
    OUTPUT = "Output"


class ExportSettings(BaseModel):
    """导出设置"""
    file_format: AudioFormat = Field(default=AudioFormat.WAV, description="文件格式")
    mix_source_name: str = Field(description="混音源名称")
    mix_source_type: MixSourceType = Field(description="混音源类型")
    online_export: bool = Field(default=False, description="是否在线导出")
    file_prefix: str = Field(description="文件前缀")
    output_path: str = Field(description="输出路径")


# ExportRequest 将在 Snapshot 定义后再定义


class ExportProgress(BaseModel):
    """导出进度"""
    task_id: str = Field(description="任务ID")
    current_snapshot: int = Field(description="当前快照索引")
    total_snapshots: int = Field(description="总快照数")
    current_snapshot_name: str = Field(description="当前快照名称")
    progress_percentage: float = Field(description="进度百分比")
    status: str = Field(description="状态描述")
    estimated_time_remaining: Optional[float] = Field(None, description="预计剩余时间（秒）")


class ExportResult(BaseModel):
    """导出结果"""
    task_id: str = Field(description="任务ID")
    success: bool = Field(description="是否成功")
    exported_files: List[str] = Field(description="导出的文件路径列表")
    failed_snapshots: List[str] = Field(default_factory=list, description="失败的快照名称列表")
    total_duration: float = Field(description="总耗时（秒）")
    error_message: Optional[str] = Field(None, description="错误信息")


# ExportResponse 将在 BaseResponse 定义后再定义


class TransportState(str, Enum):
    """传输状态"""
    STOPPED = "stopped"
    PLAYING = "playing"
    RECORDING = "recording"
    PAUSED = "paused"


class TrackType(str, Enum):
    """轨道类型"""
    AUDIO = "audio"
    MIDI = "midi"
    AUX = "aux"
    MASTER = "master"
    INSTRUMENT = "instrument"


# 基础响应模型
class BaseResponse(BaseModel):
    """基础响应模型"""
    success: bool = Field(description="操作是否成功")
    message: str = Field(description="响应消息")
    timestamp: datetime = Field(default_factory=datetime.now, description="时间戳")


class ExportResponse(BaseResponse):
    """导出响应"""
    task_id: str = Field(description="任务ID")
    result: Optional[ExportResult] = Field(None, description="导出结果")


class ErrorResponse(BaseResponse):
    """错误响应模型"""
    success: bool = False
    error_code: Optional[str] = Field(None, description="错误代码")
    details: Optional[Dict[str, Any]] = Field(None, description="错误详情")


# 连接相关模型
class ConnectionRequest(BaseModel):
    """连接请求"""
    host: str = Field(default="127.0.0.1", description="Pro Tools 主机地址")
    port: int = Field(default=31416, description="PTSL 端口")
    timeout: int = Field(default=30, description="连接超时时间")


class ConnectionStatus(BaseModel):
    """连接状态"""
    connected: bool = Field(description="是否已连接")
    host: str = Field(description="主机地址")
    port: int = Field(description="端口")
    last_connected: Optional[datetime] = Field(None, description="最后连接时间")


# 会话相关模型
class SessionInfo(BaseModel):
    """会话信息"""
    session_name: str = Field(description="会话名称")
    session_path: str = Field(description="会话路径")
    sample_rate: int = Field(description="采样率")
    bit_depth: int = Field(description="位深度")
    is_playing: bool = Field(description="是否正在播放")
    is_recording: bool = Field(description="是否正在录音")
    transport_state: TransportState = Field(description="传输状态")
    duration: Optional[float] = Field(None, description="会话时长（秒）")
    created_at: Optional[datetime] = Field(None, description="创建时间")
    modified_at: Optional[datetime] = Field(None, description="修改时间")


# 轨道相关模型
class TrackInfo(BaseModel):
    """轨道信息"""
    id: str = Field(description="轨道ID")
    name: str = Field(description="轨道名称")
    type: TrackType = Field(description="轨道类型")
    is_muted: bool = Field(description="是否静音")
    is_soloed: bool = Field(description="是否独奏")
    is_record_enabled: bool = Field(default=False, description="是否启用录音")
    volume: float = Field(description="音量（dB）")
    pan: float = Field(description="声像（-100到100）")
    color: Optional[str] = Field(None, description="轨道颜色")
    comments: Optional[str] = Field(None, description="轨道备注")


class TrackListResponse(BaseResponse):
    """轨道列表响应"""
    tracks: List[TrackInfo] = Field(description="轨道列表")
    total_count: int = Field(description="轨道总数")


# 传输控制模型
class TransportRequest(BaseModel):
    """传输控制请求"""
    action: str = Field(description="操作类型：play, stop, record, pause")
    position: Optional[float] = Field(None, description="播放位置（秒）")


class TransportStatus(BaseModel):
    """传输状态"""
    state: TransportState = Field(description="当前状态")
    position: float = Field(description="当前位置（秒）")
    is_playing: bool = Field(description="是否正在播放")
    is_recording: bool = Field(description="是否正在录音")
    tempo: Optional[float] = Field(None, description="节拍（BPM）")








# 快照相关模型
class TrackState(BaseModel):
    """轨道状态"""
    trackId: str = Field(description="轨道ID")
    trackName: str = Field(description="轨道名称")
    is_soloed: bool = Field(description="是否独奏")
    is_muted: bool = Field(description="是否静音")
    type: TrackType = Field(description="轨道类型")
    color: Optional[str] = Field(None, description="轨道颜色")


class Snapshot(BaseModel):
    """快照模型"""
    id: str = Field(description="快照ID")
    name: str = Field(description="快照名称")
    trackStates: List[TrackState] = Field(description="轨道状态列表")
    createdAt: str = Field(description="创建时间")
    updatedAt: Optional[str] = Field(None, description="更新时间")


class ExportRequest(BaseModel):
    """导出请求"""
    snapshots: List[Snapshot] = Field(description="要导出的快照列表")
    export_settings: ExportSettings = Field(description="导出设置")
    start_time: Optional[float] = Field(None, description="开始时间（秒）")
    end_time: Optional[float] = Field(None, description="结束时间（秒）")


class ApplySnapshotRequest(BaseModel):
    """应用快照请求"""
    snapshot: Snapshot = Field(description="快照数据")
    restore_automation: bool = Field(default=True, description="是否恢复自动化")
    restore_plugins: bool = Field(default=True, description="是否恢复插件")
    restore_sends: bool = Field(default=True, description="是否恢复发送")


class SnapshotInfoResponse(BaseModel):
    """快照信息响应"""
    success: bool = Field(description="是否成功")
    message: str = Field(description="响应消息")
    snapshot: Optional[Snapshot] = Field(None, description="快照详细信息")
    statistics: Optional[Dict[str, int]] = Field(None, description="快照统计信息")


# 任务管理模型
class TaskStatus(str, Enum):
    """任务状态"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskInfo(BaseModel):
    """任务信息"""
    task_id: str = Field(description="任务ID")
    task_type: str = Field(description="任务类型")
    status: TaskStatus = Field(description="任务状态")
    progress: float = Field(default=0.0, description="进度百分比（0-100）")
    created_at: datetime = Field(description="创建时间")
    started_at: Optional[datetime] = Field(None, description="开始时间")
    completed_at: Optional[datetime] = Field(None, description="完成时间")
    error_message: Optional[str] = Field(None, description="错误信息")
    result: Optional[Dict[str, Any]] = Field(None, description="任务结果")
    result_summary: Optional[str] = Field(None, description="任务结果摘要")


class TaskListResponse(BaseResponse):
    """任务列表响应"""
    tasks: List[TaskInfo] = Field(description="任务列表")
    total_count: int = Field(description="任务总数")


# 文件管理模型
class FileInfo(BaseModel):
    """文件信息"""
    name: str = Field(description="文件名")
    path: str = Field(description="文件路径")
    size: int = Field(description="文件大小（字节）")
    type: str = Field(description="文件类型")
    created_at: datetime = Field(description="创建时间")
    modified_at: datetime = Field(description="修改时间")
    is_directory: bool = Field(description="是否为目录")


class FileListResponse(BaseResponse):
    """文件列表响应"""
    files: List[FileInfo] = Field(description="文件列表")
    current_path: str = Field(description="当前路径")
    total_count: int = Field(description="文件总数")


# 系统状态模型
class SystemStatus(BaseModel):
    """系统状态"""
    cpu_usage: float = Field(description="CPU 使用率")
    memory_usage: float = Field(description="内存使用率")
    disk_usage: float = Field(description="磁盘使用率")
    active_tasks: int = Field(description="活跃任务数")
    uptime: float = Field(description="运行时间（秒）")
    version: str = Field(description="系统版本")





class HealthCheckResponse(BaseResponse):
    """健康检查响应"""
    ptsl_connected: bool = Field(description="PTSL 连接状态")
    protools_version: Optional[str] = Field(None, description="Pro Tools 版本")
    system_status: SystemStatus = Field(description="系统状态")


# 导出相关模型
# 导出相关的请求和响应模型已移除