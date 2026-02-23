import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, User, ChevronDown } from 'lucide-react'

export function Header() {
  const { currentUser, logout } = useAuth()
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

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

  // 点击外部区域关闭用户菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu) {
        const target = event.target as Element
        if (!target.closest('.user-menu-container')) {
          setShowUserMenu(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

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
          {/* 左侧：用户信息 */}
          <div className="flex items-center space-x-3 relative">
            {currentUser && (
              <>
                <div className="relative user-menu-container">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-1 p-1 hover:bg-gray-100 rounded-md transition-colors"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                  >
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      {currentUser.photoURL ? (
                        <img 
                          src={currentUser.photoURL} 
                          alt="User" 
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <User className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <ChevronDown className="w-3 h-3 text-gray-500" />
                  </button>
                  
                  {/* 用户菜单下拉 */}
                  {showUserMenu && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                            {currentUser.photoURL ? (
                              <img 
                                src={currentUser.photoURL} 
                                alt="User" 
                                className="w-12 h-12 rounded-full"
                              />
                            ) : (
                              <User className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                             <div className="text-sm text-gray-500">
                               {currentUser.email}
                             </div>
                           </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <button
                           onClick={() => {
                             logout()
                             setShowUserMenu(false)
                           }}
                           className="w-full flex items-center space-x-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                         >
                           <LogOut className="w-4 h-4" />
                           <span>Sign Out</span>
                         </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
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