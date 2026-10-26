import { useState, useEffect, useCallback, useMemo } from 'react'
import { useOS } from '@os/sdk'

export interface CalendarEvent {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  note?: string
  reminder?: string
  schedulerJobId?: string
}

export default function CalendarWidget(): JSX.Element {
  const os = useOS()
  const [currentDate] = useState<Date>(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const todayStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  // Load events from calendar storage
  const loadEvents = useCallback(async () => {
    try {
      const saved = await os.storage.get<CalendarEvent[]>('events')
      if (saved && Array.isArray(saved)) {
        setEvents(saved)
      } else {
        setEvents([])
      }
    } catch {
      setEvents([])
    }
  }, [os.storage])

  useEffect(() => {
    loadEvents()
    const unsub = os.events.on('calendar:events-changed', () => {
      loadEvents()
    })
    return () => unsub()
  }, [loadEvents, os.events])

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

  // Find next upcoming event
  const upcomingEvent = useMemo(() => {
    const futureOrToday = events
      .filter((ev) => ev.date >= todayStr)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return a.startTime.localeCompare(b.startTime)
      })
    return futureOrToday[0] || null
  }, [events, todayStr])

  const handleOpenApp = () => {
    os.apps.launch('calendar')
  }

  return (
    <div
      onClick={handleOpenApp}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        padding: '12px',
        boxSizing: 'border-box',
        color: 'var(--text-primary)',
        userSelect: 'none',
        cursor: 'pointer'
      }}
      title="Abrir Calendario"
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
        <span style={{ fontSize: '11px', color: 'var(--accent-color)', fontWeight: 600 }}>
          Hoy {today.getDate()}
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

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = dateStr === todayStr
          const hasEvent = events.some((ev) => ev.date === dateStr)

          return (
            <div
              key={`day-${day}`}
              style={{
                position: 'relative',
                padding: '2px 0',
                borderRadius: 'var(--radius-full)',
                backgroundColor: isToday ? 'var(--accent-color)' : 'transparent',
                color: isToday ? 'var(--accent-text)' : 'var(--text-primary)',
                fontWeight: isToday ? 'var(--font-weight-bold)' : 'var(--font-weight-normal)'
              }}
            >
              {day}
              {hasEvent && !isToday && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '1px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '3px',
                    height: '3px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-color)'
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Footer: Upcoming Event */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '6px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {upcomingEvent ? (
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--accent-color)' }}>{upcomingEvent.startTime}</strong> {upcomingEvent.title} ({upcomingEvent.date === todayStr ? 'Hoy' : upcomingEvent.date})
          </span>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            No hay eventos próximos
          </span>
        )}
      </div>
    </div>
  )
}
