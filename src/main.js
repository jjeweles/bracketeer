import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import path, { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { spawn } from 'child_process'
import fs from 'fs'
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
  const dataDir = path.join(app.getPath('userData'), 'pb_data')
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir)

  return new Promise((resolve, reject) => {
    pbProcess = spawn(pbPath, ['serve', '--http=127.0.0.1:8090', `--dir=${dataDir}`], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    pbProcess.stdout.on('data', (d) => {
      const msg = d.toString()
      console.log(`[PocketBase] ${msg}`)
      if (msg.includes('Serving') || msg.includes('Listening')) {
        resolve()
      }
    })
    pbProcess.stderr.on('data', (d) => console.error(`[PocketBase ERROR] ${d}`))
    pbProcess.on('error', reject)
  })
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

app.on('before-quit', () => {
  console.log('App is quitting, stopping PocketBase…')
  stopPocketBase()
})
app.on('will-quit', () => {
  console.log('Will-quit event, stopping PocketBase…')
  stopPocketBase()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app
  .whenReady()
  .then(async () => {
    electronApp.setAppUserModelId('com.electron')
    app.on('browser-window-created', (_, w) => optimizer.watchWindowShortcuts(w))
    ipcMain.on('ping', () => console.log('pong'))
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  .then(startPocketBase) // waits for PB to be ready
  .then(createWindow) // only then load the UI
  .catch((err) => {
    console.error('Failed to start:', err)
    app.quit()
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
