import React, { useState, useEffect, useCallback } from 'react'
import { Button, Input, Modal, LoadingSpinner, ErrorMessage } from '../UI'
import { updateBracketEntryScores } from '../../services/bracketService'
import { addSideGameScores } from '../../services/sideGameService'

const SessionScoreManager = ({ session, sessionBowlers, onScoresUpdated }) => {
  const [currentGame, setCurrentGame] = useState(1)
  const [scores, setScores] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Initialize scores when component mounts or game changes
  useEffect(() => {
    const initialScores = {}
    sessionBowlers.forEach(bowler => {
      initialScores[bowler.id] = ''
    })
    setScores(initialScores)
  }, [sessionBowlers, currentGame])

  const handleScoreChange = (bowlerId, value) => {
    setScores(prev => ({
      ...prev,
      [bowlerId]: value
    }))
  }

  const validateScores = () => {
    const errors = []
    const filledScores = Object.entries(scores).filter(([_, score]) => score && score.trim() !== '')
    
    if (filledScores.length === 0) {
      errors.push('Please enter at least one score')
      return errors
    }

    filledScores.forEach(([bowlerId, score]) => {
      const numScore = parseInt(score)
      if (isNaN(numScore) || numScore < 0 || numScore > 300) {
        const bowler = sessionBowlers.find(b => b.id === bowlerId)
        errors.push(`Invalid score for ${bowler?.name}: must be 0-300`)
      }
    })

    return errors
  }

  const handleSubmit = async () => {
    setError(null)
    const validationErrors = validateScores()
    
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '))
      return
    }

    setShowConfirmModal(true)
  }

  const handleConfirmSubmit = async () => {
    setLoading(true)
    setError(null)
    setShowConfirmModal(false)

    try {
      const sideGameScores = []
      
      // Process scores for each bowler
      for (const [bowlerId, score] of Object.entries(scores)) {
        if (!score || score.trim() === '') continue
        
        const bowler = sessionBowlers.find(b => b.id === bowlerId)
        if (!bowler) continue

        const gameScore = parseInt(score)

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

      // Add side game scores if any
      if (sideGameScores.length > 0) {
        const sideGameResponse = await addSideGameScores(session.id, currentGame, sideGameScores)
        if (!sideGameResponse.success) {
          console.warn('Failed to update some side game scores:', sideGameResponse.error)
        }
      }

      onScoresUpdated?.()
      
      // Clear scores after successful submission
      const clearedScores = {}
      sessionBowlers.forEach(bowler => {
        clearedScores[bowler.id] = ''
      })
      setScores(clearedScores)
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const hasAnyScores = Object.values(scores).some(score => score && score.trim() !== '')

  return (
    <div className="bg-[#262630] rounded-lg p-6 border border-gray-600">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-white">Score Entry</h3>
          <p className="text-sm text-gray-400">
            Enter scores for Game {currentGame} (scratch scores only)
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Game:</span>
            {[1, 2, 3].map(game => (
              <Button
                key={game}
                onClick={() => setCurrentGame(game)}
                variant={currentGame === game ? "primary" : "ghost"}
                size="sm"
              >
                {game}
              </Button>
            ))}
          </div>
          
          <Button
            onClick={handleSubmit}
            variant="primary"
            disabled={loading || !hasAnyScores}
          >
            {loading ? 'Saving...' : 'Save Scores'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-600/20 border border-red-600/40 rounded text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sessionBowlers.map(bowler => (
          <div key={bowler.id} className="bg-[#3C3A4B] rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h4 className="font-medium text-white text-sm">{bowler.name}</h4>
                <p className="text-xs text-gray-400">Avg: {bowler.average}</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Handicap</div>
                <div className="text-sm font-medium text-[#F2545B]">{bowler.handicap}</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Input
                type="number"
                min="0"
                max="300"
                value={scores[bowler.id] || ''}
                onChange={(e) => handleScoreChange(bowler.id, e.target.value)}
                placeholder="Score"
                className="text-center"
                disabled={loading}
              />
              
              {scores[bowler.id] && (
                <div className="text-center">
                  <div className="text-xs text-gray-400">With Handicap</div>
                  <div className="text-lg font-bold text-green-400">
                    {parseInt(scores[bowler.id] || 0) + (bowler.handicap || 0)}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-3 flex flex-wrap gap-1">
              {bowler.scratch_brackets > 0 && (
                <span className="text-xs bg-blue-600 px-2 py-1 rounded">Scratch</span>
              )}
              {bowler.handicap_brackets > 0 && (
                <span className="text-xs bg-green-600 px-2 py-1 rounded">Handicap</span>
              )}
              {bowler.high_game_scratch && (
                <span className="text-xs bg-purple-600 px-2 py-1 rounded">HGS</span>
              )}
              {bowler.high_game_handicap && (
                <span className="text-xs bg-orange-600 px-2 py-1 rounded">HGH</span>
              )}
              {bowler.eliminator && (
                <span className="text-xs bg-red-600 px-2 py-1 rounded">ELIM</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} size="sm">
        <div className="bg-[#2F2E3E] text-gray-300 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Confirm Score Entry</h3>
          
          <div className="mb-6">
            <p className="text-gray-400 mb-4">
              Are you sure you want to save these scores for Game {currentGame}?
            </p>
            
            <div className="bg-[#262630] rounded p-4 max-h-60 overflow-y-auto">
              {Object.entries(scores)
                .filter(([_, score]) => score && score.trim() !== '')
                .map(([bowlerId, score]) => {
                  const bowler = sessionBowlers.find(b => b.id === bowlerId)
                  return (
                    <div key={bowlerId} className="flex justify-between items-center py-1">
                      <span className="text-white">{bowler?.name}</span>
                      <div className="text-right">
                        <span className="text-gray-300">{score}</span>
                        {bowler?.handicap > 0 && (
                          <span className="text-green-400 ml-2">
                            (+{bowler.handicap} = {parseInt(score) + bowler.handicap})
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowConfirmModal(false)}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Confirm & Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default SessionScoreManager