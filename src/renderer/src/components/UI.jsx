import React from 'react'

export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div 
        className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-600 border-t-[#F2545B]`}
      />
    </div>
  )
}

export const ErrorMessage = ({ message, onRetry, className = '' }) => (
  <div className={`bg-red-900/20 border border-red-500 rounded p-4 ${className}`}>
    <div className="flex items-center space-x-2">
      <span className="text-red-400">⚠️</span>
      <span className="text-red-300">{message}</span>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
      >
        Retry
      </button>
    )}
  </div>
)

export const Toast = ({ message, type = 'info', onClose, duration = 5000 }) => {
  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const typeStyles = {
    success: 'bg-green-900/20 border-green-500 text-green-300',
    error: 'bg-red-900/20 border-red-500 text-red-300',
    warning: 'bg-yellow-900/20 border-yellow-500 text-yellow-300',
    info: 'bg-blue-900/20 border-blue-500 text-blue-300'
  }

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }

  return (
    <div className={`fixed top-4 right-4 z-50 border rounded p-4 shadow-lg max-w-sm ${typeStyles[type]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span>{icons[type]}</span>
          <span>{message}</span>
        </div>
        <button
          onClick={onClose}
          className="ml-4 hover:opacity-70"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  disabled = false,
  className = '',
  ...props 
}) => {
  const variants = {
    primary: 'bg-[#F2545B] hover:bg-red-600 text-white',
    secondary: 'bg-[#363547] hover:bg-[#4A4960] text-gray-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'bg-transparent hover:bg-[#3C3A4B] text-gray-400 hover:text-gray-200'
  }

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  return (
    <button
      className={`
        rounded font-semibold transition-colors duration-200 
        ${variants[variant]} 
        ${sizes[size]} 
        ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''} 
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <LoadingSpinner size="sm" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  )
}

export const Modal = ({ isOpen, onClose, title, children, className = '', size = 'md' }) => {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw] w-[95vw] h-[95vh]'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div className={`
        relative bg-[#2F2E3E] border border-gray-600 rounded-lg 
        ${sizeClasses[size]} w-full mx-4 max-h-[90vh] overflow-auto ${className}
      `}>
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-600">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
        {title ? (
          <div className="p-4">
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

export const Input = ({ 
  label, 
  error, 
  className = '', 
  containerClassName = '',
  ...props 
}) => (
  <div className={`space-y-1 ${containerClassName}`}>
    {label && (
      <label className="block text-sm font-medium text-gray-300">
        {label}
      </label>
    )}
    <input
      className={`
        w-full px-3 py-2 bg-[#363547] border border-gray-600 rounded
        placeholder-gray-500 text-gray-300
        focus:outline-none focus:ring-2 focus:ring-[#F2545B] focus:border-transparent
        ${error ? 'border-red-500' : ''}
        ${className}
      `}
      {...props}
    />
    {error && (
      <p className="text-sm text-red-400">{error}</p>
    )}
  </div>
)

export const Card = ({ title, children, className = '', actions }) => (
  <div className={`bg-[#262630] border border-gray-600 rounded-lg overflow-hidden ${className}`}>
    {title && (
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-600">
        <h3 className="text-lg font-medium text-white">{title}</h3>
        {actions && <div className="flex space-x-2">{actions}</div>}
      </div>
    )}
    <div className="p-4">
      {children}
    </div>
  </div>
)