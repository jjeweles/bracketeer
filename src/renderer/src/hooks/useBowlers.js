import { useState, useCallback, useMemo, useEffect } from 'react'
import apiService from '../services/api'

export function useBowlers() {
  const [bowlers, setBowlers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load bowlers on mount
  useEffect(() => {
    loadBowlers()
  }, [])

  const loadBowlers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiService.getBowlers()
      if (result.success) {
        setBowlers(result.data || [])
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const addBowler = useCallback(async (bowlerData) => {
    setLoading(true)
    setError(null)
    try {
      const validation = apiService.validateBowlerData(bowlerData)
      if (!validation.isValid) {
        throw new Error(Object.values(validation.errors)[0])
      }

      const formattedData = apiService.formatBowlerData(bowlerData)
      const result = await apiService.addBowler(formattedData)
      
      if (result.success) {
        const newBowler = {
          ...formattedData,
          id: result.data.id || Date.now()
        }
        setBowlers(prev => [...prev, newBowler])
        return { success: true, data: newBowler }
      }
      throw new Error(result.error || 'Failed to add bowler')
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const updateBowler = useCallback(async (bowlerId, updates) => {
    setLoading(true)
    setError(null)
    try {
      const validation = apiService.validateBowlerData(updates)
      if (!validation.isValid) {
        throw new Error(Object.values(validation.errors)[0])
      }

      const result = await apiService.updateBowler(bowlerId, updates)
      if (result.success) {
        setBowlers(prev => 
          prev.map(bowler => 
            bowler.id === bowlerId 
              ? { ...bowler, ...updates }
              : bowler
          )
        )
        return { success: true, data: result.data }
      }
      throw new Error(result.error || 'Failed to update bowler')
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteBowler = useCallback(async (bowlerId) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiService.deleteBowler(bowlerId)
      if (result.success) {
        setBowlers(prev => prev.filter(bowler => bowler.id !== bowlerId))
        return { success: true }
      }
      throw new Error(result.error || 'Failed to delete bowler')
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const clearBowlers = useCallback(() => {
    setBowlers([])
  }, [])

  const getBowlersByCategory = useCallback((category) => {
    return bowlers.filter(bowler => bowler.category === category)
  }, [bowlers])

  const searchBowlers = useCallback((searchTerm, category = null) => {
    const filtered = category 
      ? getBowlersByCategory(category)
      : bowlers
    
    if (!searchTerm) return filtered
    
    const lowerSearch = searchTerm.toLowerCase()
    return filtered.filter(bowler => 
      bowler.name.toLowerCase().includes(lowerSearch)
    )
  }, [bowlers, getBowlersByCategory])

  const bowlerStats = useMemo(() => ({
    total: bowlers.length,
    byCategory: bowlers.reduce((acc, bowler) => {
      acc[bowler.category] = (acc[bowler.category] || 0) + 1
      return acc
    }, {}),
    averageScore: bowlers.length > 0 
      ? Math.round(bowlers.reduce((sum, b) => sum + (b.average || 0), 0) / bowlers.length)
      : 0
  }), [bowlers])

  return {
    bowlers,
    loading,
    error,
    stats: bowlerStats,
    actions: {
      addBowler,
      updateBowler,
      deleteBowler,
      clearBowlers,
      getBowlersByCategory,
      searchBowlers,
      loadBowlers
    }
  }
}