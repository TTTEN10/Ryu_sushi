import { useState } from 'react'

export default function Collapsible({
  trigger,
  children,
  defaultOpen = false,
  iconPosition = 'right',
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`collapsible ${isOpen ? 'open' : ''}`}>
      <button
        className="collapsible-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        {iconPosition === 'left' && (
          <span className="collapsible-icon">{isOpen ? '▼' : '▶'}</span>
        )}
        <span className="collapsible-title">{trigger}</span>
        {iconPosition === 'right' && (
          <span className="collapsible-icon">{isOpen ? '▼' : '▶'}</span>
        )}
      </button>
      <div
        className="collapsible-content"
        style={{
          maxHeight: isOpen ? '1000px' : '0',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        <div className="collapsible-inner">{children}</div>
      </div>
    </div>
  )
}