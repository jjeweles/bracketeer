import { useState, useCallback, useMemo, useEffect } from 'react'
import apiService from '../services/api'

export function useSessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiService.getSessions()
      if (result.success) {
        setSessions(result.data || [])
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const createSession = useCallback(async (sessionData) => {
    setLoading(true)
    setError(null)
    try {
      const validation = apiService.validateSessionData(sessionData)
      if (!validation.isValid) {
        throw new Error(Object.values(validation.errors)[0])
      }

      const formattedData = apiService.formatSessionData(sessionData)
      const result = await apiService.createSession(formattedData)
      
      if (result.success) {
        const newSession = {
          ...formattedData,
          id: result.data.id || Date.now(),
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }
        setSessions(prev => [newSession, ...prev])
        return { success: true, data: newSession }
      }
      throw new Error(result.error || 'Failed to create session')
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSession = useCallback(async (sessionId, updates) => {
    setLoading(true)
    setError(null)
    try {
      const validation = apiService.validateSessionData(updates)
      if (!validation.isValid) {
        throw new Error(Object.values(validation.errors)[0])
      }

      const result = await apiService.updateSession(sessionId, updates)
      if (result.success) {
        setSessions(prev => 
          prev.map(session => 
            session.id === sessionId 
              ? { ...session, ...updates, updated: new Date().toISOString() }
              : session
          )
        )
        return { success: true, data: result.data }
      }
      throw new Error(result.error || 'Failed to update session')
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteSession = useCallback(async (sessionId) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiService.deleteSession(sessionId)
      if (result.success) {
        setSessions(prev => prev.filter(session => session.id !== sessionId))
        return { success: true }
      }
      throw new Error(result.error || 'Failed to delete session')
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const getSessionById = useCallback((sessionId) => {
    return sessions.find(session => session.id === sessionId)
  }, [sessions])

  const getSessionsByType = useCallback((type) => {
    return sessions.filter(session => session.type === type)
  }, [sessions])

  const getSessionsByStatus = useCallback((status) => {
    return sessions.filter(session => session.status === status)
  }, [sessions])

  const sessionStats = useMemo(() => ({
    total: sessions.length,
    byType: sessions.reduce((acc, session) => {
      acc[session.type] = (acc[session.type] || 0) + 1
      return acc
    }, {}),
    byStatus: sessions.reduce((acc, session) => {
      acc[session.status] = (acc[session.status] || 0) + 1
      return acc
    }, {}),
    activeSessions: sessions.filter(s => s.status === 'active').length,
    recentSessions: sessions.slice(0, 5)
  }), [sessions])

  return {
    sessions,
    loading,
    error,
    stats: sessionStats,
    actions: {
      loadSessions,
      createSession,
      updateSession,
      deleteSession,
      getSessionById,
      getSessionsByType,
      getSessionsByStatus
    }
  }
}