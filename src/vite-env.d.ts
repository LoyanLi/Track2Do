/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

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
    openExternal: (url: string) => Promise<void>
    showItemInFolder: (path: string) => Promise<void>
  }
  fs: {
    readFile: (path: string) => Promise<string | null>
    writeFile: (path: string, content: string) => Promise<boolean>
    ensureDir: (path: string) => Promise<boolean>
    getHomePath: () => Promise<string>
    exists: (path: string) => Promise<boolean>
    stat: (path: string) => Promise<{ isFile: boolean; isDirectory: boolean } | null>
    readdir: (path: string) => Promise<string[]>
    mkdir: (path: string) => Promise<boolean>
    unlink: (path: string) => Promise<boolean>
    rmdir: (path: string) => Promise<boolean>
    deleteFile: (path: string) => Promise<boolean>
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

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}