import { app, shell, BrowserWindow, ipcMain, screen, dialog } from 'electron'
import path, { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { spawn } from 'child_process'
import fs from 'fs'
import addBowler, { getBowlers, updateBowler, deleteBowler, healthCheck } from './api/controller'
import { createSession, getSessions, updateSession, deleteSession } from './api/sessionController'
import { addSessionBowler, getSessionBowlers, updateSessionBowler, deleteSessionBowler } from './api/sessionBowlerController'
import { createBracket, getBrackets, addBowlerToBracket, getBracketEntries, updateBracketEntryScores, generateBrackets, updateBracket, deleteBracket, progressBrackets } from './api/bracketController'
import { createSideGameEntry, getSideGameEntries, updateSideGameEntry, calculateEliminatorCutoff, processEliminatorEliminations, addSideGameScores, deleteSideGameEntry } from './api/sideGameController'
import icon from './resources/icon.png?asset'

let pbProcess
let mainWindow
let isShuttingDown = false

// PocketBase configuration
const PB_CONFIG = {
  startupTimeout: 30000, // 30 seconds
  host: '127.0.0.1',
  port: 8090,
  maxStartupAttempts: 3
}

function getPocketBasePath() {
  const platform = process.platform
  const arch = process.arch
  const folder = `${platform}-${arch}`
  const binName = platform === 'win32' ? 'pocketbase.exe' : 'pocketbase'
  const base = app.isPackaged ? process.resourcesPath : app.getAppPath()

  if (!app.isPackaged) {
    return path.join(base, 'pocketbase', folder, binName)
  }

  return path.join(base, 'pocketbase', folder, binName)
}

function ensureDataDirectory() {
  const dataDir = path.join(app.getPath('userData'), 'pb_data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
    console.log('Created PocketBase data directory:', dataDir)
  }
  return dataDir
}

async function startPocketBase(attempt = 1) {
  const pbPath = getPocketBasePath()
  const dataDir = ensureDataDirectory()

  // Verify PocketBase binary exists
  if (!fs.existsSync(pbPath)) {
    throw new Error(`PocketBase binary not found at: ${pbPath}`)
  }

  console.log(`Starting PocketBase (attempt ${attempt}/${PB_CONFIG.maxStartupAttempts})...`)

  return new Promise((resolve, reject) => {
    const startupTimer = setTimeout(() => {
      if (pbProcess && !pbProcess.killed) {
        pbProcess.kill('SIGTERM')
      }
      reject(new Error(`PocketBase startup timed out after ${PB_CONFIG.startupTimeout}ms`))
    }, PB_CONFIG.startupTimeout)

    pbProcess = spawn(pbPath, [
      'serve',
      `--http=${PB_CONFIG.host}:${PB_CONFIG.port}`,
      `--dir=${dataDir}`,
      '--dev' // Enable dev mode for better logging
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let hasResolved = false

    pbProcess.stdout.on('data', (data) => {
      const msg = data.toString()
      console.log(`[PocketBase] ${msg}`)
      
      if (!hasResolved && (msg.includes('Server started') || msg.includes('Listening') || msg.includes('Serving'))) {
        hasResolved = true
        clearTimeout(startupTimer)
        
        // Give PocketBase a moment to fully initialize
        setTimeout(() => {
          verifyPocketBaseConnection()
            .then(() => resolve())
            .catch(reject)
        }, 1000)
      }
    })

    pbProcess.stderr.on('data', (data) => {
      const msg = data.toString()
      console.error(`[PocketBase ERROR] ${msg}`)
      
      // Check for common errors
      if (msg.includes('address already in use')) {
        clearTimeout(startupTimer)
        reject(new Error(`Port ${PB_CONFIG.port} is already in use`))
      }
    })

    pbProcess.on('error', (error) => {
      clearTimeout(startupTimer)
      console.error('[PocketBase Process Error]', error)
      reject(error)
    })

    pbProcess.on('exit', (code, signal) => {
      clearTimeout(startupTimer)
      if (!hasResolved && !isShuttingDown) {
        console.error(`[PocketBase] Process exited with code ${code}, signal ${signal}`)
        reject(new Error(`PocketBase process exited unexpectedly (code: ${code})`))
      }
    })
  })
}

async function verifyPocketBaseConnection() {
  console.log('Verifying PocketBase connection...')
  const healthResult = await healthCheck()
  
  if (!healthResult.success) {
    throw new Error('PocketBase health check failed')
  }
  
  console.log('PocketBase connection verified successfully')
  return true
}

async function startPocketBaseWithRetry() {
  let lastError

  for (let attempt = 1; attempt <= PB_CONFIG.maxStartupAttempts; attempt++) {
    try {
      await startPocketBase(attempt)
      console.log('PocketBase started successfully')
      return
    } catch (error) {
      lastError = error
      console.error(`PocketBase startup attempt ${attempt} failed:`, error.message)
      
      if (attempt < PB_CONFIG.maxStartupAttempts) {
        console.log(`Retrying in 2 seconds...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
  }

  throw lastError
}

function stopPocketBase() {
  if (pbProcess && !pbProcess.killed) {
    console.log('Stopping PocketBase...')
    isShuttingDown = true
    
    // Try graceful shutdown first
    pbProcess.kill('SIGTERM')
    
    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (pbProcess && !pbProcess.killed) {
        console.log('Force killing PocketBase...')
        pbProcess.kill('SIGKILL')
      }
    }, 5000)
  }
}

async function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const windowWidth = Math.round(width * 0.8)
  const windowHeight = Math.round(height * 0.8)

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '..', 'preload', 'preload.cjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    
    if (is.dev) {
      mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Load the app
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, './renderer/index.html'))
  }

  return mainWindow
}

// IPC handlers
ipcMain.handle('pb-add-bowler', async (_, name, additionalData) => {
  try {
    return await addBowler(name, additionalData)
  } catch (error) {
    console.error('IPC: Add bowler failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-get-bowlers', async (_, filters) => {
  try {
    return await getBowlers(filters)
  } catch (error) {
    console.error('IPC: Get bowlers failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-update-bowler', async (_, id, updates) => {
  try {
    return await updateBowler(id, updates)
  } catch (error) {
    console.error('IPC: Update bowler failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-delete-bowler', async (_, id) => {
  try {
    return await deleteBowler(id)
  } catch (error) {
    console.error('IPC: Delete bowler failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-health-check', async () => {
  try {
    return await healthCheck()
  } catch (error) {
    console.error('IPC: Health check failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

// Session IPC handlers
ipcMain.handle('pb-create-session', async (_, sessionData) => {
  try {
    return await createSession(sessionData)
  } catch (error) {
    console.error('IPC: Create session failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-get-sessions', async (_, filters) => {
  try {
    return await getSessions(filters)
  } catch (error) {
    console.error('IPC: Get sessions failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-update-session', async (_, id, updates) => {
  try {
    return await updateSession(id, updates)
  } catch (error) {
    console.error('IPC: Update session failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-delete-session', async (_, id) => {
  try {
    return await deleteSession(id)
  } catch (error) {
    console.error('IPC: Delete session failed', error)
    return { success: false, error: error.message }
  }
})

// Session Bowler IPC handlers
ipcMain.handle('pb-add-session-bowler', async (_, sessionBowlerData) => {
  try {
    return await addSessionBowler(sessionBowlerData)
  } catch (error) {
    console.error('IPC: Add session bowler failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-get-session-bowlers', async (_, sessionId, filters) => {
  try {
    return await getSessionBowlers(sessionId, filters)
  } catch (error) {
    console.error('IPC: Get session bowlers failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-update-session-bowler', async (_, id, updates) => {
  try {
    return await updateSessionBowler(id, updates)
  } catch (error) {
    console.error('IPC: Update session bowler failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-delete-session-bowler', async (_, id) => {
  try {
    return await deleteSessionBowler(id)
  } catch (error) {
    console.error('IPC: Delete session bowler failed', error)
    return { success: false, error: error.message }
  }
})

// Bracket IPC handlers
ipcMain.handle('pb-create-bracket', async (_, bracketData) => {
  try {
    return await createBracket(bracketData)
  } catch (error) {
    console.error('IPC: Create bracket failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-get-brackets', async (_, sessionId, type) => {
  try {
    return await getBrackets(sessionId, type)
  } catch (error) {
    console.error('IPC: Get brackets failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-add-bowler-to-bracket', async (_, bracketId, sessionBowlerId, position) => {
  try {
    return await addBowlerToBracket(bracketId, sessionBowlerId, position)
  } catch (error) {
    console.error('IPC: Add bowler to bracket failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-get-bracket-entries', async (_, bracketId) => {
  try {
    return await getBracketEntries(bracketId)
  } catch (error) {
    console.error('IPC: Get bracket entries failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-update-bracket-entry-scores', async (_, entryId, games) => {
  try {
    return await updateBracketEntryScores(entryId, games)
  } catch (error) {
    console.error('IPC: Update bracket entry scores failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-generate-brackets', async (_, sessionId, type) => {
  try {
    return await generateBrackets(sessionId, type)
  } catch (error) {
    console.error('IPC: Generate brackets failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-update-bracket', async (_, bracketId, updates) => {
  try {
    return await updateBracket(bracketId, updates)
  } catch (error) {
    console.error('IPC: Update bracket failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-delete-bracket', async (_, bracketId) => {
  try {
    return await deleteBracket(bracketId)
  } catch (error) {
    console.error('IPC: Delete bracket failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-progress-brackets', async (_, sessionId, type) => {
  try {
    return await progressBrackets(sessionId, type)
  } catch (error) {
    console.error('IPC: Progress brackets failed', error)
    return { success: false, error: error.message }
  }
})

// Side Game IPC handlers
ipcMain.handle('pb-create-side-game-entry', async (_, entryData) => {
  try {
    return await createSideGameEntry(entryData)
  } catch (error) {
    console.error('IPC: Create side game entry failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-get-side-game-entries', async (_, sessionId, type, gameNumber) => {
  try {
    return await getSideGameEntries(sessionId, type, gameNumber)
  } catch (error) {
    console.error('IPC: Get side game entries failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-update-side-game-entry', async (_, entryId, updates) => {
  try {
    return await updateSideGameEntry(entryId, updates)
  } catch (error) {
    console.error('IPC: Update side game entry failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-calculate-eliminator-cutoff', async (_, sessionId, gameNumber) => {
  try {
    return await calculateEliminatorCutoff(sessionId, gameNumber)
  } catch (error) {
    console.error('IPC: Calculate eliminator cutoff failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-process-eliminator-eliminations', async (_, sessionId, gameNumber, cutoff) => {
  try {
    return await processEliminatorEliminations(sessionId, gameNumber, cutoff)
  } catch (error) {
    console.error('IPC: Process eliminator eliminations failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-add-side-game-scores', async (_, sessionId, gameNumber, scores) => {
  try {
    return await addSideGameScores(sessionId, gameNumber, scores)
  } catch (error) {
    console.error('IPC: Add side game scores failed', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('pb-delete-side-game-entry', async (_, entryId) => {
  try {
    return await deleteSideGameEntry(entryId)
  } catch (error) {
    console.error('IPC: Delete side game entry failed', error)
    return { success: false, error: error.message }
  }
})

// App event handlers
app.on('before-quit', (event) => {
  if (!isShuttingDown) {
    console.log('App is quitting, stopping PocketBase...')
    stopPocketBase()
  }
})

app.on('will-quit', (event) => {
  if (pbProcess && !pbProcess.killed) {
    event.preventDefault()
    console.log('Waiting for PocketBase to stop...')
    
    setTimeout(() => {
      app.quit()
    }, 6000) // Give PocketBase time to shut down gracefully
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopPocketBase()
    app.quit()
  }
})

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    try {
      await createWindow()
    } catch (error) {
      console.error('Failed to create window on activate:', error)
    }
  }
})

// Enhanced error handling for unhandled exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  
  if (mainWindow) {
    dialog.showErrorBox(
      'Unexpected Error',
      `An unexpected error occurred: ${error.message}\n\nThe application will continue running, but you may need to restart it.`
    )
  }
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// App initialization
app.whenReady()
  .then(async () => {
    electronApp.setAppUserModelId('com.jj.bracketeer')
    
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })
    
    ipcMain.on('ping', () => console.log('pong'))
    
    console.log('Electron app ready, starting PocketBase...')
  })
  .then(startPocketBaseWithRetry)
  .then(createWindow)
  .then(() => {
    console.log('Application started successfully')
  })
  .catch(async (error) => {
    console.error('Failed to start application:', error)
    
    const choice = await dialog.showMessageBox({
      type: 'error',
      title: 'Startup Error',
      message: 'Failed to start the application',
      detail: `Error: ${error.message}\n\nWould you like to try again or quit?`,
      buttons: ['Retry', 'Quit'],
      defaultId: 0,
      cancelId: 1
    })
    
    if (choice.response === 0) {
      // Retry startup
      setTimeout(() => {
        startPocketBaseWithRetry()
          .then(createWindow)
          .catch(() => app.quit())
      }, 2000)
    } else {
      app.quit()
    }
  })