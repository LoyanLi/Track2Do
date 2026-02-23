import axios from 'axios'

export type HttpMethod = 'GET' | 'POST' | 'DELETE'

export class HttpClient {
  constructor(
    private readonly baseURL: string,
    private readonly isElectron: boolean,
  ) {}

  async request(method: HttpMethod, url: string, data?: unknown): Promise<any> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`

    if (this.isElectron && typeof window !== 'undefined' && window.electronAPI) {
      switch (method) {
        case 'GET':
          return window.electronAPI.http.get(fullUrl)
        case 'POST':
          return window.electronAPI.http.post(fullUrl, data)
        case 'DELETE':
          return window.electronAPI.http.delete(fullUrl)
        default:
          throw new Error(`Unsupported request method: ${method}`)
      }
    }

    const axiosResponse = await axios({
      method: method.toLowerCase() as 'get' | 'post' | 'delete',
      url: fullUrl,
      data,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    })

    return axiosResponse.data
  }

  createWebSocket(path: string): WebSocket {
    const wsUrl = this.baseURL.replace('http', 'ws') + path
    return new WebSocket(wsUrl)
  }
}
