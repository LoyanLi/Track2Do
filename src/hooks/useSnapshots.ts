import { useState, useCallback, useEffect } from 'react'
import { Snapshot } from '../types'
import { SnapshotManager } from '../utils/snapshotManager'

export function useSnapshots() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 初始化时加载快照数据
  useEffect(() => {
    const loadInitialSnapshots = async () => {
      try {
        setIsLoading(true)
        const loadedSnapshots = await SnapshotManager.loadSnapshots()
        setSnapshots(loadedSnapshots)
      } catch (error) {
        console.error('Failed to load snapshots:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialSnapshots()
  }, [])

  // 保存快照数据到存储
  const saveSnapshotsToStorage = useCallback(async (snapshotsToSave: Snapshot[]) => {
    try {
      await SnapshotManager.saveSnapshots(snapshotsToSave)
    } catch (error) {
      console.error('Failed to save snapshots:', error)
    }
  }, [])

  // Create snapshot
  const createSnapshot = useCallback((snapshotData: Omit<Snapshot, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Check if a snapshot with the same name already exists
    const existingSnapshot = snapshots.find(
      snapshot => snapshot.name.toLowerCase() === snapshotData.name.toLowerCase()
    )
    
    if (existingSnapshot) {
      throw new Error(`Snapshot name "${snapshotData.name}" already exists, please use a different name`)
    }
    
    const now = new Date().toISOString()
    const newSnapshot: Snapshot = {
      ...snapshotData,
      id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now
    }
    
    const updatedSnapshots = [...snapshots, newSnapshot]
    setSnapshots(updatedSnapshots)
    saveSnapshotsToStorage(updatedSnapshots)
    return newSnapshot
  }, [snapshots, saveSnapshotsToStorage])

  // Update snapshot
  const updateSnapshot = useCallback((id: string, updates: Partial<Snapshot>) => {
    // If the update includes a name, check for duplicates with other snapshots
    if (updates.name) {
      const existingSnapshot = snapshots.find(
        snapshot => 
          snapshot.id !== id && 
          snapshot.name.toLowerCase() === updates.name!.toLowerCase()
      )
      
      if (existingSnapshot) {
        throw new Error(`Snapshot name "${updates.name}" already exists, please use a different name`)
      }
    }
    
    const now = new Date().toISOString()
    const updatedSnapshots = snapshots.map(snapshot => 
      snapshot.id === id 
        ? { ...snapshot, ...updates, updatedAt: now }
        : snapshot
    )
    setSnapshots(updatedSnapshots)
    saveSnapshotsToStorage(updatedSnapshots)
  }, [snapshots, saveSnapshotsToStorage])

  // Delete snapshot
  const deleteSnapshot = useCallback((id: string) => {
    const updatedSnapshots = snapshots.filter(snapshot => snapshot.id !== id)
    setSnapshots(updatedSnapshots)
    saveSnapshotsToStorage(updatedSnapshots)
  }, [snapshots, saveSnapshotsToStorage])

  // Get snapshot
  const getSnapshot = useCallback((id: string) => {
    return snapshots.find(snapshot => snapshot.id === id)
  }, [snapshots])

  // Clear all snapshots
  const clearSnapshots = useCallback(async () => {
    setSnapshots([])
    await SnapshotManager.clearAllSnapshots()
  }, [])

  // Import snapshot
  const importSnapshots = useCallback((importedSnapshots: Snapshot[]) => {
    const updatedSnapshots = [...snapshots, ...importedSnapshots]
    setSnapshots(updatedSnapshots)
    saveSnapshotsToStorage(updatedSnapshots)
  }, [snapshots, saveSnapshotsToStorage])



  // Export snapshot
  const exportSnapshots = useCallback(() => {
    return snapshots
  }, [snapshots])

  // Get storage info
  const getStorageInfo = useCallback(async () => {
    return await SnapshotManager.getStorageInfo()
  }, [])

  return {
    snapshots,
    isLoading,
    createSnapshot,
    updateSnapshot,
    deleteSnapshot,
    getSnapshot,
    clearSnapshots,
    importSnapshots,
    exportSnapshots,
    getStorageInfo
  }
}