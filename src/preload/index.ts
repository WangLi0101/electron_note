import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { ReminderFiredPayload, ReminderSnapshotItem } from '../main/reminder-scheduler'

// Custom APIs for renderer
const api = {
  reminder: {
    sync: (items: ReminderSnapshotItem[]): Promise<void> =>
      ipcRenderer.invoke('reminder:sync', items),
    onFired: (callback: (payload: ReminderFiredPayload) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: ReminderFiredPayload): void => {
        callback(payload)
      }
      ipcRenderer.on('reminder:fired', listener)

      return () => {
        ipcRenderer.removeListener('reminder:fired', listener)
      }
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
