import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { spawn } from 'child_process'
import path from 'path'
import addBowler from './api/controller'
import icon from './resources/icon.png?asset'

let pbProcess

function getPocketBasePath() {
  const platform = process.platform // 'darwin', 'win32', 'linux'
  const arch = process.arch // 'x64' or 'arm64'
  const folder = `${platform}-${arch}`
  // name on Windows needs .exe
  const binName = platform === 'win32' ? 'pocketbase.exe' : 'pocketbase'

  const base = app.isPackaged ? process.resourcesPath : app.getAppPath()

  // in dev, binaries live next to your project
  if (!app.isPackaged) {
    return path.join(base, 'pocketbase', folder, binName)
  }

  // in packaged app, electron-builder put them under Resources
  return path.join(base, 'pocketbase', folder, binName)
}

function startPocketBase() {
  const pbPath = getPocketBasePath()
  // spawn the server; adjust args as needed:
  pbProcess = spawn(pbPath, ['serve', '--http=127.0.0.1:8090', '--dir=./pb_data'], {
    cwd: app.getPath('userData'),
    stdio: ['ignore', 'pipe', 'pipe']
  })
  pbProcess.stdout.on('data', (d) => console.log(`[PocketBase] ${d}`))
  pbProcess.stderr.on('data', (d) => console.error(`[PocketBase ERROR] ${d}`))
}

function stopPocketBase() {
  if (pbProcess && !pbProcess.killed) {
    pbProcess.kill()
  }
}

async function createWindow() {
  // Get user's screen size
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  // Make desktop app 80% of the user's screen size
  const windowWidth = Math.round(width * 0.8)
  const windowHeight = Math.round(height * 0.8)

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '..', 'preload', 'preload.cjs'),
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
    mainWindow.loadFile(join(__dirname, './renderer/index.html'))
  }
}

ipcMain.handle('pb-add-bowler', (_, name) => addBowler(name))

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  startPocketBase()

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
    stopPocketBase()
    app.quit()
  }
})
