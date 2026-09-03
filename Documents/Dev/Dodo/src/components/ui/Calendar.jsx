import { useState } from 'react'

export default function Calendar({ value, onChange, minDate, maxDate }) {
  const [viewDate, setViewDate] = useState(value || new Date())

  const daysInMonth = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() + 1,
    0
  ).getDate()

  const firstDayOfMonth = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth(),
    1
  ).getDay()

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  }

  const selectDate = (day) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    onChange?.(newDate)
  }

  const isToday = (day) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      viewDate.getMonth() === today.getMonth() &&
      viewDate.getFullYear() === today.getFullYear()
    )
  }

  const isSelected = (day) => {
    if (!value) return false
    return (
      day === value.getDate() &&
      viewDate.getMonth() === value.getMonth() &&
      viewDate.getFullYear() === value.getFullYear()
    )
  }

  const renderEmptyDays = () => {
    return Array(firstDayOfMonth).fill(null).map((_, index) => (
      <div key={`empty-${index}`} className="calendar-day-empty" />
    ))
  }

  const renderDays = () => {
    return Array(daysInMonth).fill(null).map((_, index) => {
      const day = index + 1
      return (
        <button
          key={day}
          className={`calendar-day ${isToday(day) ? 'today' : ''} ${isSelected(day) ? 'selected' : ''}`}
          onClick={() => selectDate(day)}
        >
          {day}
        </button>
      )
    })
  }

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button onClick={prevMonth} className="calendar-nav" aria-label="Mois précédent">
          ‹
        </button>
        <span className="calendar-title">
          {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <button onClick={nextMonth} className="calendar-nav" aria-label="Mois suivant">
          ›
        </button>
      </div>
      <div className="calendar-grid">
        {dayNames.map((day) => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}
        {renderEmptyDays()}
        {renderDays()}
      </div>
    </div>
  )
}