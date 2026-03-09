import { app, shell, BrowserWindow, ipcMain, Notification, powerMonitor } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  ReminderScheduler,
  type ReminderFiredPayload,
  type ReminderSnapshotItem
} from './reminder-scheduler'

const reminderScheduler = new ReminderScheduler({
  onReminderFired: (payload, item) => {
    // 主进程负责真正发系统通知，避免依赖渲染进程存活。
    sendReminderNotification(item)
    // 同时把“已触发提醒”事件广播给渲染进程，用于持久化去重状态。
    broadcastReminder(payload)
  }
})

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
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

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
