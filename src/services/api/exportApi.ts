import { HttpClient } from './httpClient'

export class ExportApi {
  constructor(private readonly http: HttpClient) {}

  async startExport(exportRequest: any): Promise<any> {
    try {
      return await this.http.request('POST', '/api/v1/export/start', exportRequest)
    } catch (error) {
      console.error('Failed to start export:', error)
      throw new Error('Failed to start export task')
    }
  }

  async getExportStatus(taskId: string): Promise<any> {
    try {
      return await this.http.request('GET', `/api/v1/export/status/${taskId}`)
    } catch (error) {
      console.error('Failed to get export status:', error)
      throw new Error('Failed to get export status')
    }
  }

  async getExportTasks(): Promise<any> {
    try {
      return await this.http.request('GET', '/api/v1/export/tasks')
    } catch (error) {
      console.error('Failed to get export tasks:', error)
      throw new Error('Failed to get export task list')
    }
  }

  async stopExportTask(taskId: string): Promise<any> {
    try {
      return await this.http.request('POST', `/api/v1/export/stop/${taskId}`)
    } catch (error) {
      console.error('Failed to stop export task:', error)
      throw new Error('Failed to stop export task')
    }
  }

  async deleteExportTask(taskId: string): Promise<any> {
    try {
      return await this.http.request('DELETE', `/api/v1/export/tasks/${taskId}`)
    } catch (error) {
      console.error('Failed to delete export task:', error)
      throw new Error('Failed to delete export task')
    }
  }
}
