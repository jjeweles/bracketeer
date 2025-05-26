// Side game service using window.api for IPC communication

// Create side game entry
export async function createSideGameEntry(entryData) {
  return await window.api.sideGames.createEntry(entryData)
}

// Get side game entries
export async function getSideGameEntries(sessionId, type = null, gameNumber = null) {
  return await window.api.sideGames.getEntries(sessionId, type, gameNumber)
}

// Update side game entry
export async function updateSideGameEntry(entryId, updates) {
  return await window.api.sideGames.updateEntry(entryId, updates)
}

// Calculate eliminator cutoff
export async function calculateEliminatorCutoff(sessionId, gameNumber) {
  return await window.api.sideGames.calculateEliminatorCutoff(sessionId, gameNumber)
}

// Process eliminator eliminations
export async function processEliminatorEliminations(sessionId, gameNumber, cutoff) {
  return await window.api.sideGames.processEliminations(sessionId, gameNumber, cutoff)
}

// Add scores for side games
export async function addSideGameScores(sessionId, gameNumber, scores) {
  return await window.api.sideGames.addScores(sessionId, gameNumber, scores)
}

// Delete side game entry
export async function deleteSideGameEntry(entryId) {
  return await window.api.sideGames.deleteEntry(entryId)
}