import { useEffect, useState } from 'react'

export default function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  action,
}) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!isVisible) return null

  const types = {
    info: { bg: 'bg-blue-500', icon: 'ℹ️' },
    success: { bg: 'bg-green-500', icon: '✓' },
    warning: { bg: 'bg-amber-500', icon: '⚠️' },
    error: { bg: 'bg-red-500', icon: '✕' },
  }

  const style = types[type]

  return (
    <div className={`toast ${style.bg}`} role="alert">
      <span className="toast-icon">{style.icon}</span>
      <span className="toast-message">{message}</span>
      {action && (
        <button onClick={action.onClick} className="toast-action">
          {action.label}
        </button>
      )}
      <button onClick={() => { setIsVisible(false); onClose?.() }} className="toast-close">
        ✕
      </button>
    </div>
  )
}