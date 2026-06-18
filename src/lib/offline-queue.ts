/**
 * Offline Queue Manager — IndexedDB-based persistent action queue
 * Stores actions for later sync when the device is back online.
 */

export interface OfflineAction {
  id: string
  type: 'visit' | 'order' | 'note' | 'photo' | 'invoice' | 'quote'
  method: 'POST' | 'PATCH' | 'PUT'
  url: string
  body: unknown
  timestamp: number
  retries: number
  maxRetries: number
  status: 'pending' | 'syncing' | 'failed' | 'completed'
}

type OfflineActionInput = Omit<OfflineAction, 'id' | 'timestamp' | 'retries' | 'status'>

function generateId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('teranga-offline', 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('actions')) {
        db.createObjectStore('actions', { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function withStore(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest | void): Promise<unknown> {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('actions', mode)
      const store = tx.objectStore('actions')
      const result = callback(store)
      if (result) {
        result.onsuccess = () => resolve(result.result)
        result.onerror = () => reject(result.error)
      } else {
        tx.oncomplete = () => resolve(undefined)
        tx.onerror = () => reject(tx.error)
      }
    })
  })
}

export class OfflineQueue {
  private dbName = 'teranga-offline'
  private storeName = 'actions'

  /** Open/create the IndexedDB database */
  async init(): Promise<void> {
    await openDB()
  }

  /** Add a new action to the queue */
  async addAction(action: OfflineActionInput): Promise<OfflineAction> {
    const fullAction: OfflineAction = {
      ...action,
      id: generateId(),
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    }
    await withStore('readwrite', store => {
      return store.put(fullAction)
    })
    return fullAction
  }

  /** Get all pending (and syncing) actions */
  async getPendingActions(): Promise<OfflineAction[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('actions', 'readonly')
      const store = tx.objectStore('actions')
      const index = store.index('status')
      // We need to use getAll and filter since we might not have a status index
      const request = store.getAll()
      request.onsuccess = () => {
        const all = request.result as OfflineAction[]
        const pending = all.filter(a => a.status === 'pending' || a.status === 'syncing')
        pending.sort((a, b) => a.timestamp - b.timestamp)
        resolve(pending)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /** Mark an action as syncing */
  async markActionSyncing(id: string): Promise<void> {
    await this._updateAction(id, { status: 'syncing' })
  }

  /** Mark an action as completed */
  async markActionCompleted(id: string): Promise<void> {
    await this._updateAction(id, { status: 'completed' })
  }

  /** Mark an action as failed */
  async markActionFailed(id: string): Promise<void> {
    await this._updateAction(id, { status: 'failed' })
  }

  /** Remove an action from the queue */
  async removeAction(id: string): Promise<void> {
    await withStore('readwrite', store => {
      return store.delete(id)
    })
  }

  /** Clear all completed actions */
  async clearCompleted(): Promise<void> {
    const db = await openDB()
    const all = await new Promise<OfflineAction[]>((resolve, reject) => {
      const tx = db.transaction('actions', 'readonly')
      const store = tx.objectStore('actions')
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result as OfflineAction[])
      request.onerror = () => reject(request.error)
    })

    const completed = all.filter(a => a.status === 'completed')
    const tx = db.transaction('actions', 'readwrite')
    const store = tx.objectStore('actions')
    for (const action of completed) {
      store.delete(action.id)
    }
  }

  /** Count pending actions (for badge display) */
  async getActionCount(): Promise<number> {
    const actions = await this.getPendingActions()
    return actions.filter(a => a.status === 'pending').length
  }

  /** Process one action from the queue */
  async processNextAction(): Promise<{ success: boolean; error?: string }> {
    const pending = await this.getPendingActions()
    const action = pending.find(a => a.status === 'pending')
    if (!action) {
      return { success: true }
    }

    try {
      await this.markActionSyncing(action.id)

      const response = await fetch(action.url, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.body),
      })

      if (response.ok) {
        await this.markActionCompleted(action.id)
        await this.removeAction(action.id)
        return { success: true }
      } else {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
    } catch (error) {
      const incremented = action.retries + 1
      if (incremented >= action.maxRetries) {
        await this.markActionFailed(action.id)
        return {
          success: false,
          error: `Échec après ${action.maxRetries} tentatives: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        }
      }
      await this._updateAction(action.id, { retries: incremented, status: 'pending' })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }
    }
  }

  /** Increment retry count and update an action */
  private async _updateAction(id: string, updates: Partial<OfflineAction>): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('actions', 'readwrite')
      const store = tx.objectStore('actions')
      const getReq = store.get(id)
      getReq.onsuccess = () => {
        const existing = getReq.result as OfflineAction | undefined
        if (!existing) {
          resolve()
          return
        }
        const updated = { ...existing, ...updates }
        const putReq = store.put(updated)
        putReq.onsuccess = () => resolve()
        putReq.onerror = () => reject(putReq.error)
      }
      getReq.onerror = () => reject(getReq.error)
    })
  }
}

/** Singleton instance */
let _queue: OfflineQueue | null = null

export function getOfflineQueue(): OfflineQueue {
  if (!_queue) {
    _queue = new OfflineQueue()
  }
  return _queue
}
