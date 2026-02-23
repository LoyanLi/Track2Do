#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
应用配置管理
"""

import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """应用配置类"""
    
    # 服务器配置
    HOST: str = Field(default="127.0.0.1", env="HOST")
    PORT: int = Field(default=8000, env="PORT")
    DEBUG: bool = Field(default=True, env="DEBUG")
    
    # PTSL 配置
    PTSL_HOST: str = Field(default="127.0.0.1", env="PTSL_HOST")
    PTSL_PORT: int = Field(default=31416, env="PTSL_PORT")
    PTSL_TIMEOUT: int = Field(default=30, env="PTSL_TIMEOUT")
    
    # Pro Tools 配置
    PROTOOLS_SESSION_PATH: str = Field(default="", env="PROTOOLS_SESSION_PATH")
    PROTOOLS_AUDIO_FORMAT: str = Field(default="WAV", env="PROTOOLS_AUDIO_FORMAT")
    PROTOOLS_SAMPLE_RATE: int = Field(default=48000, env="PROTOOLS_SAMPLE_RATE")
    PROTOOLS_BIT_DEPTH: int = Field(default=24, env="PROTOOLS_BIT_DEPTH")
    
    # 音频处理配置
    MAX_AUDIO_FILE_SIZE: int = Field(default=500 * 1024 * 1024, env="MAX_AUDIO_FILE_SIZE")  # 500MB
    SUPPORTED_AUDIO_FORMATS: str = Field(
        default="wav,aiff,mp3,flac,m4a",
        env="SUPPORTED_AUDIO_FORMATS"
    )
    
    # 输出目录配置
    OUTPUT_DIR: str = Field(default="./output", env="OUTPUT_DIR")
    TEMP_DIR: str = Field(default="./temp", env="TEMP_DIR")
    
    # STEM 分离配置
    STEM_TYPES: str = Field(
        default="drums,bass,vocals,other",
        env="STEM_TYPES"
    )
    STEM_QUALITY: str = Field(default="high", env="STEM_QUALITY")  # low, medium, high
    
    # 安全配置
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,file://",
        env="ALLOWED_ORIGINS"
    )
    
    @property
    def supported_audio_formats_list(self) -> List[str]:
        return self.SUPPORTED_AUDIO_FORMATS.split(",")
    
    @property
    def stem_types_list(self) -> List[str]:
        return self.STEM_TYPES.split(",")
    
    @property
    def allowed_origins_list(self) -> List[str]:
        return self.ALLOWED_ORIGINS.split(",")
    
    # 日志配置
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FILE: str = Field(default="logs/app.log", env="LOG_FILE")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# 创建全局配置实例
settings = Settings()


# 确保必要的目录存在
def ensure_directories():
    """确保必要的目录存在"""
    import os
    
    directories = [
        settings.OUTPUT_DIR,
        settings.TEMP_DIR,
        "logs"
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)


# 在模块加载时创建目录
ensure_directories()