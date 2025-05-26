import React, { useState, useEffect, useCallback } from 'react'
import { Button, Modal, Input, LoadingSpinner, ErrorMessage } from '../UI'
import {
  generateBrackets,
  getBrackets,
  getBracketEntries,
  updateBracketEntryScores
} from '../../services/bracketService'
import {
  getSideGameEntries,
  calculateEliminatorCutoff,
  processEliminatorEliminations,
  addSideGameScores
} from '../../services/sideGameService'
import ScoreEntry from './ScoreEntry'
import PrintableBracket from './PrintableBracket'

const BracketManager = ({ session, sessionBowlers, onClose, isOpen }) => {
  const [activeTab, setActiveTab] = useState('scratch')
  const [brackets, setBrackets] = useState([])
  const [bracketEntries, setBracketEntries] = useState({})
  const [sideGameEntries, setSideGameEntries] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentGame, setCurrentGame] = useState(1)
  const [eliminatorCutoff, setEliminatorCutoff] = useState(null)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [selectedBracket, setSelectedBracket] = useState(null)
  const [showEliminatorCutoff, setShowEliminatorCutoff] = useState(false)
  const [showPrintView, setShowPrintView] = useState(false)

  // Load data when component opens
  useEffect(() => {
    if (isOpen && session) {
      loadBrackets()
      loadSideGames()
    }
  }, [isOpen, session, activeTab])

  const loadBrackets = useCallback(async () => {
    if (!session?.id) return

    setLoading(true)
    setError(null)

    try {
      const response = await getBrackets(session.id, activeTab)
      if (response.success) {
        setBrackets(response.data)

        // Load entries for each bracket
        const entriesMap = {}
        for (const bracket of response.data) {
          const entriesResponse = await getBracketEntries(bracket.id)
          if (entriesResponse.success) {
            entriesMap[bracket.id] = entriesResponse.data
          }
        }
        setBracketEntries(entriesMap)
      } else {
        setError(response.error)
      }
    } catch (err) {
      setError('Failed to load brackets')
    } finally {
      setLoading(false)
    }
  }, [session?.id, activeTab])

  const loadSideGames = useCallback(async () => {
    if (!session?.id) return

    try {
      const types = ['high_game_scratch', 'high_game_handicap', 'eliminator']
      const entriesMap = {}

      for (const type of types) {
        const response = await getSideGameEntries(session.id, type, currentGame)
        if (response.success) {
          entriesMap[type] = response.data
        }
      }

      setSideGameEntries(entriesMap)
    } catch (err) {
      console.error('Failed to load side games:', err)
    }
  }, [session?.id, currentGame])

  const handleGenerateBrackets = useCallback(async () => {
    if (!session?.id) return

    setLoading(true)
    setError(null)

    try {
      const response = await generateBrackets(session.id, activeTab)
      if (response.success) {
        await loadBrackets()
      } else {
        setError(response.error)
      }
    } catch (err) {
      setError('Failed to generate brackets')
    } finally {
      setLoading(false)
    }
  }, [session?.id, activeTab, loadBrackets])

  const handleCalculateEliminatorCutoff = useCallback(async () => {
    if (!session?.id) return

    try {
      const response = await calculateEliminatorCutoff(session.id, currentGame)
      if (response.success) {
        setEliminatorCutoff(response.data)
        setShowEliminatorCutoff(true)
      } else {
        setError(response.error)
      }
    } catch (err) {
      setError('Failed to calculate eliminator cutoff')
    }
  }, [session?.id, currentGame])

  const handleProcessEliminations = useCallback(async () => {
    if (!eliminatorCutoff) return

    try {
      const response = await processEliminatorEliminations(
        session.id,
        currentGame,
        eliminatorCutoff.cutoff
      )
      if (response.success) {
        await loadSideGames()
        setShowEliminatorCutoff(false)
        setEliminatorCutoff(null)
      } else {
        setError(response.error)
      }
    } catch (err) {
      setError('Failed to process eliminations')
    }
  }, [session?.id, currentGame, eliminatorCutoff, loadSideGames])

  const getBracketTypeCount = (type) => {
    return sessionBowlers.filter((b) => b[`${type}_brackets`] > 0).length
  }

  const getSideGameCount = (type) => {
    return sessionBowlers.filter((b) => b[type]).length
  }

  const renderBracketTab = () => {
    const bowlerCount = getBracketTypeCount(activeTab)
    const canGenerate = bowlerCount >= 8 && bowlerCount % 8 === 0
    const needsMore = bowlerCount < 8 ? 8 - bowlerCount : bowlerCount % 8

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-white capitalize">{activeTab} Brackets</h3>
            <p className="text-sm text-gray-400">
              {bowlerCount} bowlers entered • {Math.floor(bowlerCount / 8)} possible brackets
            </p>
          </div>

          <div className="flex space-x-3">
            {!canGenerate && (
              <div className="text-sm text-yellow-400 bg-yellow-400/10 px-3 py-2 rounded border border-yellow-400/20">
                {bowlerCount < 8
                  ? `Need ${needsMore} more bowlers`
                  : `Need ${8 - needsMore} more bowlers or ${needsMore} fewer`}
              </div>
            )}

            {canGenerate && brackets.length === 0 && (
              <Button onClick={handleGenerateBrackets} variant="primary" disabled={loading}>
                Generate Brackets
              </Button>
            )}

            {brackets.length > 0 && (
              <>
                <Button onClick={() => setShowPrintView(true)} variant="ghost">
                  Print View
                </Button>
              </>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        )}

        {error && <ErrorMessage message={error} onRetry={loadBrackets} />}

        {brackets.length > 0 && (
          <div className="grid gap-6">
            {brackets.map((bracket) => (
              <BracketCard
                key={bracket.id}
                bracket={bracket}
                entries={bracketEntries[bracket.id] || []}
                onAddScores={() => {
                  setSelectedBracket(bracket)
                  setShowScoreModal(true)
                }}
              />
            ))}
          </div>
        )}

        {!loading && brackets.length === 0 && bowlerCount > 0 && !canGenerate && (
          <div className="text-center py-8 text-gray-400">
            Cannot generate brackets with current bowler count.
            <br />
            Adjust entries or add more bowlers to create complete 8-man brackets.
          </div>
        )}

        {!loading && bowlerCount === 0 && (
          <div className="text-center py-8 text-gray-400">
            No bowlers entered in {activeTab} brackets.
          </div>
        )}
      </div>
    )
  }

  const renderSideGameTab = (type) => {
    const bowlerCount = getSideGameCount(type)
    const entries = sideGameEntries[type] || []
    const typeTitle = {
      high_game_scratch: 'High Game Scratch',
      high_game_handicap: 'High Game Handicap',
      eliminator: 'Eliminator'
    }[type]

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-white">{typeTitle}</h3>
            <p className="text-sm text-gray-400">
              {bowlerCount} bowlers entered
              {type === 'eliminator' && ` • Game ${currentGame}`}
            </p>
          </div>

          {type === 'eliminator' && (
            <Button
              onClick={handleCalculateEliminatorCutoff}
              variant="secondary"
              disabled={entries.length === 0}
            >
              Show Cutoff
            </Button>
          )}
        </div>

        {bowlerCount === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No bowlers entered in {typeTitle.toLowerCase()}.
          </div>
        ) : (
          <div className="bg-[#262630] rounded-lg overflow-hidden border border-gray-600">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-gray-600 bg-[#363547]">
                  <th className="px-4 py-3">Bowler</th>
                  <th className="px-4 py-3">Score</th>
                  {type !== 'high_game_scratch' && <th className="px-4 py-3">Handicap Score</th>}
                  {type === 'eliminator' && <th className="px-4 py-3">Status</th>}
                  <th className="px-4 py-3">Position</th>
                </tr>
              </thead>
              <tbody>
                {sessionBowlers
                  .filter((b) => b[type])
                  .map((bowler) => {
                    const entry = entries.find((e) => e.session_bowler_id === bowler.id)
                    return (
                      <tr key={bowler.id} className="border-b border-gray-700">
                        <td className="px-4 py-3 text-white">{bowler.name}</td>
                        <td className="px-4 py-3 text-gray-300">{entry?.score || '-'}</td>
                        {type !== 'high_game_scratch' && (
                          <td className="px-4 py-3 text-gray-300">
                            {entry?.handicap_score || '-'}
                          </td>
                        )}
                        {type === 'eliminator' && (
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                entry?.is_eliminated
                                  ? 'bg-red-600 text-white'
                                  : 'bg-green-600 text-white'
                              }`}
                            >
                              {entry?.is_eliminated ? 'Eliminated' : 'Active'}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-gray-300">{entry?.position || '-'}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <div className="bg-[#2F2E3E] text-gray-300 h-[95vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-600">
          <h2 className="text-xl font-bold text-white">Bracket & Side Game Manager</h2>
          <Button onClick={onClose} variant="ghost" size="sm">
            ✕
          </Button>
        </div>

        {/* Navigation Dropdown */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-400">View:</label>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="bg-[#363547] text-white border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#F2545B]"
            >
              <option value="scratch">Scratch Brackets ({getBracketTypeCount('scratch')})</option>
              <option value="handicap">
                Handicap Brackets ({getBracketTypeCount('handicap')})
              </option>
              <option value="high_game_scratch">
                High Game Scratch ({getSideGameCount('high_game_scratch')})
              </option>
              <option value="high_game_handicap">
                High Game Handicap ({getSideGameCount('high_game_handicap')})
              </option>
              <option value="eliminator">Eliminator ({getSideGameCount('eliminator')})</option>
            </select>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {(activeTab === 'scratch' || activeTab === 'handicap') && renderBracketTab()}
          {activeTab === 'high_game_scratch' && renderSideGameTab('high_game_scratch')}
          {activeTab === 'high_game_handicap' && renderSideGameTab('high_game_handicap')}
          {activeTab === 'eliminator' && renderSideGameTab('eliminator')}
        </div>
      </div>

      {/* Eliminator Cutoff Modal */}
      <Modal isOpen={showEliminatorCutoff} onClose={() => setShowEliminatorCutoff(false)} size="sm">
        <div className="bg-[#2F2E3E] text-gray-300 p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            Eliminator Cutoff - Game {currentGame}
          </h3>

          {eliminatorCutoff && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#F2545B] mb-2">
                  {eliminatorCutoff.cutoff}
                </div>
                <p className="text-gray-400">Cutoff Score</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-green-400 font-bold">
                    {eliminatorCutoff.bowlers_above_cutoff}
                  </div>
                  <div className="text-gray-400">Above Cutoff</div>
                </div>
                <div className="text-center">
                  <div className="text-red-400 font-bold">
                    {eliminatorCutoff.bowlers_below_cutoff}
                  </div>
                  <div className="text-gray-400">Below Cutoff</div>
                </div>
              </div>

              {eliminatorCutoff.bowlers_below_cutoff > 0 && (
                <div className="flex justify-center space-x-3 pt-4">
                  <Button onClick={() => setShowEliminatorCutoff(false)} variant="ghost">
                    Cancel
                  </Button>
                  <Button onClick={handleProcessEliminations} variant="primary">
                    Eliminate {eliminatorCutoff.bowlers_below_cutoff} Bowlers
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Score Entry Modal */}
      <ScoreEntry
        isOpen={showScoreModal}
        onClose={() => {
          setShowScoreModal(false)
          setSelectedBracket(null)
        }}
        bracket={selectedBracket}
        entries={selectedBracket ? bracketEntries[selectedBracket.id] || [] : []}
        session={session}
        sessionBowlers={sessionBowlers}
        gameNumber={currentGame}
        onScoresUpdated={() => {
          loadBrackets()
          loadSideGames()
        }}
      />

      {/* Print View Modal */}
      <PrintableBracket
        isOpen={showPrintView}
        onClose={() => setShowPrintView(false)}
        brackets={brackets}
        bracketEntries={bracketEntries}
        type={activeTab}
        session={session}
      />
    </Modal>
  )
}

// Bracket Card Component
const BracketCard = ({ bracket, entries, onAddScores }) => {
  return (
    <div className="bg-[#262630] rounded-lg p-6 border border-gray-600">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-medium text-white">Bracket #{bracket.bracket_number}</h4>
        <div className="flex items-center space-x-2">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              bracket.status === 'forming'
                ? 'bg-yellow-600 text-white'
                : bracket.status === 'full'
                  ? 'bg-blue-600 text-white'
                  : bracket.status === 'started'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-600 text-white'
            }`}
          >
            {bracket.status}
          </span>
          <Button onClick={onAddScores} variant="secondary" size="sm">
            Add Scores
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 8 }, (_, i) => {
          const entry = entries.find((e) => e.position === i + 1)
          return (
            <div
              key={i}
              className="bg-[#3C3A4B] rounded p-4 text-center min-h-[100px] flex flex-col justify-center"
            >
              {entry ? (
                <>
                  <div className="text-white text-base font-medium mb-2">
                    {entry.session_bowler?.name || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-400 mb-1">Position {entry.position}</div>
                  <div className="text-lg font-bold text-[#F2545B]">{entry.total_score || 0}</div>
                  <div className="text-xs text-gray-500">Total Score</div>
                </>
              ) : (
                <div className="text-gray-500 text-sm">Position {i + 1}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BracketManager
