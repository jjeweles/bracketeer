// Utility functions for formatting data

export function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '$0.00'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export function formatDate(dateString) {
  if (!dateString) return 'Unknown'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Date'
    
    const now = new Date()
    const diffInMs = now - date
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) {
      return 'Today'
    } else if (diffInDays === 1) {
      return 'Yesterday'
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7)
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`
    } else {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date)
    }
  } catch (error) {
    return 'Invalid Date'
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return 'Unknown'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Date'
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  } catch (error) {
    return 'Invalid Date'
  }
}

export function formatScore(score) {
  if (typeof score !== 'number' || isNaN(score)) {
    return '0'
  }
  return score.toString()
}

export function formatHandicap(average, handicapPercentage = 80) {
  if (typeof average !== 'number' || isNaN(average)) {
    return 0
  }
  const handicap = Math.max(0, (200 - average) * (handicapPercentage / 100))
  return Math.round(handicap)
}

export function formatPercentage(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0%'
  }
  return `${value}%`
}

export function formatOrdinal(number) {
  if (typeof number !== 'number' || isNaN(number)) {
    return ''
  }
  
  const suffix = ['th', 'st', 'nd', 'rd']
  const v = number % 100
  return number + (suffix[(v - 20) % 10] || suffix[v] || suffix[0])
}