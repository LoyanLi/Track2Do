import { contextBridge, ipcRenderer } from 'electron'

// 定义暴露给渲染进程的 API 接口
interface ElectronAPI {
  app: {
    getVersion: () => Promise<string>
  }
  backend: {
    getStatus: () => Promise<{ running: boolean; pid: number | null }>
    restart: () => Promise<void>
  }
  window: {
    toggleAlwaysOnTop: () => Promise<boolean>
    getAlwaysOnTop: () => Promise<boolean>
  }
  shell: {
    openPath: (path: string) => Promise<string>
  }
  fs: {
    readFile: (path: string) => Promise<string | null>
    writeFile: (path: string, content: string) => Promise<boolean>
    ensureDir: (path: string) => Promise<boolean>
    getHomePath: () => Promise<string>
  }
  showOpenDialog: (options: {
    properties: string[]
    title?: string
    defaultPath?: string
  }) => Promise<{
    canceled: boolean
    filePaths: string[]
  }>
  http: {
    get: (url: string) => Promise<any>
    post: (url: string, data?: any) => Promise<any>
    delete: (url: string) => Promise<any>
  }
  signInWithGoogle: () => Promise<{
    success: boolean
    credential?: {
      idToken: string
      accessToken: string
    }
    error?: string
  }>
}

// 安全地暴露 API 给渲染进程
const electronAPI: ElectronAPI = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },
  backend: {
    getStatus: () => ipcRenderer.invoke('backend:getStatus'),
    restart: () => ipcRenderer.invoke('backend:restart'),
  },
  window: {
    toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggleAlwaysOnTop'),
    getAlwaysOnTop: () => ipcRenderer.invoke('window:getAlwaysOnTop'),
  },
  shell: {
    openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),
  },
  fs: {
    readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
    writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
    ensureDir: (path: string) => ipcRenderer.invoke('fs:ensureDir', path),
    getHomePath: () => ipcRenderer.invoke('fs:getHomePath'),
  },
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
  http: {
    get: (url: string) => ipcRenderer.invoke('http:get', url),
    post: (url: string, data?: any) => ipcRenderer.invoke('http:post', url, data),
    delete: (url: string) => ipcRenderer.invoke('http:delete', url),
  },
  signInWithGoogle: () => ipcRenderer.invoke('auth:signInWithGoogle'),
}

// 将 API 暴露到全局对象
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// 类型声明，供 TypeScript 使用
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}