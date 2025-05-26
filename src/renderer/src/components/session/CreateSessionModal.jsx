import React, { useState, useCallback } from 'react'
import { Modal, Input, Button } from '../UI.jsx'

const CreateSessionModal = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'league',
    handicap_percentage: '80',
    bracket_price: '5.00'
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const calculatePayouts = (price) => {
    const priceNum = parseFloat(price) || 0
    const totalPot = priceNum * 8 // 8 person brackets
    const firstPlace = Math.round((totalPot * 0.6) * 100) / 100
    const secondPlace = Math.round((totalPot * 0.4) * 100) / 100
    return { firstPlace, secondPlace }
  }

  const { firstPlace, secondPlace } = calculatePayouts(formData.bracket_price)

  const validateForm = useCallback(() => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Session name is required'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters'
    }
    
    const handicapNum = parseInt(formData.handicap_percentage)
    if (isNaN(handicapNum) || handicapNum < 0 || handicapNum > 100) {
      newErrors.handicap_percentage = 'Handicap must be between 0 and 100'
    }
    
    const priceNum = parseFloat(formData.bracket_price)
    if (isNaN(priceNum) || priceNum <= 0) {
      newErrors.bracket_price = 'Bracket price must be greater than 0'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }, [errors])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    
    try {
      const sessionData = {
        name: formData.name.trim(),
        type: formData.type,
        handicap_percentage: parseInt(formData.handicap_percentage),
        bracket_price: parseFloat(formData.bracket_price),
        first_place_payout: firstPlace,
        second_place_payout: secondPlace,
        status: 'setup'
      }
      
      await onCreate(sessionData)
      
      // Reset form
      setFormData({
        name: '',
        type: 'league',
        handicap_percentage: '80',
        bracket_price: '5.00'
      })
      setErrors({})
    } catch (error) {
      setErrors({ submit: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, validateForm, onCreate, firstPlace, secondPlace])

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        type: 'league',
        handicap_percentage: '80',
        bracket_price: '5.00'
      })
      setErrors({})
      onClose()
    }
  }, [isSubmitting, onClose])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Session"
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Session Name *"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Friday Night League, Tournament 2025, etc."
          error={errors.name}
          disabled={isSubmitting}
        />
        
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-300">
            Session Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            className="w-full px-3 py-2 bg-[#363547] border border-gray-600 rounded
                       placeholder-gray-500 text-gray-300
                       focus:outline-none focus:ring-2 focus:ring-[#F2545B] focus:border-transparent"
            disabled={isSubmitting}
          >
            <option value="league">League</option>
            <option value="tournament">Tournament</option>
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Handicap Percentage *"
            type="number"
            value={formData.handicap_percentage}
            onChange={(e) => handleInputChange('handicap_percentage', e.target.value)}
            placeholder="80"
            min="0"
            max="100"
            error={errors.handicap_percentage}
            disabled={isSubmitting}
          />
          
          <Input
            label="Bracket Price *"
            type="number"
            step="0.01"
            value={formData.bracket_price}
            onChange={(e) => handleInputChange('bracket_price', e.target.value)}
            placeholder="5.00"
            min="0.01"
            error={errors.bracket_price}
            disabled={isSubmitting}
          />
        </div>

        {/* Payout Preview */}
        <div className="bg-[#262630] rounded p-4 border border-gray-600">
          <h4 className="text-sm font-medium text-white mb-2">Payout Preview (8-person brackets)</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">1st Place:</span>
              <div className="font-medium text-green-400">${firstPlace.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-400">2nd Place:</span>
              <div className="font-medium text-blue-400">${secondPlace.toFixed(2)}</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Total pot: ${(parseFloat(formData.bracket_price) * 8 || 0).toFixed(2)} (60/40 split)
          </div>
        </div>

        <div className="bg-blue-900/20 border border-blue-500 rounded p-3">
          <div className="text-sm text-blue-200">
            <strong>Handicap Calculation:</strong> (200 - average) × {formData.handicap_percentage}%
          </div>
        </div>
        
        {errors.submit && (
          <div className="text-red-400 text-sm">{errors.submit}</div>
        )}
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Create Session
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateSessionModal