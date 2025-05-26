import PocketBase from 'pocketbase'

const pb = new PocketBase('http://127.0.0.1:8090')

// Disable auto-cancellation to prevent conflicts
pb.autoCancellation(false)

// Create bracket
export async function createBracket(bracketData) {
  try {
    console.log('Creating bracket:', bracketData)
    
    if (!bracketData.session_id) {
      throw new Error('Session ID is required')
    }
    if (!bracketData.type || !['scratch', 'handicap'].includes(bracketData.type)) {
      throw new Error('Valid bracket type (scratch/handicap) is required')
    }

    const pbData = {
      session: bracketData.session_id,
      type: bracketData.type,
      bracket_number: bracketData.bracket_number || 1,
      status: 'forming',
      max_bowlers: 8,
      current_bowlers: 0,
      winner: null,
      runner_up: null
    }

    const record = await pb.collection('brackets').create(pbData)
    console.log('Bracket created successfully:', record.id)

    return {
      success: true,
      data: {
        id: record.id,
        session_id: record.session,
        type: record.type,
        bracket_number: record.bracket_number,
        status: record.status,
        max_bowlers: record.max_bowlers,
        current_bowlers: record.current_bowlers,
        winner_id: record.winner,
        runner_up_id: record.runner_up,
        created: record.created,
        updated: record.updated
      }
    }
  } catch (error) {
    console.error('Create bracket failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to create bracket'
    }
  }
}

// Get brackets for session
export async function getBrackets(sessionId, type = null) {
  try {
    console.log('Getting brackets for session:', sessionId, 'type:', type)
    
    if (!sessionId) {
      throw new Error('Session ID is required')
    }

    let filterString = `session="${sessionId}"`
    if (type) {
      filterString += ` && type="${type}"`
    }

    const records = await pb.collection('brackets').getFullList({
      filter: filterString,
      sort: 'bracket_number',
      expand: 'winner,runner_up'
    })

    console.log(`Retrieved ${records.length} brackets`)

    return {
      success: true,
      data: records.map(record => ({
        id: record.id,
        session_id: record.session,
        type: record.type,
        bracket_number: record.bracket_number,
        status: record.status,
        max_bowlers: record.max_bowlers,
        current_bowlers: record.current_bowlers,
        winner_id: record.winner,
        runner_up_id: record.runner_up,
        winner: record.expand?.winner || null,
        runner_up: record.expand?.runner_up || null,
        created: record.created,
        updated: record.updated
      }))
    }
  } catch (error) {
    console.error('Get brackets failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to get brackets'
    }
  }
}

// Add bowler to bracket
export async function addBowlerToBracket(bracketId, sessionBowlerId, position) {
  try {
    console.log('Adding bowler to bracket:', bracketId, sessionBowlerId, position)
    
    if (!bracketId || !sessionBowlerId) {
      throw new Error('Bracket ID and Session Bowler ID are required')
    }

    const entryData = {
      bracket: bracketId,
      session_bowler: sessionBowlerId,
      position: position || 1,
      games: [0, 0, 0],
      total_score: 0,
      final_position: null
    }

    const record = await pb.collection('bracket_entries').create(entryData)
    
    // Update bracket current_bowlers count
    const bracket = await pb.collection('brackets').getOne(bracketId)
    await pb.collection('brackets').update(bracketId, {
      current_bowlers: bracket.current_bowlers + 1,
      status: bracket.current_bowlers + 1 >= 8 ? 'full' : 'forming'
    })

    console.log('Bowler added to bracket successfully:', record.id)

    return {
      success: true,
      data: {
        id: record.id,
        bracket_id: record.bracket,
        session_bowler_id: record.session_bowler,
        position: record.position,
        games: record.games,
        total_score: record.total_score,
        final_position: record.final_position,
        created: record.created,
        updated: record.updated
      }
    }
  } catch (error) {
    console.error('Add bowler to bracket failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to add bowler to bracket'
    }
  }
}

// Get bracket entries
export async function getBracketEntries(bracketId) {
  try {
    console.log('Getting bracket entries for bracket:', bracketId)
    
    if (!bracketId) {
      throw new Error('Bracket ID is required')
    }

    const records = await pb.collection('bracket_entries').getFullList({
      filter: `bracket="${bracketId}"`,
      sort: 'position',
      expand: 'session_bowler'
    })

    console.log(`Retrieved ${records.length} bracket entries`)

    return {
      success: true,
      data: records.map(record => ({
        id: record.id,
        bracket_id: record.bracket,
        session_bowler_id: record.session_bowler,
        session_bowler: record.expand?.session_bowler || null,
        position: record.position,
        games: record.games,
        total_score: record.total_score,
        final_position: record.final_position,
        created: record.created,
        updated: record.updated
      }))
    }
  } catch (error) {
    console.error('Get bracket entries failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to get bracket entries'
    }
  }
}

// Update bracket entry scores
export async function updateBracketEntryScores(entryId, games) {
  try {
    console.log('Updating bracket entry scores:', entryId, games)
    
    if (!entryId || !Array.isArray(games) || games.length !== 3) {
      throw new Error('Entry ID and array of 3 game scores are required')
    }

    const totalScore = games.reduce((sum, score) => sum + (parseInt(score) || 0), 0)

    const updateData = {
      games: games.map(score => parseInt(score) || 0),
      total_score: totalScore
    }

    const record = await pb.collection('bracket_entries').update(entryId, updateData)
    console.log('Bracket entry scores updated successfully:', record.id)

    return {
      success: true,
      data: {
        id: record.id,
        bracket_id: record.bracket,
        session_bowler_id: record.session_bowler,
        position: record.position,
        games: record.games,
        total_score: record.total_score,
        final_position: record.final_position,
        created: record.created,
        updated: record.updated
      }
    }
  } catch (error) {
    console.error('Update bracket entry scores failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to update bracket entry scores'
    }
  }
}

// Generate brackets for session
export async function generateBrackets(sessionId, type) {
  try {
    console.log('Generating brackets for session:', sessionId, 'type:', type)
    
    if (!sessionId || !type) {
      throw new Error('Session ID and type are required')
    }

    // Get eligible bowlers
    const bowlersResponse = await pb.collection('session_bowlers').getFullList({
      filter: `session="${sessionId}" && ${type}_brackets>0`
    })

    if (bowlersResponse.length < 8) {
      return {
        success: false,
        error: `Need at least 8 bowlers for ${type} brackets. Currently have ${bowlersResponse.length}. Need ${8 - bowlersResponse.length} more.`
      }
    }

    const fullBrackets = Math.floor(bowlersResponse.length / 8)
    const remainingBowlers = bowlersResponse.length % 8

    if (remainingBowlers > 0) {
      return {
        success: false,
        error: `Cannot create complete brackets. Have ${bowlersResponse.length} bowlers, which creates ${fullBrackets} complete brackets with ${remainingBowlers} remaining. Need ${8 - remainingBowlers} more bowlers or reduce entries.`
      }
    }

    // Create brackets
    const brackets = []
    for (let i = 0; i < fullBrackets; i++) {
      const bracketResponse = await createBracket({
        session_id: sessionId,
        type: type,
        bracket_number: i + 1
      })

      if (!bracketResponse.success) {
        throw new Error(`Failed to create bracket ${i + 1}: ${bracketResponse.error}`)
      }

      brackets.push(bracketResponse.data)
    }

    // Shuffle bowlers and assign to brackets
    const shuffledBowlers = [...bowlersResponse].sort(() => Math.random() - 0.5)
    
    for (let i = 0; i < shuffledBowlers.length; i++) {
      const bracketIndex = Math.floor(i / 8)
      const position = (i % 8) + 1
      
      await addBowlerToBracket(brackets[bracketIndex].id, shuffledBowlers[i].id, position)
    }

    console.log(`Generated ${fullBrackets} ${type} brackets successfully`)

    return {
      success: true,
      data: {
        brackets_created: fullBrackets,
        total_bowlers: bowlersResponse.length,
        brackets: brackets
      }
    }
  } catch (error) {
    console.error('Generate brackets failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to generate brackets'
    }
  }
}

// Update bracket status
export async function updateBracket(bracketId, updates) {
  try {
    console.log('Updating bracket:', bracketId, updates)
    
    if (!bracketId) {
      throw new Error('Bracket ID is required')
    }

    const record = await pb.collection('brackets').update(bracketId, updates)
    console.log('Bracket updated successfully:', record.id)

    return {
      success: true,
      data: {
        id: record.id,
        session_id: record.session,
        type: record.type,
        bracket_number: record.bracket_number,
        status: record.status,
        max_bowlers: record.max_bowlers,
        current_bowlers: record.current_bowlers,
        winner_id: record.winner,
        runner_up_id: record.runner_up,
        created: record.created,
        updated: record.updated
      }
    }
  } catch (error) {
    console.error('Update bracket failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to update bracket'
    }
  }
}

// Delete bracket
export async function deleteBracket(bracketId) {
  try {
    console.log('Deleting bracket:', bracketId)
    
    if (!bracketId) {
      throw new Error('Bracket ID is required')
    }

    // Delete all bracket entries first
    const entries = await pb.collection('bracket_entries').getFullList({
      filter: `bracket="${bracketId}"`
    })

    for (const entry of entries) {
      await pb.collection('bracket_entries').delete(entry.id)
    }

    // Delete the bracket
    await pb.collection('brackets').delete(bracketId)
    console.log('Bracket deleted successfully:', bracketId)

    return {
      success: true,
      data: { id: bracketId }
    }
  } catch (error) {
    console.error('Delete bracket failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete bracket'
    }
  }
}

// Progress brackets to next round
export async function progressBrackets(sessionId, type) {
  try {
    console.log('Progressing brackets for session:', sessionId, 'type:', type)
    
    if (!sessionId || !type) {
      throw new Error('Session ID and type are required')
    }

    // Get all brackets for this session and type
    const brackets = await pb.collection('brackets').getFullList({
      filter: `session="${sessionId}" && type="${type}"`,
      sort: 'bracket_number'
    })

    if (brackets.length === 0) {
      return {
        success: false,
        error: 'No brackets found to progress'
      }
    }

    let progressedBrackets = 0

    for (const bracket of brackets) {
      // Get all entries for this bracket with scores
      const entries = await pb.collection('bracket_entries').getFullList({
        filter: `bracket="${bracket.id}"`,
        sort: '-total_score',
        expand: 'session_bowler'
      })

      // Check if all entries have scores
      const entriesWithScores = entries.filter(e => e.total_score > 0)
      if (entriesWithScores.length < entries.length) {
        console.log(`Bracket ${bracket.bracket_number} not ready - missing scores`)
        continue
      }

      // Sort by total score (accounting for handicap in handicap brackets)
      const sortedEntries = entries.sort((a, b) => {
        const aScore = type === 'handicap' ? 
          a.total_score + (a.expand?.session_bowler?.handicap || 0) : 
          a.total_score
        const bScore = type === 'handicap' ? 
          b.total_score + (b.expand?.session_bowler?.handicap || 0) : 
          b.total_score
        return bScore - aScore
      })

      // Update final positions
      for (let i = 0; i < sortedEntries.length; i++) {
        await pb.collection('bracket_entries').update(sortedEntries[i].id, {
          final_position: i + 1
        })
      }

      // Update bracket with winner and runner-up
      if (sortedEntries.length >= 2) {
        await pb.collection('brackets').update(bracket.id, {
          status: 'completed',
          winner: sortedEntries[0].session_bowler,
          runner_up: sortedEntries[1].session_bowler
        })
        progressedBrackets++
      }
    }

    console.log(`Progressed ${progressedBrackets} brackets`)

    return {
      success: true,
      data: {
        progressed_brackets: progressedBrackets,
        total_brackets: brackets.length
      }
    }
  } catch (error) {
    console.error('Progress brackets failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to progress brackets'
    }
  }
}