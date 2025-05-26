import React, { useState, useEffect, useCallback, memo } from 'react'
import { useNavigate } from 'react-router'
import { useSessions } from '../hooks/useSessions'
import { useToast } from '../hooks/useToast'
import { LoadingSpinner, Button, Card, Toast } from './UI.jsx'
import CreateSessionModal from './session/CreateSessionModal'
import { formatCurrency, formatDate } from '../utils/format'

const Dashboard = memo(() => {
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)

  const {
    sessions,
    loading,
    error,
    actions: { loadSessions, createSession, deleteSession }
  } = useSessions()

  const { toasts, removeToast, success, error: showError } = useToast()

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const handleCreateSession = useCallback(
    async (sessionData) => {
      try {
        const result = await createSession(sessionData)
        if (result.success) {
          success(`Session "${sessionData.name}" created successfully!`)
          setShowCreateModal(false)
          return result
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        showError(`Failed to create session: ${error.message}`)
        throw error
      }
    },
    [createSession, success, showError]
  )

  const handleDeleteSession = useCallback(
    async (session) => {
      if (
        window.confirm(
          `Are you sure you want to delete "${session.name}"? This action cannot be undone.`
        )
      ) {
        try {
          const result = await deleteSession(session.id)
          if (result.success) {
            success(`Session "${session.name}" deleted successfully!`)
          } else {
            throw new Error(result.error)
          }
        } catch (error) {
          showError(`Failed to delete session: ${error.message}`)
        }
      }
    },
    [deleteSession, success, showError]
  )

  const handleStartSession = useCallback(
    (session) => {
      console.log('Navigating to session: ', session.id, session)
      navigate(`/session/${session.id}`)
    },
    [navigate]
  )

  const getStatusBadge = (status) => {
    const badges = {
      setup: 'bg-yellow-600 text-yellow-100',
      active: 'bg-green-600 text-green-100',
      completed: 'bg-gray-600 text-gray-100'
    }
    return `px-2 py-1 rounded text-xs font-medium ${badges[status] || badges.setup}`
  }

  const getTypeBadge = (type) => {
    const badges = {
      league: 'bg-blue-600 text-blue-100',
      tournament: 'bg-purple-600 text-purple-100'
    }
    return `px-2 py-1 rounded text-xs font-medium ${badges[type] || badges.league}`
  }

  if (loading && sessions.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#2F2E3E]">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-300">Loading dashboard...</p>
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
      <header className="flex items-center justify-between px-6 py-4 bg-[#3C3A4B] border-b border-gray-600">
        <div>
          <h1 className="text-2xl font-bold text-white">Bracketeer</h1>
          <p className="text-sm text-gray-400">Bowling Tournament Management</p>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          size="md"
          className="mac-no-drag"
          disabled={loading}
        >
          New Session
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500 rounded p-4">
            <div className="flex items-center space-x-2">
              <span className="text-red-400">⚠️</span>
              <span className="text-red-300">{error}</span>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Sessions</h2>
          <p className="text-gray-400">Manage your bowling tournaments and leagues</p>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎳</div>
            <h3 className="text-xl font-medium text-white mb-2">No sessions yet</h3>
            <p className="text-gray-400 mb-6">
              Create your first bowling session to get started with managing tournaments and
              leagues.
            </p>
            <Button onClick={() => setShowCreateModal(true)} variant="primary" size="lg">
              Create First Session
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className="hover:bg-[#2A2A3A] transition-colors cursor-pointer"
                title={
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white truncate mr-2">{session.name}</span>
                    <div className="flex space-x-2">
                      <span className={getTypeBadge(session.type)}>{session.type}</span>
                      <span className={getStatusBadge(session.status)}>{session.status}</span>
                    </div>
                  </div>
                }
                actions={
                  <div className="flex space-x-2">
                    {session.status === 'setup' && (
                      <Button
                        onClick={() => handleStartSession(session)}
                        variant="primary"
                        size="sm"
                      >
                        Start
                      </Button>
                    )}
                    {session.status === 'active' && (
                      <Button
                        onClick={() => handleStartSession(session)}
                        variant="secondary"
                        size="sm"
                      >
                        Continue
                      </Button>
                    )}
                    <Button
                      onClick={() => handleDeleteSession(session)}
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                    >
                      🗑️
                    </Button>
                  </div>
                }
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Handicap:</span>
                      <div className="font-medium">{session.handicap_percentage}%</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Bracket Price:</span>
                      <div className="font-medium">{formatCurrency(session.bracket_price)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">1st Place:</span>
                      <div className="font-medium text-green-400">
                        {formatCurrency(session.first_place_payout)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">2nd Place:</span>
                      <div className="font-medium text-blue-400">
                        {formatCurrency(session.second_place_payout)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-600 text-xs text-gray-500">
                    Created {formatDate(session.created)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {loading && sessions.length > 0 && (
          <div className="flex justify-center items-center py-4">
            <LoadingSpinner />
            <span className="ml-2">Loading sessions...</span>
          </div>
        )}
      </main>

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateSession}
      />
    </div>
  )
})

Dashboard.displayName = 'Dashboard'

export default Dashboard
