// Bracket service using window.api for IPC communication

// Create bracket
export async function createBracket(bracketData) {
  return await window.api.brackets.create(bracketData)
}

// Get brackets for session
export async function getBrackets(sessionId, type = null) {
  return await window.api.brackets.getAll(sessionId, type)
}

// Add bowler to bracket
export async function addBowlerToBracket(bracketId, sessionBowlerId, position) {
  return await window.api.brackets.addBowler(bracketId, sessionBowlerId, position)
}

// Get bracket entries
export async function getBracketEntries(bracketId) {
  return await window.api.brackets.getEntries(bracketId)
}

// Update bracket entry scores
export async function updateBracketEntryScores(entryId, games) {
  return await window.api.brackets.updateScores(entryId, games)
}

// Generate brackets for session
export async function generateBrackets(sessionId, type) {
  return await window.api.brackets.generate(sessionId, type)
}

// Update bracket status
export async function updateBracket(bracketId, updates) {
  return await window.api.brackets.update(bracketId, updates)
}

// Delete bracket
export async function deleteBracket(bracketId) {
  return await window.api.brackets.delete(bracketId)
}

// Progress brackets to next round
export async function progressBrackets(sessionId, type) {
  return await window.api.brackets.progress(sessionId, type)
}