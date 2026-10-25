import React, { useState } from 'react'

export interface CalendarFlyoutProps {
  isOpen: boolean
  onClose: () => void
}

export const CalendarFlyout: React.FC<CalendarFlyoutProps> = ({ isOpen }) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  if (!isOpen) return null

  const today = new Date()
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

  // First day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayIndex = new Date(year, month, 1).getDay()
  // Adjust so Monday is 0
  const startOffset = (firstDayIndex + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const days: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) {
    days.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '56px',
        right: '16px',
        width: '320px',
        backgroundColor: 'var(--material-acrylic)',
        backdropFilter: 'var(--backdrop-filter-acrylic)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-flyout)',
        border: '1px solid var(--border-subtle)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 999900,
        fontFamily: 'var(--font-family-base)',
        color: 'var(--text-primary)',
        boxSizing: 'border-box',
        userSelect: 'none'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Month & Year Header with Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          onClick={handleToday}
          style={{
            fontSize: 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-semibold)',
            cursor: 'pointer'
          }}
          title="Ir a hoy"
        >
          {monthNames[month]} de {year}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12px'
            }}
          >
            ▲
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12px'
            }}
          >
            ▼
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--text-tertiary)'
        }}
      >
        {weekDays.map((wd) => (
          <div key={wd} style={{ padding: '4px 0' }}>
            {wd}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          textAlign: 'center',
          gap: '2px',
          fontSize: 'var(--font-size-xs)'
        }}
      >
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} style={{ padding: '6px 0' }} />
          }

          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()

          return (
            <div
              key={`day-${day}`}
              style={{
                padding: '6px 0',
                borderRadius: 'var(--radius-full)',
                backgroundColor: isToday ? 'var(--accent-color)' : 'transparent',
                color: isToday ? 'var(--accent-text)' : 'var(--text-primary)',
                fontWeight: isToday ? 'var(--font-weight-bold)' : 'var(--font-weight-normal)',
                cursor: 'pointer'
              }}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}
