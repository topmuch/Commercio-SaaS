'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { getOfflineQueue } from '@/lib/offline-queue'
import type { OfflineAction } from '@/lib/offline-queue'

type OfflineActionInput = Omit<OfflineAction, 'id' | 'timestamp' | 'retries' | 'status'>

export interface UseOfflineSyncReturn {
  pendingCount: number
  isSyncing: boolean
  lastSyncTime: Date | null
  lastError: string | null
  addToQueue: (action: OfflineActionInput) => Promise<void>
  syncNow: () => Promise<void>
  clearCompleted: () => Promise<void>
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const isOnline = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const syncingRef = useRef(false)
  const prevOnlineRef = useRef(isOnline)
  const initializedRef = useRef(false)

  // Refresh pending count — reads from IndexedDB and updates state
  const refreshCount = useCallback(async () => {
    try {
      const queue = getOfflineQueue()
      await queue.init()
      const count = await queue.getActionCount()
      setPendingCount(count)
    } catch {
      // IndexedDB not available
    }
  }, [])

  // Initialize queue on mount
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // Initial count fetch
    const queue = getOfflineQueue()
    queue.init().then(async () => {
      const count = await queue.getActionCount()
      setPendingCount(count)
    }).catch(() => {
      // IndexedDB not available
    })
  }, [])

  // Process the full queue — one item at a time with exponential backoff
  const processQueue = useCallback(async () => {
    if (syncingRef.current || !isOnline) return

    const queue = getOfflineQueue()
    await queue.init()
    let count = await queue.getActionCount()
    if (count === 0) return

    syncingRef.current = true
    setIsSyncing(true)
    setLastError(null)

    let processed = 0
    const maxBatch = 20

    while (processed < maxBatch) {
      count = await queue.getActionCount()
      if (count === 0) break

      const result = await queue.processNextAction()
      processed++

      if (!result.success) {
        const backoffMs = Math.min(1000 * Math.pow(2, processed), 10000)
        await new Promise(resolve => setTimeout(resolve, backoffMs))
      }
    }

    setLastSyncTime(new Date())
    syncingRef.current = false
    setIsSyncing(false)
    await refreshCount()
  }, [isOnline, refreshCount])

  // Auto-sync when going from offline to online
  // Use a native event listener so setState happens in a callback, not synchronously in the effect
  useEffect(() => {
    const handleOnlineEvent = () => {
      // This callback runs in an event handler context, not synchronously in the effect body
      processQueue()
    }

    window.addEventListener('online', handleOnlineEvent)
    return () => {
      window.removeEventListener('online', handleOnlineEvent)
    }
  }, [processQueue])

  // Keep prevOnlineRef updated for non-effect-based checks
  useEffect(() => {
    prevOnlineRef.current = isOnline
  }, [isOnline])

  // Add an action to the queue
  const addToQueue = useCallback(async (action: OfflineActionInput) => {
    try {
      const queue = getOfflineQueue()
      await queue.init()
      await queue.addAction(action)
      await refreshCount()

      // If online, trigger sync
      if (isOnline) {
        processQueue()
      }
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout à la file')
    }
  }, [isOnline, refreshCount, processQueue])

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    await processQueue()
  }, [processQueue])

  // Clear completed actions
  const clearCompleted = useCallback(async () => {
    try {
      const queue = getOfflineQueue()
      await queue.init()
      await queue.clearCompleted()
      await refreshCount()
    } catch {
      // Silently fail
    }
  }, [refreshCount])

  return {
    pendingCount,
    isSyncing,
    lastSyncTime,
    lastError,
    addToQueue,
    syncNow,
    clearCompleted,
  }
}
