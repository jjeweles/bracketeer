import React, { useState, useEffect } from 'react'
import { Button, Modal, Input } from '../UI'
import { updateBracketEntryScores } from '../../services/bracketService'
import { addSideGameScores } from '../../services/sideGameService'

const ScoreEntry = ({ isOpen, onClose, bracket, entries, session, sessionBowlers, gameNumber = 1, onScoresUpdated }) => {
  const [scores, setScores] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Initialize scores when component opens
  useEffect(() => {
    if (isOpen && entries) {
      const initialScores = {}
      entries.forEach(entry => {
        initialScores[entry.id] = {
          game1: entry.games?.[0] || '',
          game2: entry.games?.[1] || '',
          game3: entry.games?.[2] || '',
        }
      })
      setScores(initialScores)
    }
  }, [isOpen, entries])

  const handleScoreChange = (entryId, game, value) => {
    setScores(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        [game]: value
      }
    }))
  }

  const calculateTotal = (entryId) => {
    const entryScores = scores[entryId] || {}
    return (parseInt(entryScores.game1) || 0) + 
           (parseInt(entryScores.game2) || 0) + 
           (parseInt(entryScores.game3) || 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Update bracket entry scores
      for (const entry of entries) {
        const entryScores = scores[entry.id] || {}
        const games = [
          parseInt(entryScores.game1) || 0,
          parseInt(entryScores.game2) || 0,
          parseInt(entryScores.game3) || 0
        ]

        const response = await updateBracketEntryScores(entry.id, games)
        if (!response.success) {
          throw new Error(`Failed to update scores for ${entry.session_bowler?.name}: ${response.error}`)
        }
      }

      // Also update side game scores if bowlers are in side games
      const sideGameScores = []
      
      for (const entry of entries) {
        const bowler = sessionBowlers.find(b => b.id === entry.session_bowler_id)
        if (!bowler) continue

        const entryScores = scores[entry.id] || {}
        const gameScore = parseInt(entryScores[`game${gameNumber}`]) || 0

        // High game scratch
        if (bowler.high_game_scratch) {
          sideGameScores.push({
            session_bowler_id: bowler.id,
            type: 'high_game_scratch',
            score: gameScore,
            handicap_score: gameScore
          })
        }

        // High game handicap
        if (bowler.high_game_handicap) {
          sideGameScores.push({
            session_bowler_id: bowler.id,
            type: 'high_game_handicap',
            score: gameScore,
            handicap_score: gameScore + (bowler.handicap || 0)
          })
        }

        // Eliminator
        if (bowler.eliminator) {
          sideGameScores.push({
            session_bowler_id: bowler.id,
            type: 'eliminator',
            score: gameScore,
            handicap_score: gameScore
          })
        }
      }

      if (sideGameScores.length > 0) {
        const sideGameResponse = await addSideGameScores(session.id, gameNumber, sideGameScores)
        if (!sideGameResponse.success) {
          console.warn('Failed to update some side game scores:', sideGameResponse.error)
        }
      }

      onScoresUpdated?.()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setScores({})
    setError(null)
    onClose()
  }

  if (!bracket || !entries) {
    return null
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="bg-[#2F2E3E] text-gray-300">
        <div className="flex justify-between items-center p-6 border-b border-gray-600">
          <h3 className="text-lg font-bold text-white">
            Enter Scores - Bracket #{bracket.bracket_number}
          </h3>
          <Button onClick={handleClose} variant="ghost" size="sm">✕</Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-600/20 border border-red-600/40 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {entries
              .sort((a, b) => a.position - b.position)
              .map(entry => (
                <div key={entry.id} className="bg-[#262630] rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-white">
                        {entry.session_bowler?.name || 'Unknown Bowler'}
                      </h4>
                      <p className="text-sm text-gray-400">Position {entry.position}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-[#F2545B]">
                        {calculateTotal(entry.id)}
                      </div>
                      <div className="text-xs text-gray-400">Total</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map(game => (
                      <div key={game}>
                        <label className="block text-xs text-gray-400 mb-1">
                          Game {game}
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="300"
                          value={scores[entry.id]?.[`game${game}`] || ''}
                          onChange={(e) => handleScoreChange(entry.id, `game${game}`, e.target.value)}
                          placeholder="0"
                          className="text-center"
                          disabled={loading}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-600">
            <Button
              type="button"
              onClick={handleClose}
              variant="ghost"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Scores'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default ScoreEntry