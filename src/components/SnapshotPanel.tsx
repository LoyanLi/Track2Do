import { useState, useEffect } from 'react'
import { Snapshot } from '../types'
import { Plus, Trash2, Info, FolderOpen } from 'lucide-react'
import { SnapshotDetailModal } from './SnapshotDetailModal'

interface SnapshotPanelProps {
  snapshots: Snapshot[]
  onCreateSnapshot: (name: string) => void
  onDeleteSnapshot: (id: string) => void
  onUpdateSnapshot?: (id: string, updates: { name?: string; trackStates?: any[] }) => void
  selectedTracksCount: number
  onGetStorageInfo?: () => Promise<{ isElectron: boolean; storagePath?: string; sessionPath?: string }>
}

export function SnapshotPanel({
  snapshots,
  onCreateSnapshot,
  onDeleteSnapshot,
  onUpdateSnapshot,
  selectedTracksCount,
  onGetStorageInfo
}: SnapshotPanelProps) {
  const [newSnapshotName, setNewSnapshotName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [storageInfo, setStorageInfo] = useState<{ isElectron: boolean; storagePath?: string; sessionPath?: string } | null>(null)

  // Load storage info on component mount
  useEffect(() => {
    const loadStorageInfo = async () => {
      if (onGetStorageInfo) {
        try {
          const info = await onGetStorageInfo()
          setStorageInfo(info)
        } catch (error) {
          console.error('Failed to load storage info:', error)
        }
      }
    }
    loadStorageInfo()
  }, [onGetStorageInfo])

  const handleCreateSnapshot = () => {
    if (newSnapshotName.trim()) {
      onCreateSnapshot(newSnapshotName.trim())
      setNewSnapshotName('')
      setIsCreating(false)
    }
  }

  const handleViewDetails = (snapshot: Snapshot) => {
    setSelectedSnapshot(snapshot)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedSnapshot(null)
  }



  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col">
      {/* Fixed Header */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Track Snapshots</h3>
          <div className="flex items-center space-x-2">

            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              disabled={selectedTracksCount === 0}
            >
              <Plus className="w-4 h-4" />
              <span>Create Snapshot</span>
            </button>
          </div>
        </div>
        
        {/* Storage Info */}
        {storageInfo && storageInfo.isElectron && storageInfo.storagePath && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center space-x-2 text-sm">
              <FolderOpen className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800 font-medium">File Storage:</span>
              <span className="text-blue-700">{storageInfo.storagePath}</span>
            </div>
            {storageInfo.sessionPath && (
              <div className="text-xs text-blue-600 mt-1">
                Pro Tools Session: {storageInfo.sessionPath}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Create Snapshot Form */}
      {isCreating && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={newSnapshotName}
              onChange={(e) => setNewSnapshotName(e.target.value)}
              placeholder="Enter snapshot name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateSnapshot()}
              autoFocus
            />
            <button
              onClick={handleCreateSnapshot}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              disabled={!newSnapshotName.trim()}
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreating(false)
                setNewSnapshotName('')
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Will save Solo/Mute status of current {selectedTracksCount} tracks
          </p>
        </div>
      )}

      {/* Scrollable Snapshot List */}
      <div className="flex-1 overflow-y-auto">
        {snapshots.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📸</div>
            <div className="text-lg mb-2">No snapshots</div>
          <div className="text-sm">Create snapshots to save track states</div>
          </div>
        ) : (
          <div className="space-y-3 pr-2">
            {snapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div>
                    <div className="font-medium text-gray-800">{snapshot.name}</div>
                    <div className="text-sm text-gray-600">
                      Solo: {snapshot.trackStates.filter(track => track.is_soloed).length} | 
                      Muted: {snapshot.trackStates.filter(track => track.is_muted).length}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewDetails(snapshot)}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    title="View Details"
                  >
                    <Info className="w-4 h-4" />
                    <span>Details</span>
                  </button>
                  <button
                    onClick={() => onDeleteSnapshot(snapshot.id)}
                    className="p-2 text-red-600 hover:text-red-700 transition-colors"
                    title="Delete Snapshot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed Footer Statistics */}
      {snapshots.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 flex-shrink-0">
          <div className="text-sm text-gray-600">
            {snapshots.length} snapshots total
          </div>
        </div>
      )}

      {/* Snapshot Detail Modal */}
      <SnapshotDetailModal
        snapshot={selectedSnapshot}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onUpdateSnapshot={onUpdateSnapshot}
      />
    </div>
  )
}