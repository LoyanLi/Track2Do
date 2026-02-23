// Track state interface
export interface Track {
  id: string
  name: string
  is_soloed: boolean
  is_muted: boolean
  is_record_enabled: boolean
  type: 'audio' | 'midi' | 'aux' | 'master' | 'instrument'
  volume: number
  pan: number
  color?: string
  comments?: string
}

// Track state (for snapshots)
export interface TrackState {
  trackId: string
  trackName: string
  is_soloed: boolean
  is_muted: boolean
  type: 'audio' | 'midi' | 'aux' | 'master' | 'instrument'
  color?: string
}

// Snapshot interface
export interface Snapshot {
  id: string
  name: string
  trackStates: TrackState[]
  createdAt: string
  updatedAt?: string
}

// Export related interfaces
export enum AudioFormat {
  WAV = 'wav',
  AIFF = 'aiff'
}

export enum ExportType {
  STEREO = 'stereo',
  MONO = 'mono',
  MULTI_CHANNEL = 'multi_channel'
}

export enum MixSourceType {
  PHYSICAL_OUT = 'PhysicalOut',
  BUS = 'Bus',
  OUTPUT = 'Output'
}

export interface ExportSettings {
  file_format: AudioFormat;
  mix_source_name: string;
  mix_source_type: MixSourceType;
  online_export: boolean;
  file_prefix: string;
  output_path: string;
}

// Export preset interface
export interface ExportPreset {
  id: string;
  name: string;
  file_format: AudioFormat;
  mix_source_name: string;
  mix_source_type: MixSourceType;
  createdAt: string;
  updatedAt?: string;
}

export interface ExportRequest {
  snapshots: Snapshot[];
  export_settings: ExportSettings;
  start_time?: number;
  end_time?: number;
}

export interface ExportProgress {
  task_id: string;
  status: string;
  progress: number;
  current_snapshot: number;
  total_snapshots: number;
  current_snapshot_name: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  result?: ExportResult;
}

export interface ExportResult {
  success: boolean;
  exported_files: string[];
  failed_snapshots: string[];
  total_duration: number;
  error_message?: string;
}

export interface ExportResponse {
  success: boolean;
  message: string;
  task_id?: string;
}

// Pro Tools connection status
export interface ConnectionStatus {
  isConnected: boolean
  sessionName?: string
  sessionPath?: string
  version?: string
  sampleRate?: number
  bitDepth?: number
  trackCount?: number
}

// API response interface
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'progress' | 'status' | 'error' | 'complete'
  data: any
}

// Error handling interface
export interface AppError {
  code: string
  message: string
  details?: any
}

// Electron API type declarations
export interface ElectronAPI {
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

// Extend Window interface
declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}