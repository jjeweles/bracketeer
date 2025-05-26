import PocketBase from 'pocketbase'

const pb = new PocketBase('http://127.0.0.1:8090')

// Disable auto-cancellation to prevent conflicts
pb.autoCancellation(false)

// Add session bowler
export async function addSessionBowler(sessionBowlerData) {
  try {
    console.log('Adding session bowler:', sessionBowlerData)
    
    // Validate required fields
    if (!sessionBowlerData.session_id) {
      throw new Error('Session ID is required')
    }
    if (!sessionBowlerData.name || !sessionBowlerData.name.trim()) {
      throw new Error('Bowler name is required')
    }
    if (!sessionBowlerData.average || sessionBowlerData.average < 0 || sessionBowlerData.average > 300) {
      throw new Error('Valid average (0-300) is required')
    }

    // Prepare data for PocketBase
    const pbData = {
      session: sessionBowlerData.session_id,
      name: sessionBowlerData.name.trim(),
      average: parseInt(sessionBowlerData.average),
      handicap: parseInt(sessionBowlerData.handicap) || 0,
      lane: sessionBowlerData.lane ? parseInt(sessionBowlerData.lane) : null,
      scratch_brackets: parseInt(sessionBowlerData.scratch_brackets) || 0,
      handicap_brackets: parseInt(sessionBowlerData.handicap_brackets) || 0,
      high_game_scratch: Boolean(sessionBowlerData.high_game_scratch),
      high_game_handicap: Boolean(sessionBowlerData.high_game_handicap),
      eliminator: Boolean(sessionBowlerData.eliminator)
    }

    const record = await pb.collection('session_bowlers').create(pbData)
    console.log('Session bowler created successfully:', record.id)

    return {
      success: true,
      data: {
        id: record.id,
        ...pbData,
        created: record.created,
        updated: record.updated
      }
    }
  } catch (error) {
    console.error('Add session bowler failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to add session bowler'
    }
  }
}

// Get session bowlers
export async function getSessionBowlers(sessionId, filters = {}) {
  try {
    console.log('Getting session bowlers for session:', sessionId, 'with filters:', filters)
    
    if (!sessionId) {
      throw new Error('Session ID is required')
    }

    let filterString = `session="${sessionId}"`
    
    // Add name filter if provided
    if (filters.name && filters.name.trim()) {
      filterString += ` && name~"${filters.name.trim()}"`
    }

    // Add category filter if provided
    if (filters.category) {
      switch (filters.category) {
        case 'scratch':
          filterString += ' && scratch_brackets>0'
          break
        case 'handicap':
          filterString += ' && handicap_brackets>0'
          break
        case 'high_game_scratch':
          filterString += ' && high_game_scratch=true'
          break
        case 'high_game_handicap':
          filterString += ' && high_game_handicap=true'
          break
        case 'eliminator':
          filterString += ' && eliminator=true'
          break
      }
    }

    const records = await pb.collection('session_bowlers').getFullList({
      filter: filterString,
      sort: filters.sort || 'name'
    })

    console.log(`Retrieved ${records.length} session bowlers`)

    return {
      success: true,
      data: records.map(record => ({
        id: record.id,
        session_id: record.session,
        name: record.name,
        average: record.average,
        handicap: record.handicap,
        lane: record.lane,
        scratch_brackets: record.scratch_brackets,
        handicap_brackets: record.handicap_brackets,
        high_game_scratch: record.high_game_scratch,
        high_game_handicap: record.high_game_handicap,
        eliminator: record.eliminator,
        created: record.created,
        updated: record.updated
      }))
    }
  } catch (error) {
    if (error.isAbort || error.message?.includes('autocancelled')) {
      console.log('Request was cancelled, returning empty result')
      return {
        success: true,
        data: []
      }
    }
    console.error('Get session bowlers failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to get session bowlers'
    }
  }
}

// Update session bowler
export async function updateSessionBowler(id, updates) {
  try {
    console.log('Updating session bowler:', id, updates)
    
    if (!id) {
      throw new Error('Session bowler ID is required')
    }

    // Prepare update data
    const updateData = {}
    
    if (updates.name !== undefined) {
      if (!updates.name.trim()) {
        throw new Error('Bowler name cannot be empty')
      }
      updateData.name = updates.name.trim()
    }
    
    if (updates.average !== undefined) {
      const avg = parseInt(updates.average)
      if (isNaN(avg) || avg < 0 || avg > 300) {
        throw new Error('Average must be between 0 and 300')
      }
      updateData.average = avg
    }
    
    if (updates.handicap !== undefined) {
      updateData.handicap = parseInt(updates.handicap) || 0
    }
    
    if (updates.lane !== undefined) {
      updateData.lane = updates.lane ? parseInt(updates.lane) : null
    }
    
    if (updates.scratch_brackets !== undefined) {
      updateData.scratch_brackets = parseInt(updates.scratch_brackets) || 0
    }
    
    if (updates.handicap_brackets !== undefined) {
      updateData.handicap_brackets = parseInt(updates.handicap_brackets) || 0
    }
    
    if (updates.high_game_scratch !== undefined) {
      updateData.high_game_scratch = Boolean(updates.high_game_scratch)
    }
    
    if (updates.high_game_handicap !== undefined) {
      updateData.high_game_handicap = Boolean(updates.high_game_handicap)
    }
    
    if (updates.eliminator !== undefined) {
      updateData.eliminator = Boolean(updates.eliminator)
    }

    const record = await pb.collection('session_bowlers').update(id, updateData)
    console.log('Session bowler updated successfully:', record.id)

    return {
      success: true,
      data: {
        id: record.id,
        session_id: record.session,
        name: record.name,
        average: record.average,
        handicap: record.handicap,
        lane: record.lane,
        scratch_brackets: record.scratch_brackets,
        handicap_brackets: record.handicap_brackets,
        high_game_scratch: record.high_game_scratch,
        high_game_handicap: record.high_game_handicap,
        eliminator: record.eliminator,
        created: record.created,
        updated: record.updated
      }
    }
  } catch (error) {
    console.error('Update session bowler failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to update session bowler'
    }
  }
}

// Delete session bowler
export async function deleteSessionBowler(id) {
  try {
    console.log('Deleting session bowler:', id)
    
    if (!id) {
      throw new Error('Session bowler ID is required')
    }

    await pb.collection('session_bowlers').delete(id)
    console.log('Session bowler deleted successfully:', id)

    return {
      success: true,
      data: { id }
    }
  } catch (error) {
    console.error('Delete session bowler failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete session bowler'
    }
  }
}

// Get session bowler statistics
export async function getSessionBowlerStats(sessionId) {
  try {
    console.log('Getting session bowler stats for session:', sessionId)
    
    if (!sessionId) {
      throw new Error('Session ID is required')
    }

    const records = await pb.collection('session_bowlers').getFullList({
      filter: `session="${sessionId}"`
    })

    const stats = {
      total: records.length,
      scratch_entries: records.reduce((sum, r) => sum + r.scratch_brackets, 0),
      handicap_entries: records.reduce((sum, r) => sum + r.handicap_brackets, 0),
      high_game_scratch: records.filter(r => r.high_game_scratch).length,
      high_game_handicap: records.filter(r => r.high_game_handicap).length,
      eliminator: records.filter(r => r.eliminator).length,
      average_score: records.length > 0 ? 
        Math.round(records.reduce((sum, r) => sum + r.average, 0) / records.length) : 0,
      lanes_used: [...new Set(records.filter(r => r.lane).map(r => r.lane))].sort((a, b) => a - b)
    }

    return {
      success: true,
      data: stats
    }
  } catch (error) {
    console.error('Get session bowler stats failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to get session bowler statistics'
    }
  }
}