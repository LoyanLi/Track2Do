import { Snapshot, Track, ConnectionStatus } from '../../types'
import { HttpClient } from './httpClient'
import { SessionApi } from './sessionApi'
import { ExportApi } from './exportApi'

class ApiService {
  private readonly http: HttpClient
  private readonly sessionApi: SessionApi
  private readonly exportApi: ExportApi

  constructor() {
    const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined
    const baseURL = isElectron ? 'http://127.0.0.1:8000' : ''

    this.http = new HttpClient(baseURL, isElectron)
    this.sessionApi = new SessionApi(this.http)
    this.exportApi = new ExportApi(this.http)
  }

  checkStatus(): Promise<ConnectionStatus> {
    return this.sessionApi.checkStatus()
  }

  getTracks(): Promise<Track[]> {
    return this.sessionApi.getTracks()
  }

  applySnapshot(snapshot: Snapshot): Promise<void> {
    return this.sessionApi.applySnapshot(snapshot)
  }

  getSnapshotInfo(snapshot: Snapshot): Promise<any> {
    return this.sessionApi.getSnapshotInfo(snapshot)
  }

  startExport(exportRequest: any): Promise<any> {
    return this.exportApi.startExport(exportRequest)
  }

  getExportStatus(taskId: string): Promise<any> {
    return this.exportApi.getExportStatus(taskId)
  }

  getExportTasks(): Promise<any> {
    return this.exportApi.getExportTasks()
  }

  stopExportTask(taskId: string): Promise<any> {
    return this.exportApi.stopExportTask(taskId)
  }

  deleteExportTask(taskId: string): Promise<any> {
    return this.exportApi.deleteExportTask(taskId)
  }

  createWebSocket(path: string): WebSocket {
    return this.http.createWebSocket(path)
  }
}

export const apiService = new ApiService()
export default apiService
