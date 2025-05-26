import React, { useState, useCallback } from 'react'
import { Modal, Input, Button } from '../UI.jsx'
import { formatHandicap } from '../../utils/format'

const AddBowler = ({ isOpen, onClose, onAdd, session }) => {
  const [formData, setFormData] = useState({
    name: '',
    average: '',
    lane: '',
    scratch_brackets: '0',
    handicap_brackets: '0',
    high_game_scratch: false,
    high_game_handicap: false,
    eliminator: false
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = useCallback(() => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters'
    }
    
    if (!formData.average || isNaN(formData.average) || formData.average < 0 || formData.average > 300) {
      newErrors.average = 'Average must be between 0 and 300'
    }
    
    if (formData.lane && (isNaN(formData.lane) || formData.lane < 1 || formData.lane > 100)) {
      newErrors.lane = 'Lane must be between 1 and 100'
    }

    const scratchBrackets = parseInt(formData.scratch_brackets) || 0
    const handicapBrackets = parseInt(formData.handicap_brackets) || 0
    
    if (scratchBrackets < 0 || scratchBrackets > 10) {
      newErrors.scratch_brackets = 'Scratch brackets must be between 0 and 10'
    }
    
    if (handicapBrackets < 0 || handicapBrackets > 10) {
      newErrors.handicap_brackets = 'Handicap brackets must be between 0 and 10'
    }

    if (scratchBrackets === 0 && handicapBrackets === 0 && !formData.high_game_scratch && !formData.high_game_handicap && !formData.eliminator) {
      newErrors.entry = 'Bowler must enter at least one event'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field] || errors.entry) {
      setErrors(prev => ({ 
        ...prev, 
        [field]: null,
        entry: null
      }))
    }
  }, [errors])

  const handleCheckboxChange = useCallback((field, checked) => {
    setFormData(prev => ({ ...prev, [field]: checked }))
    if (errors[field] || errors.entry) {
      setErrors(prev => ({ 
        ...prev, 
        [field]: null,
        entry: null
      }))
    }
  }, [errors])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    
    try {
      const bowlerData = {
        session_id: session.id,
        name: formData.name.trim(),
        average: parseInt(formData.average),
        lane: formData.lane ? parseInt(formData.lane) : null,
        handicap: formatHandicap(parseInt(formData.average), session.handicap_percentage),
        scratch_brackets: parseInt(formData.scratch_brackets) || 0,
        handicap_brackets: parseInt(formData.handicap_brackets) || 0,
        high_game_scratch: formData.high_game_scratch,
        high_game_handicap: formData.high_game_handicap,
        eliminator: formData.eliminator
      }
      
      await onAdd(bowlerData)
      
      // Reset form
      setFormData({
        name: '',
        average: '',
        lane: '',
        scratch_brackets: '0',
        handicap_brackets: '0',
        high_game_scratch: false,
        high_game_handicap: false,
        eliminator: false
      })
      setErrors({})
      onClose()
    } catch (error) {
      setErrors({ submit: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, validateForm, onAdd, session, onClose])

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        average: '',
        lane: '',
        scratch_brackets: '0',
        handicap_brackets: '0',
        high_game_scratch: false,
        high_game_handicap: false,
        eliminator: false
      })
      setErrors({})
      onClose()
    }
  }, [isSubmitting, onClose])

  if (!session) return null

  const calculatedHandicap = formData.average ? 
    formatHandicap(parseInt(formData.average), session.handicap_percentage) : 0

  const totalCost = ((parseInt(formData.scratch_brackets) || 0) + (parseInt(formData.handicap_brackets) || 0)) * session.bracket_price

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Add Bowler to ${session.name}`}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bowler Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white border-b border-gray-600 pb-2">
            Bowler Information
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name *"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter bowler's name"
              error={errors.name}
              disabled={isSubmitting}
            />
            
            <Input
              label="Average *"
              type="number"
              value={formData.average}
              onChange={(e) => handleInputChange('average', e.target.value)}
              placeholder="0-300"
              min="0"
              max="300"
              error={errors.average}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Lane"
              type="number"
              value={formData.lane}
              onChange={(e) => handleInputChange('lane', e.target.value)}
              placeholder="1-100"
              min="1"
              max="100"
              error={errors.lane}
              disabled={isSubmitting}
            />
            
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-300">
                Calculated Handicap
              </label>
              <div className="px-3 py-2 bg-[#262630] border border-gray-600 rounded text-gray-300">
                {calculatedHandicap} pins
              </div>
            </div>
          </div>
        </div>

        {/* Bracket Entries */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white border-b border-gray-600 pb-2">
            Bracket Entries
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Scratch Brackets"
              type="number"
              value={formData.scratch_brackets}
              onChange={(e) => handleInputChange('scratch_brackets', e.target.value)}
              placeholder="0"
              min="0"
              max="10"
              error={errors.scratch_brackets}
              disabled={isSubmitting}
            />
            
            <Input
              label="Handicap Brackets"
              type="number"
              value={formData.handicap_brackets}
              onChange={(e) => handleInputChange('handicap_brackets', e.target.value)}
              placeholder="0"
              min="0"
              max="10"
              error={errors.handicap_brackets}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Side Games */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white border-b border-gray-600 pb-2">
            Side Games
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.high_game_scratch}
                onChange={(e) => handleCheckboxChange('high_game_scratch', e.target.checked)}
                className="w-4 h-4 text-[#F2545B] bg-[#363547] border-gray-600 rounded focus:ring-[#F2545B] focus:ring-2"
                disabled={isSubmitting}
              />
              <span className="text-sm font-medium text-gray-300">High Game Scratch</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.high_game_handicap}
                onChange={(e) => handleCheckboxChange('high_game_handicap', e.target.checked)}
                className="w-4 h-4 text-[#F2545B] bg-[#363547] border-gray-600 rounded focus:ring-[#F2545B] focus:ring-2"
                disabled={isSubmitting}
              />
              <span className="text-sm font-medium text-gray-300">High Game Handicap</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.eliminator}
                onChange={(e) => handleCheckboxChange('eliminator', e.target.checked)}
                className="w-4 h-4 text-[#F2545B] bg-[#363547] border-gray-600 rounded focus:ring-[#F2545B] focus:ring-2"
                disabled={isSubmitting}
              />
              <span className="text-sm font-medium text-gray-300">Eliminator</span>
            </label>
          </div>
        </div>

        {/* Cost Summary */}
        <div className="bg-[#262630] rounded p-4 border border-gray-600">
          <h4 className="text-sm font-medium text-white mb-2">Entry Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Bracket Entries:</span>
              <span className="text-gray-300">
                {(parseInt(formData.scratch_brackets) || 0) + (parseInt(formData.handicap_brackets) || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Cost:</span>
              <span className="text-white font-medium">${totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {errors.entry && (
          <div className="text-red-400 text-sm">{errors.entry}</div>
        )}
        
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
            Add Bowler
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AddBowler