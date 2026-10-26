import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useOS } from '@os/sdk'

export interface CalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  note?: string
  reminder?: 'none' | '0' | '5' | '15' | '30' | '60'
  schedulerJobId?: string
}

type CalendarView = 'month' | 'day'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const SHORT_WEEK_DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export default function CalendarApp(): JSX.Element {
  const os = useOS()

  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [view, setView] = useState<CalendarView>('month')
  const [events, setEvents] = useState<CalendarEvent[]>([])

  // Modal / Editor State
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [formTitle, setFormTitle] = useState<string>('')
  const [formDate, setFormDate] = useState<string>('')
  const [formStartTime, setFormStartTime] = useState<string>('09:00')
  const [formEndTime, setFormEndTime] = useState<string>('10:00')
  const [formNote, setFormNote] = useState<string>('')
  const [formReminder, setFormReminder] = useState<CalendarEvent['reminder']>('none')

  // Set window title
  useEffect(() => {
    os.window.setTitle('Calendario')
  }, [os.window])

  // Load events from storage
  const loadEvents = useCallback(async () => {
    const saved = await os.storage.get<CalendarEvent[]>('events')
    if (saved && Array.isArray(saved)) {
      setEvents(saved)
    } else {
      setEvents([])
    }
  }, [os.storage])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Save events and notify live listeners
  const persistEvents = async (nextEvents: CalendarEvent[]) => {
    setEvents(nextEvents)
    await os.storage.set('events', nextEvents)
    os.events.emit('calendar:events-changed', {})
  }

  // Navigation helpers
  const handlePrev = () => {
    if (view === 'month') {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    } else {
      const parts = selectedDate.split('-').map(Number)
      const d = new Date(parts[0], parts[1] - 1, parts[2] - 1)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      setSelectedDate(dateStr)
      setCurrentDate(d)
    }
  }

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    } else {
      const parts = selectedDate.split('-').map(Number)
      const d = new Date(parts[0], parts[1] - 1, parts[2] + 1)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      setSelectedDate(dateStr)
      setCurrentDate(d)
    }
  }

  const handleToday = () => {
    const now = new Date()
    setCurrentDate(now)
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    setSelectedDate(dateStr)
  }

  // Event modal open helpers
  const openNewEventModal = (date?: string) => {
    const targetDate = date || selectedDate
    setEditingEvent(null)
    setFormTitle('')
    setFormDate(targetDate)
    setFormStartTime('09:00')
    setFormEndTime('10:00')
    setFormNote('')
    setFormReminder('none')
    setIsEditorOpen(true)
  }

  const openEditEventModal = (event: CalendarEvent) => {
    setEditingEvent(event)
    setFormTitle(event.title)
    setFormDate(event.date)
    setFormStartTime(event.startTime)
    setFormEndTime(event.endTime)
    setFormNote(event.note || '')
    setFormReminder(event.reminder || 'none')
    setIsEditorOpen(true)
  }

  // Handle Save Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) return

    // Cancel previous scheduled job if any
    if (editingEvent?.schedulerJobId) {
      try {
        await os.scheduler.cancel(editingEvent.schedulerJobId)
      } catch {
        // ignore cancel error
      }
    }

    let schedulerJobId: string | undefined = undefined

    // Schedule reminder if configured
    if (formReminder && formReminder !== 'none') {
      const remMinutes = parseInt(formReminder, 10)
      const eventDateTime = new Date(`${formDate}T${formStartTime}:00`)
      const reminderTimestamp = eventDateTime.getTime() - remMinutes * 60 * 1000

      if (reminderTimestamp > Date.now()) {
        try {
          schedulerJobId = await os.scheduler.schedule({
            fireAt: reminderTimestamp,
            title: `Recordatorio: ${formTitle.trim()}`,
            body: `Comienza a las ${formStartTime}`,
            sound: true,
            repeat: 'none',
            payload: { date: formDate }
          })
        } catch {
          // scheduler error fallback
        }
      }
    }

    const eventPayload: CalendarEvent = {
      id: editingEvent ? editingEvent.id : `event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: formTitle.trim(),
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      note: formNote.trim() || undefined,
      reminder: formReminder,
      schedulerJobId
    }

    const nextEvents = editingEvent
      ? events.map((ev) => (ev.id === editingEvent.id ? eventPayload : ev))
      : [...events, eventPayload]

    await persistEvents(nextEvents)
    setIsEditorOpen(false)
  }

  // Handle Delete Event
  const handleDeleteEvent = async (event: CalendarEvent) => {
    const confirm = await os.dialogs.confirm({
      title: 'Eliminar evento',
      message: `¿Estás seguro de que deseas eliminar el evento "${event.title}"?`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true
    })

    if (!confirm) return

    if (event.schedulerJobId) {
      try {
        await os.scheduler.cancel(event.schedulerJobId)
      } catch {
        // ignore
      }
    }

    const next = events.filter((ev) => ev.id !== event.id)
    await persistEvents(next)
    if (isEditorOpen) setIsEditorOpen(false)
  }

  // Month grid calculations
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay()
    const startOffset = (firstDayIndex + 6) % 7 // Monday = 0
    const totalDays = new Date(year, month + 1, 0).getDate()

    const list: { dayNum: number; dateStr: string; isCurrentMonth: boolean }[] = []

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate()
    for (let i = startOffset - 1; i >= 0; i--) {
      const dNum = prevMonthDays - i
      const prevM = month === 0 ? 12 : month
      const prevY = month === 0 ? year - 1 : year
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`
      list.push({ dayNum: dNum, dateStr, isCurrentMonth: false })
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      list.push({ dayNum: d, dateStr, isCurrentMonth: true })
    }

    // Next month padding to fill grid
    const remaining = (7 - (list.length % 7)) % 7
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 11 ? 1 : month + 2
      const nextY = month === 11 ? year + 1 : year
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      list.push({ dayNum: d, dateStr, isCurrentMonth: false })
    }

    return list
  }, [year, month])

  const todayStr = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }, [])

  // Day View events sorted by start time
  const dayEvents = useMemo(() => {
    return events
      .filter((ev) => ev.date === selectedDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [events, selectedDate])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-family-base)',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* Top Header & Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-subtle)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            {MONTH_NAMES[month]} {year}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={handlePrev}
              title="Anterior"
              style={{
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
                cursor: 'pointer'
              }}
            >
              ←
            </button>
            <button
              type="button"
              onClick={handleNext}
              title="Siguiente"
              style={{
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
                cursor: 'pointer'
              }}
            >
              →
            </button>
            <button
              type="button"
              onClick={handleToday}
              style={{
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 10px',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-medium)',
                cursor: 'pointer'
              }}
            >
              Hoy
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* View switcher: Mes / Día */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              padding: '2px'
            }}
          >
            <button
              type="button"
              onClick={() => setView('month')}
              style={{
                border: 'none',
                backgroundColor: view === 'month' ? 'var(--accent-color)' : 'transparent',
                color: view === 'month' ? 'var(--accent-text)' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-xs)',
                padding: '4px 12px',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-medium)',
                cursor: 'pointer'
              }}
            >
              Mes
            </button>
            <button
              type="button"
              onClick={() => setView('day')}
              style={{
                border: 'none',
                backgroundColor: view === 'day' ? 'var(--accent-color)' : 'transparent',
                color: view === 'day' ? 'var(--accent-text)' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-xs)',
                padding: '4px 12px',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-medium)',
                cursor: 'pointer'
              }}
            >
              Día
            </button>
          </div>

          <button
            type="button"
            onClick={() => openNewEventModal()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent-color)',
              color: 'var(--accent-text)',
              border: 'none',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              cursor: 'pointer'
            }}
          >
            <span>+</span> Nuevo evento
          </button>
        </div>
      </div>

      {/* Main Calendar View Area */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {view === 'month' ? (
          /* Month View */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Weekday headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-subtle)',
                textAlign: 'center',
                padding: '6px 0',
                fontSize: '11px',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-secondary)'
              }}
            >
              {SHORT_WEEK_DAYS.map((d, idx) => (
                <div key={d} title={WEEK_DAYS[idx]}>
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gridAutoRows: '1fr',
                flex: 1,
                minHeight: 0
              }}
            >
              {monthDays.map((item) => {
                const isSelected = item.dateStr === selectedDate
                const isToday = item.dateStr === todayStr
                const dayEventList = events.filter((ev) => ev.date === item.dateStr)

                return (
                  <div
                    key={item.dateStr}
                    onClick={() => setSelectedDate(item.dateStr)}
                    onDoubleClick={() => openNewEventModal(item.dateStr)}
                    style={{
                      borderRight: '1px solid var(--border-subtle)',
                      borderBottom: '1px solid var(--border-subtle)',
                      padding: '4px 6px',
                      backgroundColor: isSelected
                        ? 'var(--accent-subtle)'
                        : item.isCurrentMonth
                          ? 'transparent'
                          : 'rgba(0, 0, 0, 0.05)',
                      opacity: item.isCurrentMonth ? 1 : 0.45,
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: isToday ? 700 : 500,
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          backgroundColor: isToday ? 'var(--accent-color)' : 'transparent',
                          color: isToday ? 'var(--accent-text)' : 'inherit'
                        }}
                      >
                        {item.dayNum}
                      </span>

                      {dayEventList.length > 0 && (
                        <span
                          style={{
                            fontSize: '9px',
                            color: 'var(--accent-color)',
                            fontWeight: 600
                          }}
                        >
                          {dayEventList.length}
                        </span>
                      )}
                    </div>

                    {/* Day event badges preview */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px', overflow: 'hidden' }}>
                      {dayEventList.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditEventModal(ev)
                          }}
                          title={`${ev.startTime} ${ev.title}`}
                          style={{
                            fontSize: '10px',
                            padding: '1px 4px',
                            borderRadius: '2px',
                            backgroundColor: 'var(--accent-subtle)',
                            color: 'var(--accent-color)',
                            borderLeft: '2px solid var(--accent-color)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {ev.startTime} {ev.title}
                        </div>
                      ))}
                      {dayEventList.length > 3 && (
                        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>
                          +{dayEventList.length - 3} más
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* Day View */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', overflowY: 'auto' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border-subtle)'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>
                  {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''} programado{dayEvents.length !== 1 ? 's' : ''}
                </span>
              </div>

              <button
                type="button"
                onClick={() => openNewEventModal(selectedDate)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--accent-color)',
                  color: 'var(--accent-text)',
                  border: 'none',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                + Añadir evento a este día
              </button>
            </div>

            {dayEvents.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '48px',
                  color: 'var(--text-tertiary)'
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>No hay eventos para este día</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  Haz clic en &quot;Añadir evento&quot; para programar una actividad.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: '4px solid var(--accent-color)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>{ev.title}</span>
                        {ev.reminder && ev.reminder !== 'none' && (
                          <span
                            title={`Aviso ${ev.reminder} min antes`}
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: 'var(--accent-subtle)',
                              color: 'var(--accent-color)',
                              fontWeight: 600
                            }}
                          >
                            🔔 {ev.reminder === '0' ? 'Al inicio' : `${ev.reminder}m antes`}
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        🕒 {ev.startTime} – {ev.endTime}
                      </span>

                      {ev.note && (
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                          {ev.note}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => openEditEventModal(ev)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          backgroundColor: 'var(--bg-card)',
                          color: '#ef4444',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Event Creation / Edit Modal */}
      {isEditorOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px'
          }}
          onClick={() => setIsEditorOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-window)',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-subtle)',
                fontSize: '15px',
                fontWeight: 600
              }}
            >
              {editingEvent ? 'Editar evento' : 'Nuevo evento'}
            </div>

            <form onSubmit={handleSaveEvent} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Título
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: Reunión de proyecto"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Fecha (AAAA-MM-DD)
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Hora inicio
                  </label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Hora fin
                  </label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Aviso / Recordatorio
                </label>
                <select
                  value={formReminder}
                  onChange={(e) => setFormReminder(e.target.value as CalendarEvent['reminder'])}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                >
                  <option value="none">Sin recordatorio</option>
                  <option value="0">Al momento del evento</option>
                  <option value="5">5 minutos antes</option>
                  <option value="15">15 minutos antes</option>
                  <option value="30">30 minutos antes</option>
                  <option value="60">1 hora antes</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Nota adicional
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalles del evento..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: 'var(--accent-color)',
                    color: 'var(--accent-text)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
