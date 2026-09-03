import { useRef, useEffect } from 'react'

export default function ScrollArea({
  children,
  className = '',
  orientation = 'vertical',
  hideScrollbar = false,
}) {
  const scrollRef = useRef(null)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const handleWheel = (e) => {
      if (orientation === 'vertical') {
        element.scrollTop += e.deltaY
      } else {
        element.scrollLeft += e.deltaY
      }
    }

    element.addEventListener('wheel', handleWheel)
    return () => element.removeEventListener('wheel', handleWheel)
  }, [orientation])

  return (
    <div
      ref={scrollRef}
      className={`scroll-area ${orientation} ${hideScrollbar ? 'hide-scrollbar' : ''} ${className}`}
    >
      <div className="scroll-content">{children}</div>
    </div>
  )
}