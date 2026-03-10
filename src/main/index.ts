import { app, shell, BrowserWindow, ipcMain, Notification, powerMonitor } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  ReminderScheduler,
  type ReminderFiredPayload,
  type ReminderSnapshotItem
} from './reminder-scheduler'
import {
  clampWindowOpacity,
  DEFAULT_WINDOW_PREFERENCES,
  type WindowPreferences
} from './window-preferences'

const WINDOW_PREFERENCES_FILE = 'window-preferences.json'

let mainWindow: BrowserWindow | null = null
let windowPreferences: WindowPreferences = { ...DEFAULT_WINDOW_PREFERENCES }

const reminderScheduler = new ReminderScheduler({
  onReminderFired: (payload, item) => {
    // 主进程负责真正发系统通知，避免依赖渲染进程存活。
    sendReminderNotification(item)
    // 同时把“已触发提醒”事件广播给渲染进程，用于持久化去重状态。
    broadcastReminder(payload)
  }
})

function getWindowPreferencesPath(): string {
  return join(app.getPath('userData'), WINDOW_PREFERENCES_FILE)
}

async function loadWindowPreferences(): Promise<WindowPreferences> {
  try {
    const raw = await readFile(getWindowPreferencesPath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<WindowPreferences>

    return {
      opacity: clampWindowOpacity(
        typeof parsed.opacity === 'number' ? parsed.opacity : DEFAULT_WINDOW_PREFERENCES.opacity
      ),
      alwaysOnTop:
        typeof parsed.alwaysOnTop === 'boolean'
          ? parsed.alwaysOnTop
          : DEFAULT_WINDOW_PREFERENCES.alwaysOnTop
    }
  } catch {
    return { ...DEFAULT_WINDOW_PREFERENCES }
  }
}

async function saveWindowPreferences(): Promise<void> {
  const filePath = getWindowPreferencesPath()
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(windowPreferences, null, 2), 'utf-8')
}

function applyWindowPreferences(window: BrowserWindow): void {
  window.setOpacity(windowPreferences.opacity)
  window.setAlwaysOnTop(windowPreferences.alwaysOnTop)
}

function updateWindowPreferences(patch: Partial<WindowPreferences>): WindowPreferences {
  if (typeof patch.opacity === 'number') {
    windowPreferences.opacity = clampWindowOpacity(patch.opacity)
  }

  if (typeof patch.alwaysOnTop === 'boolean') {
    windowPreferences.alwaysOnTop = patch.alwaysOnTop
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    applyWindowPreferences(mainWindow)
  }

  void saveWindowPreferences()

  return { ...windowPreferences }
}

function sendReminderNotification(item: ReminderSnapshotItem): void {
  if (!Notification.isSupported()) {
    return
  }

  const title = item.title.trim() || '无标题备忘录'
  const body = item.content.trim().slice(0, 80) || '你设置的备忘录提醒时间已到。'

  new Notification({
    title,
    body
  }).show()
}

function broadcastReminder(payload: ReminderFiredPayload): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('reminder:fired', payload)
  }
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 620,
    height: 740,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  applyWindowPreferences(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  windowPreferences = await loadWindowPreferences()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  // 渲染进程把当前提醒快照同步到主进程，主进程据此重建下一次调度。
  ipcMain.handle('reminder:sync', (_event, reminders: ReminderSnapshotItem[]) => {
    reminderScheduler.sync(reminders)
  })

  ipcMain.handle('window:get-preferences', () => {
    return { ...windowPreferences }
  })

  ipcMain.handle('window:update-preferences', (_event, patch: Partial<WindowPreferences>) => {
    const safePatch = typeof patch === 'object' && patch !== null ? patch : {}
    return updateWindowPreferences(safePatch)
  })

  // 设备从睡眠恢复后立即补偿检查，避免错过提醒。
  powerMonitor.on('resume', () => {
    reminderScheduler.checkNow()
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  reminderScheduler.dispose()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
