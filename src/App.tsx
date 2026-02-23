import { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { TrackList } from './components/TrackList'
import { SnapshotPanel } from './components/SnapshotPanel'
import ExportPanel from './components/ExportPanel'
import { StatusBar } from './components/StatusBar'
import { LoadingScreen } from './components/LoadingScreen'
import { useProToolsConnection } from './hooks/useProToolsConnection'
import { useSnapshots } from './hooks/useSnapshots'


function AppContent() {
  const { isConnected, sessionName, sampleRate, bitDepth, tracks, refreshTracks } = useProToolsConnection()
  const { snapshots, createSnapshot, deleteSnapshot, updateSnapshot, getStorageInfo } = useSnapshots()

  const [currentStep, setCurrentStep] = useState(1)

  // Initialize sample snapshot data
  useEffect(() => {
    // Can add initialization logic here
  }, [sessionName, isConnected])



  // Create snapshot
  const handleCreateSnapshot = (name: string) => {
    try {
      const trackStates = tracks.map(track => ({
        trackId: track.id,
        trackName: track.name,
        is_soloed: track.is_soloed,
        is_muted: track.is_muted,
        type: track.type,
        color: track.color
      }))

      createSnapshot({
        name,
        trackStates
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create snapshot')
    }
  }



  // Export functionality has been removed

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="h-full flex flex-col p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Step 1: Project Information</h2>
        <p className="text-gray-600">View current Pro Tools project connection status and track information</p>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                    <div className="text-gray-900">{sessionName || 'Unknown'}</div>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Sample Rate</label>
                     <div className="text-gray-900">{sampleRate ? `${sampleRate} Hz` : 'Unknown'}</div>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bit Depth</label>
                      <div className="text-gray-900">{bitDepth || 'Unknown'}</div>
                    </div>
                </div>
                <button
                  onClick={refreshTracks}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={!isConnected}
                >
                  Refresh Info
                </button>
              </div>
              <TrackList
                tracks={tracks}
                isConnected={isConnected}
              />
            </div>
            <div className="mt-6 flex justify-end flex-shrink-0">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                disabled={!isConnected}
              >
                Next: Manage Snapshots
              </button>
            </div>
          </div>
        )
      case 2:
        return (
          <div className="h-full flex flex-col p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Step 2: Track Snapshot Management</h2>
        <p className="text-gray-600">Create and manage track state snapshots</p>
            </div>
            <div className="flex-1 overflow-auto">
              <SnapshotPanel
                 snapshots={snapshots}
                 onCreateSnapshot={handleCreateSnapshot}
                 onDeleteSnapshot={deleteSnapshot}
                 onUpdateSnapshot={updateSnapshot}
                 selectedTracksCount={tracks.length}
                 onGetStorageInfo={getStorageInfo}
               />
            </div>
            <div className="mt-6 flex justify-between flex-shrink-0">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Previous: Project Info
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                disabled={snapshots.length === 0}
              >
                Next: Export Settings
              </button>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="h-full flex flex-col p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Step 3: STEM Export Settings</h2>
        <p className="text-gray-600">Select snapshots to export and configure export parameters</p>
            </div>
            <div className="flex-1 overflow-auto">
              {snapshots.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Export Snapshots</h3>
                <p className="text-gray-600 mb-4">Please create snapshots in Step 2 first</p>
                </div>
              ) : (
                <ExportPanel snapshots={snapshots} />
              )}
            </div>
            <div className="mt-6 flex justify-between flex-shrink-0">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Previous: Snapshot Management
              </button>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="w-[600px] h-[1200px] flex flex-col bg-gray-50 mx-auto">
      <Header />
      
      {/* Step Indicator */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-center space-x-8">
          {[1, 2, 3].map((step) => {
            const stepNames = ['Project Info', 'Snapshot Management', 'Export Settings']
            const isActive = currentStep === step
            const isCompleted = currentStep > step
            
            return (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : isCompleted 
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {step}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {stepNames[step - 1]}
                </span>
                {step < 3 && (
                  <div className={`ml-8 w-16 h-0.5 ${
                    isCompleted ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Step Content */}
      <div className="flex-1 overflow-auto">
        {renderStepContent()}
      </div>
      
      <StatusBar 
        isConnected={isConnected}
        tracksCount={tracks.length}
        snapshotsCount={snapshots.length}
      />
      

    </div>
  )
}

function App() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 模拟应用初始化过程
    const initializeApp = async () => {
      try {
        // 模拟加载时间（可以替换为实际的初始化逻辑）
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // 这里可以添加实际的初始化逻辑，比如：
        // - 加载配置文件
        // - 初始化服务连接
        // - 预加载必要的数据
        
        setIsLoading(false)
      } catch (error) {
        console.error('应用初始化失败:', error)
        setIsLoading(false)
      }
    }

    initializeApp()
  }, [])

  return (
    <>
      <LoadingScreen isLoading={isLoading} />
      {!isLoading && <AppContent />}
    </>
  )
}

export default App
