import { useEffect } from 'react'

export default function Sheet({
  isOpen,
  onClose,
  children,
  side = 'right',
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

  const sides = {
    top: 'top-0 left-0 right-0 h-auto max-h-[50vh]',
    bottom: 'bottom-0 left-0 right-0 h-auto max-h-[50vh]',
    left: 'left-0 top-0 bottom-0 w-full max-w-sm',
    right: 'right-0 top-0 bottom-0 w-full max-w-sm',
  }

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div
        className={`sheet ${sides[side]}`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </>
  )
}