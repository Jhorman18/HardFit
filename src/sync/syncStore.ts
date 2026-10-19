import { create } from 'zustand'
import { db } from '../db'
import { syncNow, type SyncResult } from './sync'

export interface SyncStoreState {
  isSyncing: boolean
  lastSyncAt: number | null
  lastResult: SyncResult | null
  error: string | null
  sync: () => Promise<SyncResult>
  loadLastSyncAt: () => Promise<void>
}

export const useSyncStore = create<SyncStoreState>((set, get) => ({
  isSyncing: false,
  lastSyncAt: null,
  lastResult: null,
  error: null,

  loadLastSyncAt: async () => {
    try {
      const record = await db.syncMeta.get('meta:lastSyncAt')
      if (record && typeof record.syncedAt === 'number') {
        set({ lastSyncAt: record.syncedAt })
      }
    } catch (err) {
      console.error('Error cargando última fecha de sincronización:', err)
    }
  },

  sync: async () => {
    if (get().isSyncing) {
      return (
        get().lastResult ?? {
          success: false,
          pulled: 0,
          pushed: 0,
          deleted: 0,
          error: 'Sincronización en curso.',
        }
      )
    }

    set({ isSyncing: true, error: null })
    try {
      const res = await syncNow()
      if (res.success) {
        set({
          isSyncing: false,
          lastSyncAt: Date.now(),
          lastResult: res,
          error: null,
        })
      } else {
        set({
          isSyncing: false,
          lastResult: res,
          error: res.error ?? 'Error en la sincronización.',
        })
      }
      return res
    } catch (err: any) {
      const errMsg = err?.message || 'Error de sincronización.'
      const res: SyncResult = {
        success: false,
        pulled: 0,
        pushed: 0,
        deleted: 0,
        error: errMsg,
      }
      set({
        isSyncing: false,
        lastResult: res,
        error: errMsg,
      })
      return res
    }
  },
}))
