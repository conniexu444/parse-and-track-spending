import React, { useEffect, useRef, useId } from 'react'
import PropTypes from 'prop-types'

function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  message = 'Are you sure? This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDangerous = true
}) {
  const modalRef = useRef(null)
  const triggerRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const onConfirmRef = useRef(onConfirm)
  const titleId = useId()

  // Keep refs updated without triggering effect re-runs
  useEffect(() => {
    onCloseRef.current = onClose
    onConfirmRef.current = onConfirm
  }, [onClose, onConfirm])

  // Handle all modal behavior in a single effect
  useEffect(() => {
    if (!isOpen) return

    const modal = modalRef.current
    if (!modal) return

    // Capture trigger element when modal opens
    if (!triggerRef.current) {
      triggerRef.current = document.activeElement
    }

    // Get all focusable elements (buttons)
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus cancel button first for safety
    const cancelButton = modal.querySelector('.confirm-cancel')
    if (cancelButton) {
      cancelButton.focus()
    } else {
      firstElement?.focus()
    }

    // Prevent body scroll
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e) => {
      // Close on Escape
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }

      // Trap focus within modal
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''

      // Return focus to trigger element
      if (triggerRef.current) {
        triggerRef.current.focus()
        triggerRef.current = null
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleOverlayClick}
    >
      <div className="modal confirm-delete-modal" ref={modalRef}>
        <div className="modal-header">
          <h3 id={titleId}>{title}</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close confirmation"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="confirm-cancel"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`confirm-action ${isDangerous ? 'danger' : ''}`}
            onClick={() => {
              onConfirmRef.current()
              onClose()
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

ConfirmDeleteModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  isDangerous: PropTypes.bool
}

export default ConfirmDeleteModal
