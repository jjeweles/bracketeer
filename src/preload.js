import { contextBridge, ipcRenderer } from 'electron'

// Whitelist of allowed IPC channels
const ALLOWED_CHANNELS = [
  'pb-add-bowler',
  'pb-get-bowlers', 
  'pb-update-bowler',
  'pb-delete-bowler',
  'pb-create-session',
  'pb-get-sessions',
  'pb-update-session',
  'pb-delete-session',
  'pb-add-session-bowler',
  'pb-get-session-bowlers',
  'pb-update-session-bowler',
  'pb-delete-session-bowler',
  'pb-create-bracket',
  'pb-get-brackets',
  'pb-add-bowler-to-bracket',
  'pb-get-bracket-entries',
  'pb-update-bracket-entry-scores',
  'pb-generate-brackets',
  'pb-update-bracket',
  'pb-delete-bracket',
  'pb-progress-brackets',
  'pb-create-side-game-entry',
  'pb-get-side-game-entries',
  'pb-update-side-game-entry',
  'pb-calculate-eliminator-cutoff',
  'pb-process-eliminator-eliminations',
  'pb-add-side-game-scores',
  'pb-delete-side-game-entry',
  'pb-health-check',
  'get-app-version'
]

// Validate IPC channel
function validateChannel(channel) {
  if (!ALLOWED_CHANNELS.includes(channel)) {
    throw new Error(`IPC channel '${channel}' is not allowed`)
  }
}

// Safe IPC invoke wrapper
async function safeInvoke(channel, ...args) {
  validateChannel(channel)
  try {
    return await ipcRenderer.invoke(channel, ...args)
  } catch (error) {
    console.error(`IPC invoke failed for channel '${channel}':`, error)
    return { 
      success: false, 
      error: `Communication error: ${error.message}` 
    }
  }
}

// Expose secure API to renderer
contextBridge.exposeInMainWorld('api', {
  // Bowler management
  bowlers: {
    add: (name, additionalData) => safeInvoke('pb-add-bowler', name, additionalData),
    getAll: (filters) => safeInvoke('pb-get-bowlers', filters),
    update: (id, updates) => safeInvoke('pb-update-bowler', id, updates),
    delete: (id) => safeInvoke('pb-delete-bowler', id)
  },

  // Session management
  sessions: {
    create: (sessionData) => safeInvoke('pb-create-session', sessionData),
    getAll: (filters) => safeInvoke('pb-get-sessions', filters),
    update: (id, updates) => safeInvoke('pb-update-session', id, updates),
    delete: (id) => safeInvoke('pb-delete-session', id)
  },

  // Session bowler management
  sessionBowlers: {
    add: (sessionBowlerData) => safeInvoke('pb-add-session-bowler', sessionBowlerData),
    getAll: (sessionId, filters) => safeInvoke('pb-get-session-bowlers', sessionId, filters),
    update: (id, updates) => safeInvoke('pb-update-session-bowler', id, updates),
    delete: (id) => safeInvoke('pb-delete-session-bowler', id)
  },

  // Bracket management
  brackets: {
    create: (bracketData) => safeInvoke('pb-create-bracket', bracketData),
    getAll: (sessionId, type) => safeInvoke('pb-get-brackets', sessionId, type),
    addBowler: (bracketId, sessionBowlerId, position) => safeInvoke('pb-add-bowler-to-bracket', bracketId, sessionBowlerId, position),
    getEntries: (bracketId) => safeInvoke('pb-get-bracket-entries', bracketId),
    updateScores: (entryId, games) => safeInvoke('pb-update-bracket-entry-scores', entryId, games),
    generate: (sessionId, type) => safeInvoke('pb-generate-brackets', sessionId, type),
    update: (bracketId, updates) => safeInvoke('pb-update-bracket', bracketId, updates),
    delete: (bracketId) => safeInvoke('pb-delete-bracket', bracketId),
    progress: (sessionId, type) => safeInvoke('pb-progress-brackets', sessionId, type)
  },

  // Side game management
  sideGames: {
    createEntry: (entryData) => safeInvoke('pb-create-side-game-entry', entryData),
    getEntries: (sessionId, type, gameNumber) => safeInvoke('pb-get-side-game-entries', sessionId, type, gameNumber),
    updateEntry: (entryId, updates) => safeInvoke('pb-update-side-game-entry', entryId, updates),
    calculateEliminatorCutoff: (sessionId, gameNumber) => safeInvoke('pb-calculate-eliminator-cutoff', sessionId, gameNumber),
    processEliminations: (sessionId, gameNumber, cutoff) => safeInvoke('pb-process-eliminator-eliminations', sessionId, gameNumber, cutoff),
    addScores: (sessionId, gameNumber, scores) => safeInvoke('pb-add-side-game-scores', sessionId, gameNumber, scores),
    deleteEntry: (entryId) => safeInvoke('pb-delete-side-game-entry', entryId)
  },
  
  // System operations
  system: {
    healthCheck: () => safeInvoke('pb-health-check'),
    getVersion: () => safeInvoke('get-app-version')
  },

  // Utility functions (no IPC needed)
  utils: {
    validateEmail: (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    },
    
    formatDate: (date) => {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(date))
    },
    
    debounce: (func, delay) => {
      let timeoutId
      return (...args) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => func.apply(null, args), delay)
      }
    }
  }
})

// Expose limited electron functionality
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  arch: process.arch,
  versions: process.versions
})

// Development helpers (only in dev mode)
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('dev', {
    log: (...args) => console.log('[DEV]', ...args),
    openDevTools: () => ipcRenderer.send('open-dev-tools')
  })
}