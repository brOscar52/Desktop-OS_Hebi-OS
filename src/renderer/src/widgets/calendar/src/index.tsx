import { useState } from 'react'

export default function CalendarWidget(): JSX.Element {
  const [currentDate] = useState<Date>(new Date())

  const today = new Date()
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  const firstDayIndex = new Date(year, month, 1).getDay()
  const startOffset = (firstDayIndex + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

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
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        padding: '12px',
        boxSizing: 'border-box',
        color: 'var(--text-primary)',
        userSelect: 'none'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px'
        }}
      >
        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
          {monthNames[month]} {year}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--accent-color)' }}>
          Hoy
        </span>
      </div>

      {/* Weekday headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          textAlign: 'center',
          fontSize: '10px',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--text-tertiary)',
          marginBottom: '2px'
        }}
      >
        {weekDays.map((wd, i) => (
          <div key={`${wd}-${i}`}>{wd}</div>
        ))}
      </div>

      {/* Days grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          textAlign: 'center',
          gap: '1px',
          fontSize: '11px'
        }}
      >
        {days.slice(0, 28).map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} style={{ padding: '2px 0' }} />
          }

          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()

          return (
            <div
              key={`day-${day}`}
              style={{
                padding: '2px 0',
                borderRadius: 'var(--radius-full)',
                backgroundColor: isToday ? 'var(--accent-color)' : 'transparent',
                color: isToday ? 'var(--accent-text)' : 'var(--text-primary)',
                fontWeight: isToday ? 'var(--font-weight-bold)' : 'var(--font-weight-normal)'
              }}
            >
              {day}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          No hay eventos próximos
        </span>
      </div>
    </div>
  )
}
