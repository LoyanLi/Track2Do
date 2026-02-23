import { ConnectionStatus, Snapshot, Track } from '../../types'
import { HttpClient } from './httpClient'

export class SessionApi {
  constructor(private readonly http: HttpClient) {}

  async checkStatus(): Promise<ConnectionStatus> {
    try {
      const sessionData = await this.http.request('GET', '/api/v1/session/info')
      return {
        isConnected: true,
        sessionName: sessionData.session_name,
        sessionPath: sessionData.session_path,
        sampleRate: sessionData.sample_rate,
        bitDepth: sessionData.bit_depth,
        trackCount: sessionData.track_count,
      }
    } catch {
      return { isConnected: false }
    }
  }

  async getTracks(): Promise<Track[]> {
    try {
      const data = await this.http.request('GET', '/api/v1/tracks')
      return data.tracks || []
    } catch (error) {
      console.error('Failed to get tracks:', error)
      return []
    }
  }

  async applySnapshot(snapshot: Snapshot): Promise<void> {
    try {
      await this.http.request('POST', '/api/v1/session/apply-snapshot', {
        snapshot,
        restore_automation: true,
        restore_plugins: true,
        restore_sends: true,
      })
    } catch (error) {
      console.error('Failed to apply snapshot:', error)
      throw new Error('Failed to apply snapshot')
    }
  }

  async getSnapshotInfo(snapshot: Snapshot): Promise<any> {
    try {
      const snapshotData = encodeURIComponent(JSON.stringify(snapshot))
      return this.http.request('GET', `/api/v1/session/snapshot-info?snapshot_data=${snapshotData}`)
    } catch (error) {
      console.error('Failed to get snapshot info:', error)
      throw new Error('Failed to get snapshot information')
    }
  }
}
