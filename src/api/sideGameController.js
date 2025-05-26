import PocketBase from 'pocketbase'

const pb = new PocketBase('http://127.0.0.1:8090')

// Disable auto-cancellation to prevent conflicts
pb.autoCancellation(false)

// Create side game entry
export async function createSideGameEntry(entryData) {
  try {
    console.log('Creating side game entry:', entryData)
    
    if (!entryData.session_id) {
      throw new Error('Session ID is required')
    }
    if (!entryData.session_bowler_id) {
      throw new Error('Session Bowler ID is required')
    }
    if (!entryData.type || !['high_game_scratch', 'high_game_handicap', 'eliminator'].includes(entryData.type)) {
      throw new Error('Valid side game type is required')
    }

    const pbData = {
      session: entryData.session_id,
      type: entryData.type,
      session_bowler: entryData.session_bowler_id,
      score: entryData.score || 0,
      handicap_score: entryData.handicap_score || 0,
      position: entryData.position || null,
      payout: entryData.payout || 0,
      game_number: entryData.game_number || 1,
      is_eliminated: entryData.is_eliminated || false
    }

    const record = await pb.collection('side_games').create(pbData)
    console.log('Side game entry created successfully:', record.id)

    return {
      success: true,
      data: {
        id: record.id,
        session_id: record.session,
        type: record.type,
        session_bowler_id: record.session_bowler,
        score: record.score,
        handicap_score: record.handicap_score,
        position: record.position,
        payout: record.payout,
        game_number: record.game_number,
        is_eliminated: record.is_eliminated,
        created: record.created,
        updated: record.updated
      }
    }
  } catch (error) {
    console.error('Create side game entry failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to create side game entry'
    }
  }
}

// Get side game entries
export async function getSideGameEntries(sessionId, type = null, gameNumber = null) {
  try {
    console.log('Getting side game entries for session:', sessionId, 'type:', type, 'game:', gameNumber)
    
    if (!sessionId) {
      throw new Error('Session ID is required')
    }

    let filterString = `session="${sessionId}"`
    if (type) {
      filterString += ` && type="${type}"`
    }
    if (gameNumber !== null) {
      filterString += ` && game_number=${gameNumber}`
    }

    const records = await pb.collection('side_games').getFullList({
      filter: filterString,
      sort: type === 'eliminator' ? '-score' : '-handicap_score,-score',
      expand: 'session_bowler'
    })

    console.log(`Retrieved ${records.length} side game entries`)

    return {
      success: true,
      data: records.map(record => ({
        id: record.id,
        session_id: record.session,
        type: record.type,
        session_bowler_id: record.session_bowler,
        session_bowler: record.expand?.session_bowler || null,
        score: record.score,
        handicap_score: record.handicap_score,
        position: record.position,
        payout: record.payout,
        game_number: record.game_number,
        is_eliminated: record.is_eliminated,
        created: record.created,
        updated: record.updated
      }))
    }
  } catch (error) {
    console.error('Get side game entries failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to get side game entries'
    }
  }
}

// Update side game entry
export async function updateSideGameEntry(entryId, updates) {
  try {
    console.log('Updating side game entry:', entryId, updates)
    
    if (!entryId) {
      throw new Error('Side game entry ID is required')
    }

    const updateData = {}
    
    if (updates.score !== undefined) {
      updateData.score = parseInt(updates.score) || 0
    }
    
    if (updates.handicap_score !== undefined) {
      updateData.handicap_score = parseInt(updates.handicap_score) || 0
    }
    
    if (updates.position !== undefined) {
      updateData.position = updates.position
    }
    
    if (updates.payout !== undefined) {
      updateData.payout = parseFloat(updates.payout) || 0
    }

    if (updates.game_number !== undefined) {
      updateData.game_number = parseInt(updates.game_number) || 1
    }

    if (updates.is_eliminated !== undefined) {
      updateData.is_eliminated = Boolean(updates.is_eliminated)
    }

    const record = await pb.collection('side_games').update(entryId, updateData)
    console.log('Side game entry updated successfully:', record.id)

    return {
      success: true,
      data: {
        id: record.id,
        session_id: record.session,
        type: record.type,
        session_bowler_id: record.session_bowler,
        score: record.score,
        handicap_score: record.handicap_score,
        position: record.position,
        payout: record.payout,
        game_number: record.game_number,
        is_eliminated: record.is_eliminated,
        created: record.created,
        updated: record.updated
      }
    }
  } catch (error) {
    console.error('Update side game entry failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to update side game entry'
    }
  }
}

// Calculate eliminator cutoff
export async function calculateEliminatorCutoff(sessionId, gameNumber) {
  try {
    console.log('Calculating eliminator cutoff for session:', sessionId, 'game:', gameNumber)
    
    if (!sessionId || !gameNumber) {
      throw new Error('Session ID and game number are required')
    }

    // Get all eliminator entries for the specified game that aren't eliminated yet
    const entries = await pb.collection('side_games').getFullList({
      filter: `session="${sessionId}" && type="eliminator" && game_number=${gameNumber} && is_eliminated=false`,
      expand: 'session_bowler'
    })

    if (entries.length === 0) {
      return {
        success: false,
        error: 'No eliminator entries found for this game'
      }
    }

    // Calculate average score
    const totalScore = entries.reduce((sum, entry) => sum + entry.score, 0)
    const cutoff = Math.round(totalScore / entries.length)

    console.log(`Calculated eliminator cutoff: ${cutoff} (from ${entries.length} bowlers)`)

    return {
      success: true,
      data: {
        cutoff: cutoff,
        total_bowlers: entries.length,
        game_number: gameNumber,
        bowlers_above_cutoff: entries.filter(e => e.score >= cutoff).length,
        bowlers_below_cutoff: entries.filter(e => e.score < cutoff).length
      }
    }
  } catch (error) {
    console.error('Calculate eliminator cutoff failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to calculate eliminator cutoff'
    }
  }
}

// Process eliminator eliminations
export async function processEliminatorEliminations(sessionId, gameNumber, cutoff) {
  try {
    console.log('Processing eliminator eliminations for session:', sessionId, 'game:', gameNumber, 'cutoff:', cutoff)
    
    if (!sessionId || !gameNumber || cutoff === undefined) {
      throw new Error('Session ID, game number, and cutoff are required')
    }

    // Get all eliminator entries for the specified game
    const entries = await pb.collection('side_games').getFullList({
      filter: `session="${sessionId}" && type="eliminator" && game_number=${gameNumber}`,
      expand: 'session_bowler'
    })

    let eliminatedCount = 0

    // Mark bowlers below cutoff as eliminated
    for (const entry of entries) {
      if (entry.score < cutoff && !entry.is_eliminated) {
        await pb.collection('side_games').update(entry.id, {
          is_eliminated: true
        })
        eliminatedCount++
      }
    }

    console.log(`Eliminated ${eliminatedCount} bowlers below cutoff of ${cutoff}`)

    return {
      success: true,
      data: {
        eliminated_count: eliminatedCount,
        cutoff: cutoff,
        game_number: gameNumber,
        remaining_bowlers: entries.filter(e => e.score >= cutoff).length
      }
    }
  } catch (error) {
    console.error('Process eliminator eliminations failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to process eliminator eliminations'
    }
  }
}

// Add scores for side games
export async function addSideGameScores(sessionId, gameNumber, scores) {
  try {
    console.log('Adding side game scores for session:', sessionId, 'game:', gameNumber)
    
    if (!sessionId || !gameNumber || !Array.isArray(scores)) {
      throw new Error('Session ID, game number, and scores array are required')
    }

    const results = []

    for (const scoreData of scores) {
      if (!scoreData.session_bowler_id || !scoreData.type) {
        continue
      }

      // Check if entry already exists
      const existingEntries = await pb.collection('side_games').getFullList({
        filter: `session="${sessionId}" && session_bowler="${scoreData.session_bowler_id}" && type="${scoreData.type}" && game_number=${gameNumber}`
      })

      if (existingEntries.length > 0) {
        // Update existing entry
        const updateResult = await updateSideGameEntry(existingEntries[0].id, {
          score: scoreData.score,
          handicap_score: scoreData.handicap_score || scoreData.score
        })
        results.push(updateResult)
      } else {
        // Create new entry
        const createResult = await createSideGameEntry({
          session_id: sessionId,
          session_bowler_id: scoreData.session_bowler_id,
          type: scoreData.type,
          score: scoreData.score,
          handicap_score: scoreData.handicap_score || scoreData.score,
          game_number: gameNumber
        })
        results.push(createResult)
      }
    }

    console.log(`Processed ${results.length} side game score entries`)

    return {
      success: true,
      data: {
        processed_count: results.length,
        successful_count: results.filter(r => r.success).length,
        failed_count: results.filter(r => !r.success).length,
        results: results
      }
    }
  } catch (error) {
    console.error('Add side game scores failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to add side game scores'
    }
  }
}

// Delete side game entry
export async function deleteSideGameEntry(entryId) {
  try {
    console.log('Deleting side game entry:', entryId)
    
    if (!entryId) {
      throw new Error('Side game entry ID is required')
    }

    await pb.collection('side_games').delete(entryId)
    console.log('Side game entry deleted successfully:', entryId)

    return {
      success: true,
      data: { id: entryId }
    }
  } catch (error) {
    console.error('Delete side game entry failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete side game entry'
    }
  }
}