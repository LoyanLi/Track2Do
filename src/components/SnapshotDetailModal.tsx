import { useState, useEffect } from 'react'
import { Snapshot } from '../types'
import { X, Music, Volume2, VolumeX, Headphones, Mic, Music2, Edit2, Save } from 'lucide-react'

interface SnapshotDetailModalProps {
  snapshot: Snapshot | null
  isOpen: boolean
  onClose: () => void
  onUpdateSnapshot?: (id: string, updates: { name?: string; trackStates?: any[] }) => void
}

export function SnapshotDetailModal({ snapshot, isOpen, onClose, onUpdateSnapshot }: SnapshotDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingName, setEditingName] = useState('')
  const [isEditingTracks, setIsEditingTracks] = useState(false)
  const [localTrackStates, setLocalTrackStates] = useState<any[]>([])
  
  // Update local track states when snapshot changes
  useEffect(() => {
    if (snapshot) {
      setLocalTrackStates(snapshot.trackStates)
    }
  }, [snapshot])
  
  if (!isOpen || !snapshot) return null

  const handleStartEdit = () => {
    setEditingName(snapshot.name)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    if (!editingName.trim()) return
    
    if (onUpdateSnapshot) {
      try {
        onUpdateSnapshot(snapshot.id, { name: editingName.trim() })
        setIsEditing(false)
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to update snapshot name')
      }
    }
  }

  const handleCancelEdit = () => {
    setEditingName('')
    setIsEditing(false)
  }

  const handleStartTracksEdit = () => {
    setIsEditingTracks(true)
  }

  const handleSaveTracksEdit = () => {
    if (onUpdateSnapshot) {
      onUpdateSnapshot(snapshot.id, { trackStates: localTrackStates })
    }
    setIsEditingTracks(false)
  }

  const handleCancelTracksEdit = () => {
    if (snapshot) {
      setLocalTrackStates(snapshot.trackStates)
    }
    setIsEditingTracks(false)
  }

  const handleToggleSolo = (trackId: string) => {
    const updatedTrackStates = localTrackStates.map(track => 
      track.trackId === trackId 
        ? { ...track, is_soloed: !track.is_soloed }
        : track
    )
    
    setLocalTrackStates(updatedTrackStates)
  }

  const handleToggleMute = (trackId: string) => {
    const updatedTrackStates = localTrackStates.map(track => 
      track.trackId === trackId 
        ? { ...track, is_muted: !track.is_muted }
        : track
    )
    
    setLocalTrackStates(updatedTrackStates)
  }

  // Calculate track statistics based on current localTrackStates
  const mutedTracks = localTrackStates.filter(track => track.is_muted)
  const soloedTracks = localTrackStates.filter(track => track.is_soloed)
  const normalTracks = localTrackStates.filter(track => !track.is_muted && !track.is_soloed)

  const getTrackIcon = (track: any) => {
    switch (track.type) {
      case 'audio':
        return <Volume2 className="w-4 h-4" />
      case 'midi':
        return <Music className="w-4 h-4" />
      case 'aux':
        return <Headphones className="w-4 h-4" />
      case 'master':
        return <Mic className="w-4 h-4" />
      case 'instrument':
        return <Music2 className="w-4 h-4" />
      default:
        return <Volume2 className="w-4 h-4" />
    }
  }

  const getTrackTypeColor = (track: any): string => {
    switch (track.type) {
      case 'audio':
        return 'text-blue-600'
      case 'midi':
        return 'text-green-600'
      case 'aux':
        return 'text-purple-600'
      case 'master':
        return 'text-red-600'
      case 'instrument':
        return 'text-orange-600'
      default:
        return 'text-gray-600'
    }
  }

  const getTrackBackgroundColor = (track: any): string => {
    // Prioritize using the actual track color
    if (track.color && track.color !== 'null' && track.color.startsWith('#')) {
      // Pro Tools returns 8-bit hexadecimal color (ARGB format: #ffrrggbb)
      const hex = track.color.replace('#', '')
      if (hex.length === 8) {
        // Skip the first two alpha channel bits, extract RGB
        const r = parseInt(hex.substr(2, 2), 16)
        const g = parseInt(hex.substr(4, 2), 16)
        const b = parseInt(hex.substr(6, 2), 16)
        return `rgba(${r}, ${g}, ${b}, 0.1)`
      }
    }
    
    // If no color information, use default color based on track type
    switch (track.type) {
      case 'audio':
        return 'rgba(59, 130, 246, 0.1)' // blue-500 with opacity
      case 'midi':
        return 'rgba(16, 185, 129, 0.1)' // green-500 with opacity
      case 'aux':
        return 'rgba(139, 92, 246, 0.1)' // purple-500 with opacity
      case 'master':
        return 'rgba(239, 68, 68, 0.1)' // red-500 with opacity
      case 'instrument':
        return 'rgba(249, 115, 22, 0.1)' // orange-500 with opacity
      default:
        return 'rgba(107, 114, 128, 0.1)' // gray-500 with opacity
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            {isEditing ? (
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="text-xl font-semibold text-gray-800 bg-transparent border-b-2 border-blue-500 focus:outline-none focus:border-blue-600 px-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveEdit()
                    } else if (e.key === 'Escape') {
                      handleCancelEdit()
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSaveEdit}
                  className="p-1 text-green-600 hover:text-green-700 transition-colors"
                  title="保存"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 text-gray-600 hover:text-gray-700 transition-colors"
                  title="取消"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-semibold text-gray-800">{snapshot.name}</h2>
                {onUpdateSnapshot && (
                  <button
                    onClick={handleStartEdit}
                    className="p-1 text-gray-600 hover:text-gray-700 transition-colors"
                    title="编辑名称"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-gray-600 mt-1">
              Snapshot ID: {snapshot.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors ml-4"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">


          {/* Track Status Statistics */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <Music className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{localTrackStates.length}</div>
              <div className="text-sm text-blue-700">Total Tracks</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <Volume2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{normalTracks.length}</div>
              <div className="text-sm text-green-700">Normal Tracks</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <Volume2 className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-600">{soloedTracks.length}</div>
              <div className="text-sm text-yellow-700">Solo Tracks</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <VolumeX className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">{mutedTracks.length}</div>
              <div className="text-sm text-red-700">Muted Tracks</div>
            </div>
          </div>

          {/* Track Detail List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">Snapshot Track Information</h3>
              {onUpdateSnapshot && (
                <div className="flex items-center gap-2">
                  {!isEditingTracks ? (
                    <button
                      onClick={handleStartTracksEdit}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveTracksEdit}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        <Save className="w-3 h-3" />
                        Save
                      </button>
                      <button
                        onClick={handleCancelTracksEdit}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="overflow-hidden">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">
                        Track Info
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                        Type
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {localTrackStates.map((track) => (
                      <tr
                        key={track.trackId}
                        className="group hover:opacity-80 transition-all"
                        style={{
                          backgroundColor: getTrackBackgroundColor(track)
                        }}
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 mr-2 ${getTrackTypeColor(track)}`}>
                              {getTrackIcon(track)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {track.trackName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 ${getTrackTypeColor(track)}`}>
                             {(track.type || 'Unknown').toUpperCase()}
                           </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center space-x-1">
                            {onUpdateSnapshot && isEditingTracks ? (
                              <button
                                onClick={() => handleToggleSolo(track.trackId)}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold transition-colors ${
                                  track.is_soloed 
                                    ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                                    : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                                }`}
                                title={track.is_soloed ? '取消Solo' : '设置Solo'}
                              >
                                S
                              </button>
                            ) : (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${
                                track.is_soloed ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-600'
                              }`}>
                                S
                              </span>
                            )}
                            {onUpdateSnapshot && isEditingTracks ? (
                              <button
                                onClick={() => handleToggleMute(track.trackId)}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold transition-colors ${
                                  track.is_muted 
                                    ? 'bg-red-500 text-white hover:bg-red-600' 
                                    : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                                }`}
                                title={track.is_muted ? '取消Mute' : '设置Mute'}
                              >
                                M
                              </button>
                            ) : (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${
                                track.is_muted ? 'bg-red-500 text-white' : 'bg-gray-300 text-gray-600'
                              }`}>
                                M
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}