import PocketBase from 'pocketbase'
import generateId from '../utils/random'

const pb = new PocketBase('http://127.0.0.1:8090')

// Connection retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000
}

// Input validation helpers
function validateBowlerName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Name is required and must be a string')
  }
  if (name.trim().length === 0) {
    throw new Error('Name cannot be empty')
  }
  if (name.length > 100) {
    throw new Error('Name must be less than 100 characters')
  }
  return name.trim()
}

function validateBowlerData(data) {
  const errors = []
  
  if (!data.name) errors.push('Name is required')
  if (data.average !== undefined && (typeof data.average !== 'number' || data.average < 0 || data.average > 300)) {
    errors.push('Average must be a number between 0 and 300')
  }
  if (data.handicap !== undefined && (typeof data.handicap !== 'number' || data.handicap < 0)) {
    errors.push('Handicap must be a non-negative number')
  }
  if (data.lane !== undefined && (typeof data.lane !== 'number' || data.lane < 1 || data.lane > 100)) {
    errors.push('Lane must be a number between 1 and 100')
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`)
  }
}

// Retry wrapper for API calls
async function withRetry(operation, context = '') {
  let lastError
  
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
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

// Health check for PocketBase connection
export async function healthCheck() {
  try {
    const result = await withRetry(
      () => pb.health.check(),
      'Health check'
    )
    return { success: true, data: result }
  } catch (error) {
    console.error('PocketBase health check failed:', error)
    return { 
      success: false, 
      error: 'Database connection failed',
      details: error.message 
    }
  }
}

// Add a new bowler
export default async function addBowler(name, additionalData = {}) {
  try {
    // Validate inputs
    const validatedName = validateBowlerName(name)
    const bowlerData = {
      name: validatedName,
      ...additionalData
    }
    
    validateBowlerData(bowlerData)
    
    // Prepare data for PocketBase
    const data = {
      id: generateId(),
      name: bowlerData.name,
      average: bowlerData.average || 0,
      handicap: bowlerData.handicap || 0,
      lane: bowlerData.lane || null,
      category: bowlerData.category || 'brackets'
    }
    
    console.log('Adding bowler with data:', JSON.stringify(data))
    
    const record = await withRetry(
      () => pb.collection('bowlers').create(data),
      'Add bowler'
    )
    
    return {
      success: true,
      data: record,
      message: `Bowler "${validatedName}" added successfully`
    }
  } catch (error) {
    console.error('Failed to add bowler:', error)
    
    // Return user-friendly error messages
    let errorMessage = 'Failed to add bowler'
    
    if (error.message.includes('Validation failed')) {
      errorMessage = error.message
    } else if (error.status === 400) {
      errorMessage = 'Invalid bowler data provided'
    } else if (error.status === 409) {
      errorMessage = 'A bowler with this information already exists'
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

// Get all bowlers with optional filtering
export async function getBowlers(filters = {}) {
  try {
    let filter = ''
    const filterParts = []
    
    if (filters.category) {
      filterParts.push(`category = "${filters.category}"`)
    }
    
    if (filters.name) {
      filterParts.push(`name ~ "${filters.name}"`)
    }
    
    if (filterParts.length > 0) {
      filter = filterParts.join(' && ')
    }
    
    const records = await withRetry(
      () => pb.collection('bowlers').getList(1, 50, {
        filter
      }),
      'Get bowlers'
    )
    
    return {
      success: true,
      data: records.items,
      total: records.totalItems,
      message: `Retrieved ${records.items.length} bowlers`
    }
  } catch (error) {
    console.error('Failed to get bowlers:', error)
    
    // If collection doesn't exist, return empty result instead of error
    if (error.status === 404 || error.message.includes('doesn\'t exist')) {
      return {
        success: true,
        data: [],
        total: 0,
        message: 'No bowlers found - collection may need to be created'
      }
    }
    
    return {
      success: false,
      error: 'Failed to retrieve bowlers',
      details: error.message
    }
  }
}

// Update bowler
export async function updateBowler(id, updates) {
  try {
    validateBowlerData(updates)
    
    const data = {
      ...updates
    }
    
    const record = await withRetry(
      () => pb.collection('bowlers').update(id, data),
      'Update bowler'
    )
    
    return {
      success: true,
      data: record,
      message: 'Bowler updated successfully'
    }
  } catch (error) {
    console.error('Failed to update bowler:', error)
    return {
      success: false,
      error: 'Failed to update bowler',
      details: error.message
    }
  }
}

// Delete bowler
export async function deleteBowler(id) {
  try {
    if (!id) {
      throw new Error('Bowler ID is required')
    }
    
    await withRetry(
      () => pb.collection('bowlers').delete(id),
      'Delete bowler'
    )
    
    return {
      success: true,
      message: 'Bowler deleted successfully'
    }
  } catch (error) {
    console.error('Failed to delete bowler:', error)
    return {
      success: false,
      error: 'Failed to delete bowler',
      details: error.message
    }
  }
}

// Get bowler statistics
export async function getBowlerStats(category = null) {
  try {
    let filter = ''
    if (category) {
      filter = `category = "${category}"`
    }
    
    const records = await withRetry(
      () => pb.collection('bowlers').getFullList({
        filter
      }),
      'Get bowler stats'
    )
    
    const stats = {
      total: records.length,
      averageScore: records.length > 0 
        ? Math.round(records.reduce((sum, b) => sum + (b.average || 0), 0) / records.length)
        : 0,
      categories: records.reduce((acc, bowler) => {
        acc[bowler.category] = (acc[bowler.category] || 0) + 1
        return acc
      }, {})
    }
    
    return {
      success: true,
      data: stats
    }
  } catch (error) {
    console.error('Failed to get bowler stats:', error)
    return {
      success: false,
      error: 'Failed to retrieve statistics',
      details: error.message
    }
  }
}