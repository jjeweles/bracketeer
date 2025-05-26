import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import apiService from '../services/api'

export function useSessionBowlers(sessionId) {
  const [sessionBowlers, setSessionBowlers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const loadingRef = useRef(false)

  // Load session bowlers on mount and when sessionId changes
  useEffect(() => {
    if (!sessionId || loadingRef.current) return
    
    const loadData = async () => {
      loadingRef.current = true
      setLoading(true)
      setError(null)
      try {
        const result = await apiService.getSessionBowlers(sessionId)
        if (result.success) {
          setSessionBowlers(result.data || [])
        } else {
          setError(result.error)
        }
      } catch (err) {
        if (err.message && !err.message.includes('autocancelled')) {
          setError(err.message)
        }
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    }

    const timer = setTimeout(loadData, 100)
    return () => clearTimeout(timer)
  }, [sessionId])

  const loadSessionBowlers = useCallback(async () => {
    if (!sessionId || loadingRef.current) return
    
    loadingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const result = await apiService.getSessionBowlers(sessionId)
      if (result.success) {
        setSessionBowlers(result.data || [])
      } else {
        setError(result.error)
      }
    } catch (err) {
      if (err.message && !err.message.includes('autocancelled')) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [sessionId])

  const addSessionBowler = useCallback(async (bowlerData) => {
    setLoading(true)
    setError(null)
    try {
      const validation = apiService.validateSessionBowlerData(bowlerData)
      if (!validation.isValid) {
        throw new Error(Object.values(validation.errors)[0])
      }

      const formattedData = apiService.formatSessionBowlerData(bowlerData)
      const result = await apiService.addSessionBowler(formattedData)
      
      if (result.success) {
        const newSessionBowler = {
          ...formattedData,
          id: result.data.id || Date.now()
        }
        setSessionBowlers(prev => [...prev, newSessionBowler])
        return { success: true, data: newSessionBowler }
      }
      throw new Error(result.error || 'Failed to add session bowler')
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSessionBowler = useCallback(async (bowlerId, updates) => {
    setLoading(true)
    setError(null)
    try {
      const validation = apiService.validateSessionBowlerData(updates)
      if (!validation.isValid) {
        throw new Error(Object.values(validation.errors)[0])
      }

      const result = await apiService.updateSessionBowler(bowlerId, updates)
      if (result.success) {
        setSessionBowlers(prev => 
          prev.map(bowler => 
            bowler.id === bowlerId 
              ? { ...bowler, ...updates }
              : bowler
          )
        )
        return { success: true, data: result.data }
      }
      throw new Error(result.error || 'Failed to update session bowler')
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteSessionBowler = useCallback(async (bowlerId) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiService.deleteSessionBowler(bowlerId)
      if (result.success) {
        setSessionBowlers(prev => prev.filter(bowler => bowler.id !== bowlerId))
        return { success: true }
      }
      throw new Error(result.error || 'Failed to delete session bowler')
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const clearSessionBowlers = useCallback(() => {
    setSessionBowlers([])
  }, [])

  const getBowlersByCategory = useCallback((category) => {
    switch (category) {
      case 'scratch':
        return sessionBowlers.filter(bowler => bowler.scratch_brackets > 0)
      case 'handicap':
        return sessionBowlers.filter(bowler => bowler.handicap_brackets > 0)
      case 'high_game_scratch':
        return sessionBowlers.filter(bowler => bowler.high_game_scratch)
      case 'high_game_handicap':
        return sessionBowlers.filter(bowler => bowler.high_game_handicap)
      case 'eliminator':
        return sessionBowlers.filter(bowler => bowler.eliminator)
      default:
        return sessionBowlers
    }
  }, [sessionBowlers])

  const searchSessionBowlers = useCallback((searchTerm, category = null) => {
    let filtered = category ? getBowlersByCategory(category) : sessionBowlers
    
    if (!searchTerm) return filtered
    
    const lowerSearch = searchTerm.toLowerCase()
    return filtered.filter(bowler => 
      bowler.name.toLowerCase().includes(lowerSearch)
    )
  }, [sessionBowlers, getBowlersByCategory])

  const sessionBowlerStats = useMemo(() => ({
    total: sessionBowlers.length,
    totalScratchBrackets: sessionBowlers.reduce((sum, b) => sum + (b.scratch_brackets || 0), 0),
    totalHandicapBrackets: sessionBowlers.reduce((sum, b) => sum + (b.handicap_brackets || 0), 0),
    totalBrackets: sessionBowlers.reduce((sum, b) => sum + (b.scratch_brackets || 0) + (b.handicap_brackets || 0), 0),
    highGameScratch: sessionBowlers.filter(b => b.high_game_scratch).length,
    highGameHandicap: sessionBowlers.filter(b => b.high_game_handicap).length,
    eliminator: sessionBowlers.filter(b => b.eliminator).length,
    averageScore: sessionBowlers.length > 0 
      ? Math.round(sessionBowlers.reduce((sum, b) => sum + (b.average || 0), 0) / sessionBowlers.length)
      : 0,
    averageHandicap: sessionBowlers.length > 0 
      ? Math.round(sessionBowlers.reduce((sum, b) => sum + (b.handicap || 0), 0) / sessionBowlers.length)
      : 0
  }), [sessionBowlers])

  return {
    sessionBowlers,
    loading,
    error,
    stats: sessionBowlerStats,
    actions: {
      loadSessionBowlers,
      addSessionBowler,
      updateSessionBowler,
      deleteSessionBowler,
      clearSessionBowlers,
      getBowlersByCategory,
      searchSessionBowlers
    }
  }
}