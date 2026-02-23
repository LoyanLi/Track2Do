#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API 路由定义
"""

import os
import uuid
import asyncio
import time
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request, Query
from fastapi.responses import FileResponse
from loguru import logger

from models.schemas import (
    BaseResponse, ErrorResponse,
    ConnectionRequest, ConnectionStatus,
    SessionInfo, TrackInfo, TrackListResponse,
    TransportRequest, TransportStatus,
    TaskInfo, TaskListResponse,
    FileInfo, FileListResponse,
    HealthCheckResponse, SystemStatus,
    ApplySnapshotRequest, Snapshot, TrackState, SnapshotInfoResponse,
    ExportRequest, ExportSettings, ExportProgress, ExportResult, ExportResponse,
    AudioFormat, ExportType
)
from core.ptsl_client import PTSLClient
from core.config import settings

# 导出任务存储
export_tasks: Dict[str, Dict[str, Any]] = {}
export_executor = ThreadPoolExecutor(max_workers=1)  # 限制同时只能有一个导出任务

# 创建路由器
router = APIRouter()

# 任务存储（生产环境中应使用数据库）
tasks_storage: Dict[str, TaskInfo] = {}


def get_ptsl_client(request: Request) -> PTSLClient:
    """获取 PTSL 客户端依赖"""
    client = getattr(request.app.state, 'ptsl_client', None)
    if not client:
        raise HTTPException(status_code=503, detail="PTSL 客户端未初始化")
    return client


# 连接管理端点
@router.post("/connection/connect", response_model=BaseResponse)
async def connect_to_protools(
    request: ConnectionRequest,
    ptsl_client: PTSLClient = Depends(get_ptsl_client)
):
    """连接到 Pro Tools"""
    try:
        # 如果已连接，先断开
        if ptsl_client.is_connected:
            await ptsl_client.disconnect()
        
        # 更新连接参数
        ptsl_client.host = request.host
        ptsl_client.port = request.port
        ptsl_client.timeout = request.timeout
        
        # 尝试连接
        success = await ptsl_client.connect()
        
        if success:
            return BaseResponse(
                success=True,
                message=f"已成功连接到 Pro Tools ({request.host}:{request.port})"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="连接 Pro Tools 失败"
            )
            
    except Exception as e:
        logger.error(f"连接失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 导出相关端点

async def execute_export_task(task_id: str, export_request: ExportRequest, ptsl_client: PTSLClient):
    """执行导出任务的后台函数"""
    start_time = time.time()
    exported_files = []
    failed_snapshots = []
    
    try:
        # 更新任务状态为运行中
        export_tasks[task_id].update({
            "status": "running",
            "started_at": datetime.now(),
            "progress": 0.0
        })
        
        snapshots = export_request.snapshots
        settings = export_request.export_settings
        total_snapshots = len(snapshots)
        
        logger.info(f"开始导出任务 {task_id}，共 {total_snapshots} 个快照")
        
        # 设置导出范围
        if export_request.start_time is not None or export_request.end_time is not None:
            await ptsl_client.set_bounce_range(export_request.start_time, export_request.end_time)
        
        # 逐个处理快照
        for i, snapshot in enumerate(snapshots):
            # 检查任务是否被取消
            if export_tasks[task_id].get("status") == "cancelled":
                logger.info(f"导出任务 {task_id} 被取消")
                export_tasks[task_id].update({
                    "status": "cancelled",
                    "completed_at": datetime.now(),
                    "result": {
                        "success": False,
                        "exported_files": exported_files,
                        "failed_snapshots": failed_snapshots,
                        "total_duration": time.time() - start_time,
                        "error_message": "导出任务被用户取消"
                    }
                })
                return
            
            try:
                # 更新进度
                progress = (i / total_snapshots) * 100
                export_tasks[task_id].update({
                    "progress": progress,
                    "current_snapshot": i + 1,
                    "current_snapshot_name": snapshot.name,
                    "status": "running"
                })
                
                logger.info(f"处理快照 {i+1}/{total_snapshots}: {snapshot.name}")
                
                # 1. 应用快照
                snapshot_data = {"snapshot": snapshot.dict()}
                apply_result = await ptsl_client.apply_snapshot(snapshot_data)
                
                if not apply_result.get("success", False):
                    error_msg = f"应用快照失败: {', '.join(apply_result.get('errors', []))}"
                    logger.error(error_msg)
                    failed_snapshots.append(snapshot.name)
                    continue
                
                # 检查任务是否被取消
                if export_tasks[task_id].get("status") == "cancelled":
                    logger.info(f"导出任务 {task_id} 在应用快照后被取消")
                    export_tasks[task_id].update({
                        "status": "cancelled",
                        "completed_at": datetime.now(),
                        "result": {
                            "success": False,
                            "exported_files": exported_files,
                            "failed_snapshots": failed_snapshots,
                            "total_duration": time.time() - start_time,
                            "error_message": "导出任务被用户取消"
                        }
                    })
                    return
                
                # 等待一下确保状态应用完成
                await asyncio.sleep(0.5)
                
                # 2. 生成导出文件名（直接导出到Pro Tools工程文件夹的Bounced Files目录）
                session_info = await ptsl_client.get_session_info()
                session_path = session_info.get('session_path', '/tmp')
                
                # 确定Pro Tools工程文件夹的Bounced Files目录
                project_dir = os.path.dirname(session_path) if session_path else '/tmp'
                bounced_files_dir = os.path.join(project_dir, 'Bounced Files')
                
                # 确保Bounced Files目录存在
                try:
                    os.makedirs(bounced_files_dir, exist_ok=True)
                    if not os.access(bounced_files_dir, os.W_OK):
                        raise PermissionError(f"Bounced Files目录不可写: {bounced_files_dir}")
                    logger.info(f"使用Bounced Files目录: {bounced_files_dir}")
                except Exception as dir_error:
                    logger.error(f"创建Bounced Files目录失败: {dir_error}")
                    failed_snapshots.append(snapshot.name)
                    continue
                
                # 临时导出文件名（在Bounced Files目录中）
                temp_file_name = f"temp_export_{snapshot.name}_{int(time.time())}"
                safe_temp_name = "".join(c for c in temp_file_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
                temp_output_path = os.path.join(
                    bounced_files_dir,
                    f"{safe_temp_name}.{settings.file_format.value}"
                )
                
                # 最终文件名和路径
                final_file_name = f"{settings.file_prefix}{snapshot.name}"
                safe_final_name = "".join(c for c in final_file_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
                final_output_path = os.path.join(
                    settings.output_path,
                    f"{safe_final_name}.{settings.file_format.value}"
                )
                
                # 确保最终目标目录存在
                try:
                    os.makedirs(os.path.dirname(final_output_path), exist_ok=True)
                    logger.info(f"目标输出路径: {final_output_path}")
                except Exception as dir_error:
                    logger.error(f"创建目标目录失败: {dir_error}")
                    failed_snapshots.append(snapshot.name)
                    continue
                
                # 检查任务是否被取消（在开始导出前）
                if export_tasks[task_id].get("status") == "cancelled":
                    logger.info(f"导出任务 {task_id} 在开始导出前被取消")
                    export_tasks[task_id].update({
                        "status": "cancelled",
                        "completed_at": datetime.now(),
                        "result": {
                            "success": False,
                            "exported_files": exported_files,
                            "failed_snapshots": failed_snapshots,
                            "total_duration": time.time() - start_time,
                            "error_message": "导出任务被用户取消"
                        }
                    })
                    return
                
                # 3. 执行导出到Bounced Files目录
                logger.info(f"开始导出快照 {snapshot.name} 到: {temp_output_path}")
                bounce_result = await ptsl_client.export_mix_with_source(
                    output_path=temp_output_path,
                    source_name=settings.mix_source_name,
                    source_type=settings.mix_source_type.value,
                    file_format=settings.file_format.value,
                    offline_bounce=not settings.online_export
                )
                
                # 检查导出是否被取消
                if bounce_result.get("cancelled", False):
                    logger.info(f"快照 {snapshot.name} 导出被取消")
                    export_tasks[task_id].update({
                        "status": "cancelled",
                        "completed_at": datetime.now(),
                        "result": {
                            "success": False,
                            "exported_files": exported_files,
                            "failed_snapshots": failed_snapshots,
                            "total_duration": time.time() - start_time,
                            "error_message": "导出任务被用户取消"
                        }
                    })
                    return
                
                # 检查任务是否被取消（在导出完成后）
                if export_tasks[task_id].get("status") == "cancelled":
                    logger.info(f"导出任务 {task_id} 在导出完成后被取消")
                    # 如果导出文件已经创建，删除它
                    if os.path.exists(temp_output_path):
                        try:
                            os.remove(temp_output_path)
                            logger.info(f"已删除取消任务的临时文件: {temp_output_path}")
                        except Exception as cleanup_error:
                            logger.error(f"删除临时文件失败: {cleanup_error}")
                    
                    export_tasks[task_id].update({
                        "status": "cancelled",
                        "completed_at": datetime.now(),
                        "result": {
                            "success": False,
                            "exported_files": exported_files,
                            "failed_snapshots": failed_snapshots,
                            "total_duration": time.time() - start_time,
                            "error_message": "导出任务被用户取消"
                        }
                    })
                    return
                
                if bounce_result.get("success", False):
                    # 4. 导出成功，立即移动文件到目标位置并重命名
                    try:
                        # 检查导出的临时文件是否存在
                        if os.path.exists(temp_output_path):
                            file_size = os.path.getsize(temp_output_path)
                            logger.info(f"导出文件创建成功: {temp_output_path}，大小: {file_size} 字节")
                            
                            # 立即移动文件到目标位置并重命名
                            import shutil
                            shutil.move(temp_output_path, final_output_path)
                            exported_files.append(final_output_path)
                            logger.info(f"快照 {snapshot.name} 导出并移动成功: {final_output_path}")
                            
                            # 更新任务状态，显示当前完成的文件
                            export_tasks[task_id].update({
                                "last_exported_file": final_output_path,
                                "exported_count": len(exported_files),
                                "status": "running"
                            })
                            
                        else:
                            # 导出文件不存在，提供详细的诊断信息
                            logger.error(f"导出文件不存在: {temp_output_path}")
                            logger.error(f"Bounced Files目录内容: {list(os.listdir(bounced_files_dir)) if os.path.exists(bounced_files_dir) else '目录不存在'}")
                            logger.error(f"Pro Tools 导出结果: {bounce_result}")
                            failed_snapshots.append(snapshot.name)
                            
                    except Exception as move_error:
                        logger.error(f"移动文件失败 {temp_output_path} -> {final_output_path}: {move_error}")
                        failed_snapshots.append(snapshot.name)
                        
                else:
                    error_msg = bounce_result.get("error", "未知错误")
                    logger.error(f"快照 {snapshot.name} 导出失败: {error_msg}")
                    failed_snapshots.append(snapshot.name)
                    
                # 5. 短暂等待，确保文件系统操作完成，然后继续下一个快照
                await asyncio.sleep(0.2)
                
            except Exception as e:
                logger.error(f"处理快照 {snapshot.name} 时发生错误: {e}")
                failed_snapshots.append(snapshot.name)
        
        # 计算总耗时
        total_duration = time.time() - start_time
        
        # 更新任务完成状态
        success = len(failed_snapshots) == 0
        export_tasks[task_id].update({
            "status": "completed" if success else "completed_with_errors",
            "completed_at": datetime.now(),
            "progress": 100.0,
            "result": {
                "success": success,
                "exported_files": exported_files,
                "failed_snapshots": failed_snapshots,
                "total_duration": total_duration,
                "error_message": f"部分快照导出失败: {', '.join(failed_snapshots)}" if failed_snapshots else None
            }
        })
        
        logger.info(f"导出任务 {task_id} 完成，成功: {len(exported_files)}, 失败: {len(failed_snapshots)}")
        
    except Exception as e:
        # 任务执行失败
        logger.error(f"导出任务 {task_id} 执行失败: {e}")
        export_tasks[task_id].update({
            "status": "failed",
            "completed_at": datetime.now(),
            "result": {
                "success": False,
                "exported_files": exported_files,
                "failed_snapshots": failed_snapshots,
                "total_duration": time.time() - start_time,
                "error_message": str(e)
            }
        })


@router.post("/export/start", response_model=ExportResponse)
async def start_export(
    export_request: ExportRequest,
    background_tasks: BackgroundTasks,
    ptsl_client: PTSLClient = Depends(get_ptsl_client)
):
    """开始导出任务"""
    try:
        if not ptsl_client.is_connected:
            raise HTTPException(status_code=503, detail="未连接到 Pro Tools")
        
        # 验证导出设置
        if not export_request.snapshots:
            raise HTTPException(status_code=400, detail="没有选择要导出的快照")
        
        # 检查输出路径
        output_dir = Path(export_request.export_settings.output_path)
        if not output_dir.exists():
            try:
                output_dir.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"无法创建输出目录: {e}")
        
        # 验证混音源设置
        if not export_request.export_settings.mix_source_name:
            raise HTTPException(status_code=400, detail="混音源名称不能为空")
        
        if not export_request.export_settings.file_prefix:
            raise HTTPException(status_code=400, detail="文件前缀不能为空")
        
        # 生成任务ID
        task_id = f"export_{uuid.uuid4().hex[:8]}_{int(time.time())}"
        
        # 创建任务记录
        export_tasks[task_id] = {
            "task_id": task_id,
            "status": "pending",
            "created_at": datetime.now(),
            "snapshots_count": len(export_request.snapshots),
            "export_settings": export_request.export_settings.dict(),
            "progress": 0.0,
            "current_snapshot": 0,
            "current_snapshot_name": "",
            "result": None
        }
        
        # 启动后台任务
        background_tasks.add_task(execute_export_task, task_id, export_request, ptsl_client)
        
        logger.info(f"导出任务 {task_id} 已启动，快照数量: {len(export_request.snapshots)}")
        
        return ExportResponse(
            success=True,
            message=f"导出任务已启动，任务ID: {task_id}",
            task_id=task_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"启动导出任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export/direct", response_model=BaseResponse)
async def direct_export(
    export_settings: ExportSettings,
    ptsl_client: PTSLClient = Depends(get_ptsl_client)
):
    """直接导出当前状态的音频（不处理快照）"""
    try:
        if not ptsl_client.is_connected:
            raise HTTPException(status_code=503, detail="未连接到 Pro Tools")
        
        # 生成唯一的文件名
        timestamp = int(time.time())
        filename = f"{export_settings.file_prefix}direct_export_{timestamp}.{export_settings.file_format.value}"
        output_path = os.path.join(export_settings.output_path, filename)
        
        logger.info(f"开始直接导出: {output_path}")
        
        # 执行直接导出
        result = await ptsl_client.export_mix_with_source(
            output_path=output_path,
            source_name=export_settings.mix_source_name,
            source_type=export_settings.mix_source_type.value,
            file_format=export_settings.file_format.value,
            offline_bounce=not export_settings.online_export
        )
        
        logger.info(f"直接导出完成: {output_path}")
        
        return BaseResponse(
            success=True,
            message="直接导出完成"
        )
        
    except Exception as e:
        logger.error(f"直接导出失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/status/{task_id}")
async def get_export_status(task_id: str):
    """获取导出任务状态"""
    if task_id not in export_tasks:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    task_info = export_tasks[task_id]
    
    # 构建进度信息
    progress_info = {
        "task_id": task_id,
        "status": task_info["status"],
        "progress": task_info["progress"],
        "current_snapshot": task_info.get("current_snapshot", 0),
        "total_snapshots": task_info["snapshots_count"],
        "current_snapshot_name": task_info.get("current_snapshot_name", ""),
        "created_at": task_info["created_at"],
        "started_at": task_info.get("started_at"),
        "completed_at": task_info.get("completed_at"),
        "result": task_info.get("result")
    }
    
    return {
        "success": True,
        "message": "获取任务状态成功",
        "timestamp": datetime.now().isoformat(),
        "data": progress_info
    }


@router.get("/export/tasks")
async def list_export_tasks():
    """获取所有导出任务列表"""
    tasks = []
    for task_id, task_info in export_tasks.items():
        tasks.append({
            "task_id": task_id,
            "status": task_info["status"],
            "progress": task_info["progress"],
            "snapshots_count": task_info["snapshots_count"],
            "created_at": task_info["created_at"],
            "completed_at": task_info.get("completed_at")
        })
    
    # 按创建时间倒序排列
    tasks.sort(key=lambda x: x["created_at"], reverse=True)
    
    return {
        "success": True,
        "message": "获取任务列表成功",
        "timestamp": datetime.now().isoformat(),
        "data": {"tasks": tasks, "total_count": len(tasks)}
    }


@router.post("/export/stop/{task_id}")
async def stop_export_task(
    task_id: str,
    ptsl_client: PTSLClient = Depends(get_ptsl_client)
):
    """停止导出任务"""
    if task_id not in export_tasks:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    task_info = export_tasks[task_id]
    if task_info["status"] not in ["running", "pending"]:
        raise HTTPException(status_code=400, detail="任务不在运行状态，无法停止")
    
    # 标记任务为取消状态
    export_tasks[task_id]["status"] = "cancelled"
    
    # 通知PTSL客户端取消当前导出
    ptsl_client.cancel_export()
    
    logger.info(f"导出任务 {task_id} 被标记为取消，已通知Pro Tools停止导出")
    
    return BaseResponse(
        success=True,
        message="导出任务已停止"
    )


@router.delete("/export/tasks/{task_id}")
async def delete_export_task(task_id: str):
    """删除导出任务记录"""
    if task_id not in export_tasks:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    task_info = export_tasks[task_id]
    if task_info["status"] == "running":
        raise HTTPException(status_code=400, detail="无法删除正在运行的任务")
    
    del export_tasks[task_id]
    
    return BaseResponse(
        success=True,
        message="任务删除成功"
    )


async def apply_snapshot_states(ptsl_client: PTSLClient, track_states: List[TrackState]):
    """应用快照的轨道状态（带状态预检查优化）"""
    try:
        # 获取当前轨道列表
        tracks = await ptsl_client.get_track_list()
        if not tracks:
            raise Exception("无法获取轨道列表")
        
        # 创建轨道名称到轨道的映射
        track_map = {track['name']: track for track in tracks}
        
        # 分别处理静音和独奏状态，只修改状态不同的轨道
        muted_tracks = []
        unmuted_tracks = []
        soloed_tracks = []
        unsoloed_tracks = []
        skipped_tracks = []
        
        # 状态预检查和分类
        for track_state in track_states:
            track_name = track_state.trackName
            target_muted = track_state.is_muted
            target_soloed = track_state.is_soloed
            
            if track_name not in track_map:
                logger.warning(f"轨道 {track_name} 不存在，跳过")
                continue
            
            current_track = track_map[track_name]
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
        
        logger.info(f"导出状态检查完成 - 需要修改静音: {len(muted_tracks + unmuted_tracks)} 个轨道, 需要修改独奏: {len(soloed_tracks + unsoloed_tracks)} 个轨道, 跳过: {len(skipped_tracks)} 个轨道")
        
        # 应用静音状态
        for track_name in muted_tracks:
            await ptsl_client.set_track_mute_state([track_name], True)
            
        for track_name in unmuted_tracks:
            await ptsl_client.set_track_mute_state([track_name], False)
        
        # 应用独奏状态
        for track_name in soloed_tracks:
            await ptsl_client.set_track_solo_state([track_name], True)
            
        for track_name in unsoloed_tracks:
            await ptsl_client.set_track_solo_state([track_name], False)
        
        total_modified = len(muted_tracks) + len(unmuted_tracks) + len(soloed_tracks) + len(unsoloed_tracks)
        logger.info(f"导出状态应用完成 - 成功修改: {total_modified} 个轨道状态, 跳过: {len(skipped_tracks)} 个轨道")
        
    except Exception as e:
        logger.error(f"应用轨道状态失败: {e}")
        raise


# 导出任务状态端点已移除


@router.post("/connection/disconnect", response_model=BaseResponse)
async def disconnect_from_protools(
    ptsl_client: PTSLClient = Depends(get_ptsl_client)
):
    """断开 Pro Tools 连接"""
    try:
        await ptsl_client.disconnect()
        return BaseResponse(
            success=True,
            message="已断开 Pro Tools 连接"
        )
    except Exception as e:
        logger.error(f"断开连接失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/connection/status", response_model=ConnectionStatus)
async def get_connection_status(
    ptsl_client: PTSLClient = Depends(get_ptsl_client)
):
    """获取连接状态"""
    return ConnectionStatus(
        connected=ptsl_client.is_connected,
        host=ptsl_client.host,
        port=ptsl_client.port,
        last_connected=datetime.now() if ptsl_client.is_connected else None
    )


# 会话管理端点
@router.get("/session/info", response_model=SessionInfo)
async def get_session_info(
    ptsl_client: PTSLClient = Depends(get_ptsl_client)
):
    """获取会话信息"""
    try:
        if not ptsl_client.is_connected:
            raise HTTPException(status_code=503, detail="未连接到 Pro Tools")
        
        session_data = await ptsl_client.get_session_info()
        
        # 确定传输状态
        transport_state = "stopped"
        if session_data.get("is_recording"):
            transport_state = "recording"
        elif session_data.get("is_playing"):
            transport_state = "playing"
        
        return SessionInfo(
            session_name=session_data.get("session_name", ""),
            session_path=session_data.get("session_path", ""),
            sample_rate=session_data.get("sample_rate", 48000),
            bit_depth=session_data.get("bit_depth", 24),
            is_playing=session_data.get("is_playing", False),
            is_recording=session_data.get("is_recording", False),
            transport_state=transport_state
        )
        
    except Exception as e:
        if "Connection refused" in str(e) or "UNAVAILABLE" in str(e):
            error_msg = "Pro Tools 未运行或 PTSL 服务未启用。请启动 Pro Tools 并在偏好设置中启用 PTSL 服务。"
        elif "未连接到 Pro Tools" in str(e):
            error_msg = "未连接到 Pro Tools。请检查连接状态。"
        else:
            error_msg = str(e)
        logger.error(f"获取会话信息失败: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)


# 轨道管理端点
@router.get("/tracks", response_model=TrackListResponse)
async def get_tracks(
    ptsl_client: PTSLClient = Depends(get_ptsl_client)
):
    """获取轨道列表"""
    try:
        if not ptsl_client.is_connected:
            raise HTTPException(status_code=503, detail="未连接到 Pro Tools")
        
        tracks_data = await ptsl_client.get_track_list()
        
        tracks = []
        for track_data in tracks_data:
            track = TrackInfo(
                id=track_data.get("id", ""),
                name=track_data.get("name", ""),
                type=track_data.get("type", "audio"),
                is_muted=track_data.get("is_muted", False),
                is_soloed=track_data.get("is_soloed", False),
                is_record_enabled=track_data.get("is_record_enabled", False),
                volume=track_data.get("volume", 0.0),
                pan=track_data.get("pan", 0.0),
                color=track_data.get("color"),
                comments=track_data.get("comments")
            )
            tracks.append(track)
        
        return TrackListResponse(
            success=True,
            message="获取轨道列表成功",
            tracks=tracks,
            total_count=len(tracks)
        )
        
    except Exception as e:
        logger.error(f"获取轨道列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 传输控制端点
@router.post("/transport/play", response_model=BaseResponse)
async def play(
    ptsl_client: PTSLClient = Depends(get_ptsl_client)
):
    """开始播放"""
    try:
        if not ptsl_client.is_connected:
            raise HTTPException(status_code=503, detail="未连接到 Pro Tools")
        
        success = await ptsl_client.play()
        if success:
            return BaseResponse(success=True, message="开始播放")
        else:
            raise HTTPException(status_code=500, detail="播放失败")
            
    except Exception as e:
        logger.error(f"播放失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transport/stop", response_model=BaseResponse)
async def stop(
    ptsl_client: PTSLClient = Depends(get_ptsl_client)
):
    """停止播放"""
    try:
        if not ptsl_client.is_connected:
            raise HTTPException(status_code=503, detail="未连接到 Pro Tools")
        
        success = await ptsl_client.stop()
        if success:
            return BaseResponse(success=True, message="停止播放")
        else:
            raise HTTPException(status_code=500, detail="停止失败")
            
    except Exception as e:
        logger.error(f"停止失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transport/record", response_model=BaseResponse)
async def record(
    ptsl_client: PTSLClient = Depends(get_ptsl_client)
):
    """开始录音"""
    try:
        if not ptsl_client.is_connected:
            raise HTTPException(status_code=503, detail="未连接到 Pro Tools")
        
        success = await ptsl_client.record()
        if success:
            return BaseResponse(success=True, message="开始录音")
        else:
            raise HTTPException(status_code=500, detail="录音失败")
            
    except Exception as e:
        logger.error(f"录音失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transport/status", response_model=TransportStatus)
async def get_transport_status(
    ptsl_client: PTSLClient = Depends(get_ptsl_client)
):
    """获取传输状态"""
    try:
        if not ptsl_client.is_connected:
            raise HTTPException(status_code=503, detail="未连接到 Pro Tools")
        
        is_playing = await ptsl_client.is_playing()
        is_recording = await ptsl_client.is_recording()
        
        # 确定状态
        state = "stopped"
        if is_recording:
            state = "recording"
        elif is_playing:
            state = "playing"
        
        return TransportStatus(
            state=state,
            position=0.0,  # 需要从 PTSL 获取实际位置
            is_playing=is_playing,
            is_recording=is_recording
        )
        
    except Exception as e:
        logger.error(f"获取传输状态失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 快照管理端点
@router.post("/session/apply-snapshot", response_model=BaseResponse)
async def apply_snapshot(
    request: ApplySnapshotRequest,
    ptsl_client: PTSLClient = Depends(get_ptsl_client)
):
    """应用快照到Pro Tools"""
    try:
        if not ptsl_client.is_connected:
            raise HTTPException(status_code=503, detail="未连接到 Pro Tools")
        
        # 将请求转换为字典格式
        snapshot_data = request.dict()
        
        result = await ptsl_client.apply_snapshot(snapshot_data)
        
        if result["success"]:
            skipped_count = result.get("skipped_count", 0)
            if result["error_count"] > 0:
                message = f"快照 '{request.snapshot.name}' 已应用到Pro Tools，但有部分轨道设置失败。成功: {result['success_count']}, 失败: {result['error_count']}, 跳过: {skipped_count}"
            else:
                if skipped_count > 0:
                    message = f"快照 '{request.snapshot.name}' 已成功应用到Pro Tools。成功设置: {result['success_count']}, 跳过: {skipped_count} 个轨道状态（状态已一致）"
                else:
                    message = f"快照 '{request.snapshot.name}' 已成功应用到Pro Tools，共设置 {result['success_count']} 个轨道状态"
            
            return BaseResponse(
                success=True,
                message=message
            )
        else:
            raise HTTPException(status_code=500, detail=f"应用快照失败: {', '.join(result['errors'])}")
            
    except Exception as e:
        logger.error(f"应用快照失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/snapshot-info", response_model=SnapshotInfoResponse)
async def get_snapshot_info(
    snapshot_data: str = Query(..., description="快照数据的JSON字符串")
):
    """获取快照详细信息和统计数据"""
    try:
        import json
        
        # 解析快照数据
        snapshot_dict = json.loads(snapshot_data)
        snapshot = Snapshot(**snapshot_dict)
        
        # 计算统计信息
        track_states = snapshot.trackStates
        statistics = {
            "total_tracks": len(track_states),
            "muted_tracks": len([t for t in track_states if t.is_muted]),
            "soloed_tracks": len([t for t in track_states if t.is_soloed]),
            "normal_tracks": len([t for t in track_states if not t.is_muted and not t.is_soloed])
        }
        
        return SnapshotInfoResponse(
            success=True,
            message="快照信息获取成功",
            snapshot=snapshot,
            statistics=statistics
        )
        
    except json.JSONDecodeError as e:
        logger.error(f"快照数据解析失败: {e}")
        raise HTTPException(status_code=400, detail="快照数据格式错误")
    except Exception as e:
        logger.error(f"获取快照信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 导出功能已移除 - 等待重新实现


# STEM分离功能已移除 - 等待重新实现


# 文件管理端点
@router.get("/files", response_model=FileListResponse)
async def list_files(path: str = "."):
    """列出文件"""
    try:
        file_path = Path(path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="路径不存在")
        
        files = []
        if file_path.is_dir():
            for item in file_path.iterdir():
                stat = item.stat()
                file_info = FileInfo(
                    name=item.name,
                    path=str(item),
                    size=stat.st_size,
                    type=item.suffix.lower() if item.is_file() else "directory",
                    created_at=datetime.fromtimestamp(stat.st_ctime),
                    modified_at=datetime.fromtimestamp(stat.st_mtime),
                    is_directory=item.is_dir()
                )
                files.append(file_info)
        
        return FileListResponse(
            success=True,
            message="获取文件列表成功",
            files=files,
            current_path=str(file_path),
            total_count=len(files)
        )
        
    except Exception as e:
        logger.error(f"获取文件列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files/download")
async def download_file(file_path: str):
    """下载文件"""
    try:
        path = Path(file_path)
        if not path.exists() or not path.is_file():
            raise HTTPException(status_code=404, detail="文件不存在")
        
        return FileResponse(
            path=str(path),
            filename=path.name,
            media_type='application/octet-stream'
        )
        
    except Exception as e:
        logger.error(f"下载文件失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 系统状态端点
@router.get("/system/health", response_model=HealthCheckResponse)
async def health_check(
    request: Request
):
    """系统健康检查"""
    try:
        ptsl_client = getattr(request.app.state, 'ptsl_client', None)
        ptsl_connected = ptsl_client is not None and ptsl_client.is_connected
        
        # 获取系统状态（简化版本）
        system_status = SystemStatus(
            cpu_usage=0.0,  # 需要实际实现
            memory_usage=0.0,  # 需要实际实现
            disk_usage=0.0,  # 需要实际实现
            active_tasks=len(tasks_storage),
            uptime=0.0,  # 需要实际实现
            version="1.0.0"
        )
        
        return HealthCheckResponse(
            success=True,
            message="系统运行正常",
            ptsl_connected=ptsl_connected,
            system_status=system_status
        )
        
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))