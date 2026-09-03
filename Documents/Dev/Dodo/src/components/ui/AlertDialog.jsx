import { useEffect } from 'react'

export default function AlertDialog({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  variant = 'default',
}) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const variants = {
    default: 'border-slate-200',
    danger: 'border-red-200 bg-red-50',
    warning: 'border-amber-200 bg-amber-50',
    success: 'border-green-200 bg-green-50',
  }

  return (
    <div className="alert-dialog-overlay" onClick={onClose}>
      <div
        className={`alert-dialog ${variants[variant]}`}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-dialog-title"
      >
        <div className="alert-dialog-header">
          <h2 id="alert-dialog-title" className="alert-dialog-title">
            {title}
          </h2>
        </div>
        <div className="alert-dialog-content">
          <p>{description}</p>
        </div>
        <div className="alert-dialog-actions">
          <button onClick={onClose} className="btn btn-secondary">
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}