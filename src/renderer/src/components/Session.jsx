import React, { useState, useEffect, useCallback, memo } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSessionBowlers } from '../hooks/useSessionBowlers'
import { useSessions } from '../hooks/useSessions'
import { useToast } from '../hooks/useToast'
import { BowlerRow, CategoryTab } from './BowlerComponents'
import { LoadingSpinner, ErrorMessage, Button, Input, Toast } from './UI'
import { AddBowler, EditBowler, DeleteConfirmation } from './bowler'
import { formatCurrency, formatHandicap } from '../utils/format'
import BracketManager from './session/BracketManager'
import SessionScoreManager from './session/SessionScoreManager'
import { progressBrackets } from '../services/bracketService'

const Session = memo(() => {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  const categories = [
    'scratch',
    'handicap',
    'high_game_scratch',
    'high_game_handicap',
    'eliminator'
  ]
  const [selectedCategory, setSelectedCategory] = useState('scratch')
  const [nameFilter, setNameFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedBowler, setSelectedBowler] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [currentSession, setCurrentSession] = useState(null)
  const [showBracketManager, setShowBracketManager] = useState(false)
  const [showScoreManager, setShowScoreManager] = useState(false)
  const [refreshingBrackets, setRefreshingBrackets] = useState(false)

  const {
    sessionBowlers,
    loading,
    error,
    stats,
    actions: {
      addSessionBowler,
      updateSessionBowler,
      deleteSessionBowler,
      clearSessionBowlers,
      searchSessionBowlers,
      loadSessionBowlers
    }
  } = useSessionBowlers(sessionId)

  const {
    sessions,
    actions: { loadSessions }
  } = useSessions()

  const { toasts, removeToast, success, error: showError, warning } = useToast()

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Initialize session when sessionId or sessions change
  useEffect(() => {
    if (!sessionId) {
      showError('No session ID provided')
      navigate('/')
      return
    }

    if (sessions.length === 0) {
      // Sessions are still loading
      return
    }

    // Find the current session
    const foundSession = sessions.find((s) => s.id === sessionId)
    if (foundSession) {
      setCurrentSession(foundSession)
    } else {
      showError('Session not found')
      navigate('/')
    }
    setIsInitializing(false)
  }, [sessionId, sessions, showError, navigate])

  const filteredBowlers = searchSessionBowlers(nameFilter, selectedCategory)

  const handleCategorySelect = useCallback((category) => {
    setSelectedCategory(category)
  }, [])

  const handleNameFilterChange = useCallback((e) => {
    setNameFilter(e.target.value)
  }, [])

  const handleAddBowler = useCallback(
    async (bowlerData) => {
      try {
        const result = await addSessionBowler(bowlerData)
        if (result.success) {
          success(`Bowler "${bowlerData.name}" added successfully!`)
          setShowAddModal(false)
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        showError(`Failed to add bowler: ${error.message}`)
        throw error
      }
    },
    [addSessionBowler, success, showError]
  )

  const handleEditBowler = useCallback((bowler) => {
    setSelectedBowler(bowler)
    setShowEditModal(true)
  }, [])

  const handleUpdateBowler = useCallback(
    async (bowlerId, updates) => {
      try {
        const result = await updateSessionBowler(bowlerId, updates)
        if (result.success) {
          success('Bowler updated successfully!')
          setShowEditModal(false)
          setSelectedBowler(null)
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        showError(`Failed to update bowler: ${error.message}`)
        throw error
      }
    },
    [updateSessionBowler, success, showError]
  )

  const handleDeleteBowler = useCallback((bowler) => {
    setSelectedBowler(bowler)
    setShowDeleteModal(true)
  }, [])

  const handleConfirmDelete = useCallback(
    async (bowlerId) => {
      try {
        const result = await deleteSessionBowler(bowlerId)
        if (result.success) {
          success(`Bowler deleted successfully!`)
          setShowDeleteModal(false)
          setSelectedBowler(null)
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        showError(`Failed to delete bowler: ${error.message}`)
        throw error
      }
    },
    [deleteSessionBowler, success, showError]
  )

  const handleClearBowlers = useCallback(() => {
    if (
      window.confirm('Are you sure you want to clear all bowlers? This action cannot be undone.')
    ) {
      clearSessionBowlers()
      warning('All bowlers have been cleared')
    }
  }, [clearSessionBowlers, warning])

  const handleRefresh = useCallback(async () => {
    try {
      await loadSessionBowlers()
      success('Bowlers refreshed successfully!')
    } catch (error) {
      showError('Failed to refresh bowlers')
    }
  }, [loadSessionBowlers, success, showError])

  const handleBackToDashboard = useCallback(() => {
    navigate('/')
  }, [navigate])

  const handleRefreshBrackets = useCallback(async () => {
    if (!currentSession?.id) return
    
    setRefreshingBrackets(true)
    try {
      // Progress both scratch and handicap brackets
      const scratchResponse = await progressBrackets(currentSession.id, 'scratch')
      const handicapResponse = await progressBrackets(currentSession.id, 'handicap')
      
      if (scratchResponse.success || handicapResponse.success) {
        success('Brackets refreshed successfully!')
      } else {
        showError('No brackets ready to progress')
      }
    } catch (error) {
      showError(`Failed to refresh brackets: ${error.message}`)
    } finally {
      setRefreshingBrackets(false)
    }
  }, [currentSession?.id, success, showError])

  const getCategoryCount = useCallback(
    (category) => {
      switch (category) {
        case 'scratch':
          return sessionBowlers.filter((b) => b.scratch_brackets > 0).length
        case 'handicap':
          return sessionBowlers.filter((b) => b.handicap_brackets > 0).length
        case 'high_game_scratch':
          return sessionBowlers.filter((b) => b.high_game_scratch).length
        case 'high_game_handicap':
          return sessionBowlers.filter((b) => b.high_game_handicap).length
        case 'eliminator':
          return sessionBowlers.filter((b) => b.eliminator).length
        default:
          return 0
      }
    },
    [sessionBowlers]
  )

  const getCategoryTitle = (category) => {
    const titles = {
      scratch: 'Scratch Brackets',
      handicap: 'Handicap Brackets',
      high_game_scratch: 'High Game Scratch',
      high_game_handicap: 'High Game Handicap',
      eliminator: 'Eliminator'
    }
    return titles[category] || category
  }

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#2F2E3E]">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-300">Loading session...</p>
        </div>
      </div>
    )
  }

  if (!currentSession) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#2F2E3E]">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-medium text-white mb-2">Session Not Found</h2>
          <p className="text-gray-400 mb-6">The session you're looking for doesn't exist.</p>
          <Button onClick={handleBackToDashboard} variant="primary">
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#2F2E3E] text-gray-300">
      {/* macOS drag region */}
      {window.electron?.platform === 'darwin' && (
        <div className="h-8 bg-[#3C3A4B] w-full mac-drag-region" />
      )}

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
            duration={toast.duration}
          />
        ))}
      </div>

      {/* Header */}
      <header className="flex items-center px-6 py-4 bg-[#3C3A4B] border-b border-gray-600">
        <Button
          onClick={handleBackToDashboard}
          variant="ghost"
          size="sm"
          className="mr-4 mac-no-drag"
        >
          ← Back
        </Button>

        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{currentSession.name}</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span className="capitalize">{currentSession.type}</span>
            <span>•</span>
            <span>{currentSession.handicap_percentage}% Handicap</span>
            <span>•</span>
            <span>{formatCurrency(currentSession.bracket_price)} per bracket</span>
            <span>•</span>
            <span
              className={`px-2 py-1 rounded text-xs font-medium text-black ${
                currentSession.status === 'setup'
                  ? 'bg-yellow-600'
                  : currentSession.status === 'active'
                    ? 'bg-green-600'
                    : 'bg-gray-600'
              }`}
            >
              {currentSession.status}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            onClick={() => setShowScoreManager(!showScoreManager)}
            variant={showScoreManager ? "primary" : "secondary"}
            size="md"
            className="mac-no-drag"
            disabled={loading}
          >
            {showScoreManager ? 'Hide Scores' : 'Enter Scores'}
          </Button>

          <Button
            onClick={handleRefreshBrackets}
            variant="secondary"
            size="md"
            className="mac-no-drag"
            disabled={loading || refreshingBrackets}
          >
            {refreshingBrackets ? 'Refreshing...' : 'Refresh Brackets'}
          </Button>

          <Button
            onClick={() => setShowBracketManager(true)}
            variant="secondary"
            size="md"
            className="mac-no-drag"
            disabled={loading}
          >
            Manage Brackets
          </Button>

          <Button
            onClick={() => setShowAddModal(true)}
            variant="primary"
            size="md"
            className="mac-no-drag"
            disabled={loading}
          >
            Add Bowler
          </Button>

          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            disabled={loading}
            title="Refresh bowlers"
            className="mac-no-drag"
          >
            Refresh
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-[#262630] p-6 flex flex-col space-y-4 overflow-y-auto border-r border-gray-600">
          <h3 className="text-lg text-white font-medium">Find bowler</h3>

          <Input
            type="text"
            placeholder="Search by name..."
            value={nameFilter}
            onChange={handleNameFilterChange}
            className="text-sm"
          />

          {error && <ErrorMessage message={error} onRetry={handleRefresh} className="text-xs" />}

          <div className="pt-4 border-t border-gray-600">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Session Statistics</h4>
            <div className="space-y-1 text-xs text-gray-500">
              <div>Total Bowlers: {stats.total}</div>
              <div>Average Score: {stats.averageScore}</div>
              <div>Current View: {getCategoryCount(selectedCategory)}</div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-600">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Categories</h4>
            <nav className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                    cat === selectedCategory
                      ? 'bg-[#F2545B] text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#3C3A4B]'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="capitalize">{getCategoryTitle(cat)}</span>
                    <span className="text-xs">{getCategoryCount(cat)}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto space-y-6">
          {/* Score Manager */}
          {showScoreManager && (
            <SessionScoreManager
              session={currentSession}
              sessionBowlers={sessionBowlers}
              onScoresUpdated={() => {
                loadSessionBowlers()
                success('Scores saved successfully!')
              }}
            />
          )}

          {/* Main Table Section */}
          <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">
              {getCategoryTitle(selectedCategory).toUpperCase()}
              <span className="text-sm font-normal text-gray-400 ml-2">
                ({filteredBowlers.length} {filteredBowlers.length === 1 ? 'bowler' : 'bowlers'})
              </span>
            </h2>

            <div className="flex space-x-2">
              <Button
                onClick={handleClearBowlers}
                variant="ghost"
                size="sm"
                disabled={sessionBowlers.length === 0 || loading}
              >
                Clear bowlers 🗑️
              </Button>
            </div>
          </div>

          {loading && (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner />
              <span className="ml-2">Loading bowlers...</span>
            </div>
          )}

          {!loading && (
            <div className="bg-[#262630] rounded-lg overflow-hidden border border-gray-600">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left text-sm text-gray-400 border-b border-gray-600 bg-[#363547]">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Lane</th>
                    <th className="px-4 py-3">Average</th>
                    <th className="px-4 py-3">Handicap</th>
                    <th className="px-4 py-3">Scratch</th>
                    <th className="px-4 py-3">Handicap</th>
                    <th className="px-4 py-3">Side Games</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBowlers.map((bowler) => (
                    <tr
                      key={bowler.id}
                      className="border-b border-gray-700 hover:bg-[#3C3A4B] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{bowler.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        {bowler.lane ? (
                          <span className="text-gray-300">{bowler.lane}</span>
                        ) : (
                          <span className="text-gray-500 italic">Not assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300">{bowler.average || 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300">{bowler.handicap || 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300">{bowler.scratch_brackets || 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300">{bowler.handicap_brackets || 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-1">
                          {bowler.high_game_scratch && (
                            <span className="text-xs bg-blue-600 px-1 rounded">HGS</span>
                          )}
                          {bowler.high_game_handicap && (
                            <span className="text-xs bg-green-600 px-1 rounded">HGH</span>
                          )}
                          {bowler.eliminator && (
                            <span className="text-xs bg-purple-600 px-1 rounded">ELIM</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleEditBowler(bowler)}
                            variant="secondary"
                            size="sm"
                            className="px-2 py-1"
                            title="Edit bowler"
                          >
                            ✏️
                          </Button>
                          <Button
                            onClick={() => handleDeleteBowler(bowler)}
                            variant="secondary"
                            size="sm"
                            className="px-2 py-1 hover:bg-red-600"
                            title="Delete bowler"
                          >
                            ✖️
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredBowlers.length === 0 && (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                        {nameFilter ? (
                          <>
                            No bowlers found matching "{nameFilter}" in{' '}
                            {getCategoryTitle(selectedCategory).toLowerCase()}.
                            <br />
                            <Button
                              onClick={() => setNameFilter('')}
                              variant="ghost"
                              size="sm"
                              className="mt-2"
                            >
                              Clear search
                            </Button>
                          </>
                        ) : (
                          <>
                            No bowlers in {getCategoryTitle(selectedCategory).toLowerCase()}.
                            <br />
                            <Button
                              onClick={() => setShowAddModal(true)}
                              variant="primary"
                              size="sm"
                              className="mt-2"
                            >
                              Add your first bowler
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <AddBowler
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddBowler}
        session={currentSession}
      />

      <EditBowler
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedBowler(null)
        }}
        onUpdate={handleUpdateBowler}
        bowler={selectedBowler}
        session={currentSession}
      />

      <DeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedBowler(null)
        }}
        onConfirm={handleConfirmDelete}
        bowler={selectedBowler}
        loading={loading}
      />

      <BracketManager
        isOpen={showBracketManager}
        onClose={() => setShowBracketManager(false)}
        session={currentSession}
        sessionBowlers={sessionBowlers}
      />
    </div>
  )
})

Session.displayName = 'Session'

export default Session
