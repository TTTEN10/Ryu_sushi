import { useState } from 'react'

export default function Accordion({ items, allowMultiple = false }) {
  const [openIndices, setOpenIndices] = useState([])

  const toggle = (index) => {
    setOpenIndices((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index)
      } else {
        if (allowMultiple) {
          return [...prev, index]
        }
        return [index]
      }
    })
  }

  return (
    <div className="accordion">
      {items.map((item, index) => (
        <div
          key={index}
          className={`accordion-item ${openIndices.includes(index) ? 'active' : ''}`}
        >
          <button
            className="accordion-header"
            onClick={() => toggle(index)}
            aria-expanded={openIndices.includes(index)}
          >
            <span>{item.title}</span>
            <span className="accordion-icon">
              {openIndices.includes(index) ? '−' : '+'}
            </span>
          </button>
          <div
            className="accordion-content"
            style={{
              maxHeight: openIndices.includes(index) ? '500px' : '0',
              opacity: openIndices.includes(index) ? 1 : 0,
            }}
          >
            <div className="accordion-content-inner">
              {item.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}