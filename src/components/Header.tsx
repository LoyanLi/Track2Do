import React, { useState, useEffect } from 'react'

export function Header() {
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false)

  useEffect(() => {
    // Get initial always-on-top state
    const getInitialState = async () => {
      try {
        if (window.electronAPI?.window) {
          const state = await window.electronAPI.window.getAlwaysOnTop()
          setIsAlwaysOnTop(state)
        }
      } catch (error) {
        console.error('Failed to get always-on-top state:', error)
      }
    }
    getInitialState()
  }, [])

  const toggleAlwaysOnTop = async () => {
    try {
      if (window.electronAPI?.window) {
        const newState = await window.electronAPI.window.toggleAlwaysOnTop()
        setIsAlwaysOnTop(newState)
      }
    } catch (error) {
      console.error('Failed to toggle always-on-top state:', error)
    }
  }

  return (
    <>
      {/* Drag area */}
      <div className="bg-white h-6 w-full" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}></div>
      
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: app state */}
          <div className="text-sm text-gray-500">
            Direct Access
          </div>
          
          {/* 中间：标题 */}
          <h1 className="text-2xl font-bold text-gray-900">
            Track2Do
          </h1>
          
          {/* 右侧：功能按钮 */}
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleAlwaysOnTop}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                isAlwaysOnTop
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={isAlwaysOnTop ? 'Unpin from top' : 'Pin to top'}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              {isAlwaysOnTop ? '📌' : '📌'}
              <span className="ml-1">
                {isAlwaysOnTop ? 'Pin' : 'Pin'}
              </span>
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
