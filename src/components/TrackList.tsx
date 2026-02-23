import { Volume2, Music, Headphones, Mic, Music2 } from 'lucide-react'
import { Track } from '../types'

interface TrackListProps {
  tracks: Track[]
  isConnected: boolean
}

export function TrackList({ 
  tracks, 
  isConnected 
}: TrackListProps) {

  const getTrackIcon = (type: Track['type']) => {
    switch (type) {
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

  const getTrackTypeColor = (type: Track['type']) => {
    switch (type) {
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

  const getTrackBackgroundColor = (track: Track): string => {
    // Prioritize using the actual track color
    if (track.color && track.color !== 'null' && track.color.startsWith('#')) {
      // Pro Tools returns 8-bit hexadecimal color (ARGB format: #ffrrggbb)
      const hex = track.color.replace('#', '');
      if (hex.length === 8) {
        // Skip the first two alpha channel bits, extract RGB
        const r = parseInt(hex.substr(2, 2), 16);
        const g = parseInt(hex.substr(4, 2), 16);
        const b = parseInt(hex.substr(6, 2), 16);
        return `rgba(${r}, ${g}, ${b}, 0.1)`;
      }
    }
    
    // If no color information, use default color based on track type
    switch (track.type) {
      case 'audio':
        return 'rgba(59, 130, 246, 0.1)'; // blue-500 with opacity
      case 'midi':
        return 'rgba(16, 185, 129, 0.1)'; // green-500 with opacity
      case 'aux':
        return 'rgba(139, 92, 246, 0.1)'; // purple-500 with opacity
      case 'master':
        return 'rgba(239, 68, 68, 0.1)'; // red-500 with opacity
      case 'instrument':
        return 'rgba(249, 115, 22, 0.1)'; // orange-500 with opacity
      default:
        return 'rgba(107, 114, 128, 0.1)'; // gray-500 with opacity
    }
  };



  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Project Track Information</h2>
      <span className="text-sm text-gray-500">{tracks.length} Tracks Total</span>
        </div>
      </div>
      
      <div className="max-h-[500px] overflow-y-auto">
        {!isConnected ? (
          <div className="p-8 text-center text-gray-500">
            <Volume2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Please connect to Pro Tools first</p>
          </div>
        ) : tracks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Music className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No tracks in current project</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Track Info
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tracks.map((track) => (
                  <tr
                    key={track.id}
                    className="hover:opacity-80 transition-all"
                    style={{
                      backgroundColor: getTrackBackgroundColor(track)
                    }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 mr-3 ${getTrackTypeColor(track.type)}`}>
                          {getTrackIcon(track.type)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {track.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        track.type === 'audio' ? 'bg-blue-100 text-blue-800' :
                        track.type === 'midi' ? 'bg-green-100 text-green-800' :
                        track.type === 'aux' ? 'bg-purple-100 text-purple-800' :
                        track.type === 'master' ? 'bg-red-100 text-red-800' :
                        track.type === 'instrument' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {track.type.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}