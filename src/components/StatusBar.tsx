import { Wifi, WifiOff, Music, Camera } from 'lucide-react'

interface StatusBarProps {
  isConnected: boolean
  tracksCount: number
  snapshotsCount: number
}

export function StatusBar({ isConnected, tracksCount, snapshotsCount }: StatusBarProps) {
  return (
    <div className="bg-gray-100 border-t border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span>Pro Tools Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span>Pro Tools Disconnected</span>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <Music className="w-4 h-4" />
            <span>{tracksCount} Tracks</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Camera className="w-4 h-4" />
            <span>{snapshotsCount} Snapshots</span>
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          Track2Do v0.1.1
        </div>
      </div>
    </div>
  )
}
