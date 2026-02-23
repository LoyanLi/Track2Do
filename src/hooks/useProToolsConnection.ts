import { useState, useEffect, useCallback } from 'react'
import { Track } from '../types'
import { apiService } from '../services/api'

export function useProToolsConnection() {
  const [isConnected, setIsConnected] = useState(false)
  const [sessionName, setSessionName] = useState<string | undefined>()
  const [sampleRate, setSampleRate] = useState<number | undefined>()
  const [bitDepth, setBitDepth] = useState<number | undefined>()
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      const status = await apiService.checkStatus()
      setIsConnected(status.isConnected)
      setSessionName(status.sessionName)
      setSampleRate(status.sampleRate)
      setBitDepth(status.bitDepth)
      setError(null)
      return status.isConnected
    } catch (err) {
      setIsConnected(false)
      setSessionName(undefined)
      setSampleRate(undefined)
      setBitDepth(undefined)
      setError('Unable to connect to Pro Tools')
      return false
    }
  }, [])

  // Get track list
  const refreshTracks = useCallback(async () => {
    if (!isConnected) {
      setTracks([])
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const trackList = await apiService.getTracks()
      setTracks(trackList)
    } catch (err) {
      setError('Failed to get track list')
      setTracks([])
    } finally {
      setLoading(false)
    }
  }, [isConnected])

  // Initialize connection check
  useEffect(() => {
    checkConnection()
    
    // Periodically check connection status
    const interval = setInterval(checkConnection, 5000)
    
    return () => clearInterval(interval)
  }, [])

  // Refresh track list when connection status changes
  useEffect(() => {
    if (isConnected) {
      refreshTracks()
    } else {
      setTracks([])
    }
  }, [isConnected, refreshTracks])

  // Periodically refresh track information
  useEffect(() => {
    if (!isConnected) return
    
    // Periodically refresh track list
    const trackInterval = setInterval(refreshTracks, 3000)
    
    return () => clearInterval(trackInterval)
  }, [isConnected, refreshTracks])

  return {
    isConnected,
    sessionName,
    sampleRate,
    bitDepth,
    tracks,
    loading,
    error,
    refreshTracks,
    checkConnection
  }
}