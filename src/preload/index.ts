import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { ReminderFiredPayload, ReminderSnapshotItem } from '../main/reminder-scheduler'
import type { WindowPreferences } from '../main/window-preferences'

// Custom APIs for renderer
const api = {
  reminder: {
    // 渲染进程 -> 主进程：同步提醒计划快照。
    sync: (items: ReminderSnapshotItem[]): Promise<void> =>
      ipcRenderer.invoke('reminder:sync', items),
    // 主进程 -> 渲染进程：监听“提醒已触发”事件。
    onFired: (callback: (payload: ReminderFiredPayload) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: ReminderFiredPayload): void => {
        callback(payload)
      }
      ipcRenderer.on('reminder:fired', listener)

      return () => {
        // 组件卸载时移除监听，避免重复订阅和内存泄漏。
        ipcRenderer.removeListener('reminder:fired', listener)
      }
    }
  },
  window: {
    // 渲染进程 -> 主进程：获取窗口偏好设置。
    getPreferences: (): Promise<WindowPreferences> => ipcRenderer.invoke('window:get-preferences'),
    // 渲染进程 -> 主进程：更新窗口偏好（透明度、置顶）。
    updatePreferences: (patch: Partial<WindowPreferences>): Promise<WindowPreferences> =>
      ipcRenderer.invoke('window:update-preferences', patch)
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
