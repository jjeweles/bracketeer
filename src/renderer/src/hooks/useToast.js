import { useState, useCallback } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random()
    const toast = { id, message, type, duration }
    
    setToasts(prev => [...prev, toast])
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const success = useCallback((message, duration) => 
    addToast(message, 'success', duration), [addToast])
  
  const error = useCallback((message, duration) => 
    addToast(message, 'error', duration), [addToast])
  
  const warning = useCallback((message, duration) => 
    addToast(message, 'warning', duration), [addToast])
  
  const info = useCallback((message, duration) => 
    addToast(message, 'info', duration), [addToast])

  const clearAll = useCallback(() => {
    setToasts([])
  }, [])

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    clearAll
  }
}