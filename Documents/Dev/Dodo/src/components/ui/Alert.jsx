export default function Alert({
  variant = 'info',
  title,
  children,
  onClose,
  showIcon = true,
}) {
  const variants = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'ℹ️',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: '✓',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      icon: '⚠️',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: '✕',
    },
  }

  const style = variants[variant]

  return (
    <div className={`alert ${style.bg} ${style.border} ${style.text}`} role="alert">
      {showIcon && <span className="alert-icon">{style.icon}</span>}
      <div className="alert-content">
        {title && <h4 className="alert-title">{title}</h4>}
        <div className="alert-message">{children}</div>
      </div>
      {onClose && (
        <button onClick={onClose} className="alert-close" aria-label="Fermer">
          ✕
        </button>
      )}
    </div>
  )
}