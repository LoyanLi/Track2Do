import { Snapshot } from '../types'
import { apiService } from '../services/api'

/**
 * 快照管理器 - 负责快照数据的持久化存储
 * 自动保存到Pro Tools工程文件夹中的snapshot目录
 */
export class SnapshotManager {
  private static readonly SNAPSHOTS_FILE_NAME = 'snapshots.json'
  private static readonly SNAPSHOT_FOLDER_NAME = 'snapshots'
  
  /**
   * 检查是否在Electron环境中
   */
  private static isElectronEnvironment(): boolean {
    return typeof window !== 'undefined' && window.electronAPI !== undefined
  }

  /**
   * 获取Pro Tools工程路径
   */
  private static async getProToolsProjectPath(): Promise<string | null> {
    try {
      const status = await apiService.checkStatus()
      if (status.isConnected && status.sessionPath) {
        // 从session文件路径获取工程目录
        // 例如: /Users/user/Documents/MyProject/MyProject.ptx -> /Users/user/Documents/MyProject
        const sessionPath = status.sessionPath
        const lastSlashIndex = sessionPath.lastIndexOf('/')
        if (lastSlashIndex > 0) {
          return sessionPath.substring(0, lastSlashIndex)
        }
      }
      return null
    } catch (error) {
      console.error('Failed to get Pro Tools project path:', error)
      return null
    }
  }

  /**
   * 获取快照存储目录路径
   */
  private static async getSnapshotStoragePath(): Promise<string | null> {
    const projectPath = await this.getProToolsProjectPath()
    if (!projectPath) {
      return null
    }
    return `${projectPath}/${this.SNAPSHOT_FOLDER_NAME}`
  }

  /**
   * 获取快照文件完整路径
   */
  private static async getSnapshotFilePath(): Promise<string | null> {
    const storagePath = await this.getSnapshotStoragePath()
    if (!storagePath) {
      return null
    }
    return `${storagePath}/${this.SNAPSHOTS_FILE_NAME}`
  }

  /**
   * 从文件系统加载快照数据
   */
  static async loadSnapshots(): Promise<Snapshot[]> {
    if (!this.isElectronEnvironment()) {
      console.warn('快照功能仅在Electron环境中可用')
      return []
    }

    try {
      const filePath = await this.getSnapshotFilePath()
      if (!filePath) {
        console.warn('无法获取Pro Tools工程路径')
        return []
      }

      const content = await (window.electronAPI as any).fs.readFile(filePath)
      if (content) {
        const snapshots = JSON.parse(content) as Snapshot[]
        console.log(`从文件加载了 ${snapshots.length} 个快照: ${filePath}`)
        return snapshots
      }
    } catch (error) {
      console.error('从文件加载快照失败:', error)
    }

    return []
  }

  /**
   * 保存快照数据到文件系统
   */
  static async saveSnapshots(snapshots: Snapshot[]): Promise<boolean> {
    if (!this.isElectronEnvironment()) {
      console.warn('快照功能仅在Electron环境中可用')
      return false
    }

    try {
      const filePath = await this.getSnapshotFilePath()
      if (!filePath) {
        console.warn('无法获取Pro Tools工程路径')
        return false
      }

      // 确保目录存在
      const storagePath = await this.getSnapshotStoragePath()
      if (storagePath) {
        await (window.electronAPI as any).fs.ensureDir(storagePath)
      }

      // 保存到文件
      const content = JSON.stringify(snapshots, null, 2)
      const success = await (window.electronAPI as any).fs.writeFile(filePath, content)
      
      if (success) {
        console.log(`快照已保存到文件: ${filePath} (${snapshots.length} 个快照)`)
        return true
      }
    } catch (error) {
      console.error('保存快照到文件失败:', error)
    }

    return false
  }


  /**
   * 清除所有快照数据
   */
  static async clearAllSnapshots(): Promise<boolean> {
    if (!this.isElectronEnvironment()) {
      console.warn('快照功能仅在Electron环境中可用')
      return false
    }

    try {
      const filePath = await this.getSnapshotFilePath()
      if (filePath) {
        // 注意：这里我们不删除文件，而是写入空数组
        // 因为删除文件可能需要额外的权限处理
        await (window.electronAPI as any).fs.writeFile(filePath, JSON.stringify([]))
        return true
      }
    } catch (error) {
      console.error('清除快照数据失败:', error)
    }
    return false
  }

  /**
   * 获取当前存储状态信息
   */
  static async getStorageInfo(): Promise<{
    isElectron: boolean
    projectPath: string | null
    snapshotPath: string | null
  }> {
    const isElectron = this.isElectronEnvironment()
    const projectPath = isElectron ? await this.getProToolsProjectPath() : null
    const snapshotPath = isElectron ? await this.getSnapshotFilePath() : null

    return {
      isElectron,
      projectPath,
      snapshotPath
    }
  }
}