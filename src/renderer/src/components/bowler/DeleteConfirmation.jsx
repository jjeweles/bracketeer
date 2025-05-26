import React, { useState, useCallback } from 'react'
import { Modal, Button } from '../UI.jsx'

const DeleteConfirmation = ({ isOpen, onClose, onConfirm, bowler, loading = false }) => {
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const isConfirmValid = confirmText.toLowerCase() === 'delete'

  const handleConfirm = useCallback(async () => {
    if (!isConfirmValid) return
    
    setIsDeleting(true)
    try {
      await onConfirm(bowler.id)
      setConfirmText('')
      onClose()
    } catch (error) {
      console.error('Delete confirmation error:', error)
    } finally {
      setIsDeleting(false)
    }
  }, [isConfirmValid, onConfirm, bowler, onClose])

  const handleClose = useCallback(() => {
    if (!isDeleting && !loading) {
      setConfirmText('')
      onClose()
    }
  }, [isDeleting, loading, onClose])

  const handleConfirmTextChange = useCallback((e) => {
    setConfirmText(e.target.value)
  }, [])

  if (!bowler) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete Bowler"
      className="max-w-md"
    >
      <div className="space-y-4">
        <div className="bg-red-900/20 border border-red-500 rounded p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-red-400">⚠️</span>
            <span className="text-red-300 font-medium">Warning</span>
          </div>
          <p className="text-red-200 text-sm">
            This action cannot be undone. This will permanently delete the bowler{' '}
            <strong>"{bowler.name}"</strong> and all their data.
          </p>
        </div>

        <div className="bg-[#262630] rounded p-4 border border-gray-600">
          <h4 className="text-white font-medium mb-2">Bowler Details</h4>
          <div className="space-y-1 text-sm text-gray-300">
            <div><strong>Name:</strong> {bowler.name}</div>
            <div><strong>Category:</strong> {bowler.category}</div>
            <div><strong>Average:</strong> {bowler.average}</div>
            <div><strong>Handicap:</strong> {bowler.handicap}</div>
            {bowler.lane && <div><strong>Lane:</strong> {bowler.lane}</div>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Type <strong>DELETE</strong> to confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={handleConfirmTextChange}
            placeholder="Type DELETE to confirm"
            className="w-full px-3 py-2 bg-[#363547] border border-gray-600 rounded
                       placeholder-gray-500 text-gray-300
                       focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            disabled={isDeleting || loading}
            autoComplete="off"
          />
          <p className="text-xs text-gray-500 mt-1">
            This field is case-insensitive
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-600">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isDeleting || loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            disabled={!isConfirmValid || isDeleting || loading}
            loading={isDeleting || loading}
          >
            {isDeleting || loading ? 'Deleting...' : 'Delete Bowler'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default DeleteConfirmation