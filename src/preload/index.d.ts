import { ElectronAPI } from '@electron-toolkit/preload'
import type { ReminderFiredPayload, ReminderSnapshotItem } from '../main/reminder-scheduler'

interface ReminderApi {
  sync: (items: ReminderSnapshotItem[]) => Promise<void>
  onFired: (callback: (payload: ReminderFiredPayload) => void) => () => void
}

interface CustomApi {
  reminder: ReminderApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomApi
  }
}
