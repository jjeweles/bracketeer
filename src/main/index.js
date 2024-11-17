import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { sequelize } from '../database/sequelize'
import User from '../database/models/User'

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

  // Sync the db
  await sequelize.sync()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Handle IPC message to create a new user
ipcMain.on('create-user', async (event, userData) => {
  try {
    console.log('Creating user:', userData) // Log the user data
    const user = await User.create(userData)
    console.log('User created:', user) // Log the created user
  } catch (error) {
    console.error('Error creating user:', error)
  }
})

// Function to run the SQLite query
ipcMain.on('run-query', async (event, query) => {
  try {
    const results = await sequelize.query(query, { type: sequelize.QueryTypes.SELECT })
    console.log('Query results:', results)
    event.reply('query-results', results)
  } catch (error) {
    console.error('Error running query:', error)
    event.reply('query-error', error.message)
  }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
