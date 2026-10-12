import { get, set, del } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'

// IndexedDB storage (holds clothing photos comfortably), localStorage as fallback.
export const idbStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const v = await get<string>(name)
      if (v != null) return v
    } catch { /* fall through */ }
    try { return localStorage.getItem(name) } catch { return null }
  },
  setItem: async (name, value) => {
    try {
      await set(name, value)
      return
    } catch { /* fall through */ }
    try { localStorage.setItem(name, value) } catch { /* ignore */ }
  },
  removeItem: async (name) => {
    try { await del(name) } catch { /* ignore */ }
    try { localStorage.removeItem(name) } catch { /* ignore */ }
  },
}
