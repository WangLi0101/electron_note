import { ElectronAPI } from '@electron-toolkit/preload'
import type { ReminderFiredPayload, ReminderSnapshotItem } from '../main/reminder-scheduler'
import type { WindowPreferences } from '../main/window-preferences'

interface ReminderApi {
  sync: (items: ReminderSnapshotItem[]) => Promise<void>
  onFired: (callback: (payload: ReminderFiredPayload) => void) => () => void
}

interface WindowApi {
  getPreferences: () => Promise<WindowPreferences>
  updatePreferences: (patch: Partial<WindowPreferences>) => Promise<WindowPreferences>
}

interface CustomApi {
  reminder: ReminderApi
  window: WindowApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomApi
  }
}
