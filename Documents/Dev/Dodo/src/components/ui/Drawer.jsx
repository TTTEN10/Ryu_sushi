import { useEffect } from 'react'

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  size = 'md',
}) {
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

  const positions = {
    left: 'left-0',
    right: 'right-0',
  }

  const sizes = {
    sm: 'w-64',
    md: 'w-80',
    lg: 'w-96',
    xl: 'w-full',
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div
        className={`drawer ${positions[position]} ${sizes[size]}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="drawer-header">
          <h2 className="drawer-title">{title}</h2>
          <button onClick={onClose} className="drawer-close" aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="drawer-content">{children}</div>
      </div>
    </>
  )
}