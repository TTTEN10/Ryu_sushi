import { useState } from 'react'

export default function Tooltip({
  children,
  content,
  position = 'top',
  delay = 200,
  className = '',
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [timer, setTimer] = useState(null)

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const showTooltip = () => {
    const t = setTimeout(() => setIsVisible(true), delay)
    setTimer(t)
  }

  const hideTooltip = () => {
    if (timer) clearTimeout(timer)
    setIsVisible(false)
  }

  return (
    <div
      className={`tooltip-wrapper ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {isVisible && (
        <div className={`tooltip ${positions[position]}`} role="tooltip">
          {content}
        </div>
      )}
    </div>
  )
}