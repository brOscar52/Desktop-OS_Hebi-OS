import { useState, useEffect } from 'react'

export default function ClockWidget(): JSX.Element {
  const [time, setTime] = useState<Date>(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hours = time.getHours().toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')

  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]

  const dayName = days[time.getDay()]
  const dateStr = `${time.getDate()} de ${months[time.getMonth()]}, ${time.getFullYear()}`

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        padding: '16px',
        boxSizing: 'border-box',
        color: 'var(--text-primary)',
        userSelect: 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span
          style={{
            fontSize: '36px',
            fontWeight: 'var(--font-weight-bold)',
            letterSpacing: '-1px',
            color: 'var(--text-primary)'
          }}
        >
          {hours}:{minutes}
        </span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--accent-color)'
          }}
        >
          {seconds}
        </span>
      </div>

      <span
        style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--accent-color)',
          marginTop: '4px'
        }}
      >
        {dayName}
      </span>

      <span
        style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-secondary)',
          marginTop: '2px',
          textAlign: 'center'
        }}
      >
        {dateStr}
      </span>
    </div>
  )
}
