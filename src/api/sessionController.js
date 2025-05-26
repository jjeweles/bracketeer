import PocketBase from 'pocketbase'
import generateId from '../utils/random'

const pb = new PocketBase('http://127.0.0.1:8090')

// Disable auto-cancellation to prevent conflicts
pb.autoCancellation(false)

// Connection retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000
}

// Retry wrapper for API calls
async function withRetry(operation, context = '') {
  let lastError
  
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Handle connection errors gracefully
      if (error.isAbort || error.message?.includes('autocancelled')) {
        console.log(`${context} request was cancelled, retrying...`)
        // Continue with retry logic
      }
      
      console.warn(`${context} attempt ${attempt} failed:`, error.message)
      
      // Don't retry on validation errors or client errors
      if (error.status >= 400 && error.status < 500) {
        throw error
      }
      
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1),
          RETRY_CONFIG.maxDelay
        )
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}

// Input validation helpers
function validateSessionData(data) {
  const errors = []
  
  if (!data.name) errors.push('Name is required')
  if (data.name && data.name.length > 100) errors.push('Name must be less than 100 characters')
  if (!['league', 'tournament'].includes(data.type)) errors.push('Type must be league or tournament')
  if (data.handicap_percentage !== undefined && (typeof data.handicap_percentage !== 'number' || data.handicap_percentage < 0 || data.handicap_percentage > 100)) {
    errors.push('Handicap percentage must be between 0 and 100')
  }
  if (data.bracket_price !== undefined && (typeof data.bracket_price !== 'number' || data.bracket_price <= 0)) {
    errors.push('Bracket price must be greater than 0')
  }
  if (!['setup', 'active', 'completed'].includes(data.status)) {
    errors.push('Status must be setup, active, or completed')
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`)
  }
}

// Create a new session
export async function createSession(sessionData) {
  try {
    validateSessionData(sessionData)
    
    const data = {
      id: generateId(),
      name: sessionData.name.trim(),
      type: sessionData.type,
      handicap_percentage: sessionData.handicap_percentage || 80,
      bracket_price: sessionData.bracket_price,
      first_place_payout: sessionData.first_place_payout,
      second_place_payout: sessionData.second_place_payout,
      status: sessionData.status || 'setup'
    }
    
    console.log('Creating session with data:', JSON.stringify(data))
    
    const record = await withRetry(
      () => pb.collection('sessions').create(data),
      'Create session'
    )
    
    return {
      success: true,
      data: record,
      message: `Session "${sessionData.name}" created successfully`
    }
  } catch (error) {
    console.error('Failed to create session:', error)
    
    let errorMessage = 'Failed to create session'
    
    if (error.message.includes('Validation failed')) {
      errorMessage = error.message
    } else if (error.status === 400) {
      errorMessage = 'Invalid session data provided'
    } else if (error.status === 409) {
      errorMessage = 'A session with this information already exists'
    } else if (error.status >= 500) {
      errorMessage = 'Server error occurred. Please try again later.'
    } else if (error.message.includes('fetch')) {
      errorMessage = 'Unable to connect to the database'
    }
    
    return {
      success: false,
      error: errorMessage,
      details: error.message
    }
  }
}

// Get all sessions with optional filtering
export async function getSessions(filters = {}) {
  try {
    let filter = ''
    const filterParts = []
    
    if (filters.type) {
      filterParts.push(`type = "${filters.type}"`)
    }
    
    if (filters.status) {
      filterParts.push(`status = "${filters.status}"`)
    }
    
    if (filters.name) {
      filterParts.push(`name ~ "${filters.name}"`)
    }
    
    if (filterParts.length > 0) {
      filter = filterParts.join(' && ')
    }
    
    const records = await withRetry(
      () => pb.collection('sessions').getList(1, 50, {
        filter
      }),
      'Get sessions'
    )
    
    return {
      success: true,
      data: records.items,
      total: records.totalItems,
      message: `Retrieved ${records.items.length} sessions`
    }
  } catch (error) {
    console.error('Failed to get sessions:', error)
    
    // If collection doesn't exist, return empty result instead of error
    if (error.status === 404 || error.message.includes('doesn\'t exist')) {
      return {
        success: true,
        data: [],
        total: 0,
        message: 'No sessions found - collection may need to be created'
      }
    }
    
    return {
      success: false,
      error: 'Failed to retrieve sessions',
      details: error.message
    }
  }
}

// Update session
export async function updateSession(id, updates) {
  try {
    validateSessionData(updates)
    
    const record = await withRetry(
      () => pb.collection('sessions').update(id, updates),
      'Update session'
    )
    
    return {
      success: true,
      data: record,
      message: 'Session updated successfully'
    }
  } catch (error) {
    console.error('Failed to update session:', error)
    return {
      success: false,
      error: 'Failed to update session',
      details: error.message
    }
  }
}

// Delete session
export async function deleteSession(id) {
  try {
    if (!id) {
      throw new Error('Session ID is required')
    }
    
    await withRetry(
      () => pb.collection('sessions').delete(id),
      'Delete session'
    )
    
    return {
      success: true,
      message: 'Session deleted successfully'
    }
  } catch (error) {
    console.error('Failed to delete session:', error)
    return {
      success: false,
      error: 'Failed to delete session',
      details: error.message
    }
  }
}

// Get session by ID
export async function getSessionById(id) {
  try {
    if (!id) {
      throw new Error('Session ID is required')
    }
    
    const record = await withRetry(
      () => pb.collection('sessions').getOne(id),
      'Get session by ID'
    )
    
    return {
      success: true,
      data: record
    }
  } catch (error) {
    console.error('Failed to get session:', error)
    return {
      success: false,
      error: 'Failed to retrieve session',
      details: error.message
    }
  }
}