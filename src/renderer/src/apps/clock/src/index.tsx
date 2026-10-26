import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useOS, useSystemVolume } from '@os/sdk'

type ClockTab = 'world' | 'alarms' | 'timer' | 'stopwatch'

interface WorldCity {
  id: string
  name: string
  country: string
  timezone: string
}

const DEFAULT_CITIES: WorldCity[] = [
  { id: 'madrid', name: 'Madrid', country: 'España', timezone: 'Europe/Madrid' },
  { id: 'london', name: 'Londres', country: 'Reino Unido', timezone: 'Europe/London' },
  { id: 'newyork', name: 'Nueva York', country: 'Estados Unidos', timezone: 'America/New_York' },
  { id: 'tokyo', name: 'Tokio', country: 'Japón', timezone: 'Asia/Tokyo' },
  { id: 'caracas', name: 'Caracas', country: 'Venezuela', timezone: 'America/Caracas' },
  { id: 'buenosaires', name: 'Buenos Aires', country: 'Argentina', timezone: 'America/Argentina/Buenos_Aires' }
]

interface AlarmItem {
  id: string
  time: string // HH:mm
  label: string
  repeat: 'none' | 'daily' | 'weekdays'
  enabled: boolean
  jobId?: string
}

interface LapRecord {
  lapNumber: number
  splitTimeMs: number
  totalTimeMs: number
}

export default function ClockApp(): JSX.Element {
  const os = useOS()
  const volume = useSystemVolume()

  const [activeTab, setActiveTab] = useState<ClockTab>('alarms')

  // Clock title
  useEffect(() => {
    os.window.setTitle('Reloj')
  }, [os.window])

  // Current local time ticker (for world clock and header)
  const [now, setNow] = useState<Date>(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // ----------------------------------------------------
  // TAB 1: RELOJ MUNDIAL
  // ----------------------------------------------------
  const [cities, setCities] = useState<WorldCity[]>([])
  const [isAddCityOpen, setIsAddCityOpen] = useState<boolean>(false)
  const [newCityName, setNewCityName] = useState<string>('')
  const [newCityTz, setNewCityTz] = useState<string>('America/New_York')

  useEffect(() => {
    os.storage.get<WorldCity[]>('world_cities').then((saved) => {
      if (saved && Array.isArray(saved) && saved.length > 0) {
        setCities(saved)
      } else {
        setCities(DEFAULT_CITIES.slice(0, 3))
      }
    })
  }, [os.storage])

  const saveCities = async (next: WorldCity[]) => {
    setCities(next)
    await os.storage.set('world_cities', next)
  }

  const handleAddCity = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCityName.trim()) return

    const newCity: WorldCity = {
      id: `city-${Date.now()}`,
      name: newCityName.trim(),
      country: 'Personalizado',
      timezone: newCityTz
    }
    const next = [...cities, newCity]
    saveCities(next)
    setNewCityName('')
    setIsAddCityOpen(false)
  }

  const handleRemoveCity = (id: string) => {
    const next = cities.filter((c) => c.id !== id)
    saveCities(next)
  }

  const getTimeInTz = (tz: string) => {
    try {
      return now.toLocaleTimeString('es-ES', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return '--:--:--'
    }
  }

  const getTimeDiff = (tz: string): string => {
    try {
      const localDate = new Date(now.toLocaleString('en-US'))
      const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }))
      const diffHours = Math.round((tzDate.getTime() - localDate.getTime()) / (1000 * 60 * 60))
      if (diffHours === 0) return 'Misma hora que la local'
      return `${diffHours > 0 ? '+' : ''}${diffHours} h respecto a la local`
    } catch {
      return ''
    }
  }

  // ----------------------------------------------------
  // TAB 2: ALARMAS
  // ----------------------------------------------------
  const [alarms, setAlarms] = useState<AlarmItem[]>([])
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState<boolean>(false)
  const [editingAlarm, setEditingAlarm] = useState<AlarmItem | null>(null)
  const [alarmTime, setAlarmTime] = useState<string>('07:00')
  const [alarmLabel, setAlarmLabel] = useState<string>('Alarma')
  const [alarmRepeat, setAlarmRepeat] = useState<AlarmItem['repeat']>('none')

  const loadAlarms = useCallback(async () => {
    const saved = await os.storage.get<AlarmItem[]>('alarms')
    if (saved && Array.isArray(saved)) {
      setAlarms(saved)
    } else {
      setAlarms([
        { id: 'alarm-1', time: '07:00', label: 'Despertador', repeat: 'weekdays', enabled: false },
        { id: 'alarm-2', time: '08:30', label: 'Trabajo', repeat: 'daily', enabled: false }
      ])
    }
  }, [os.storage])

  useEffect(() => {
    loadAlarms()
  }, [loadAlarms])

  const scheduleAlarmJob = async (alarm: AlarmItem): Promise<string | undefined> => {
    const [hh, mm] = alarm.time.split(':').map(Number)
    const target = new Date()
    target.setHours(hh, mm, 0, 0)

    if (target.getTime() <= Date.now()) {
      target.setDate(target.getDate() + 1)
    }

    try {
      const jobId = await os.scheduler.schedule({
        fireAt: target.getTime(),
        title: alarm.label || 'Alarma',
        body: `Alarma programada para las ${alarm.time}`,
        repeat: alarm.repeat,
        sound: true,
        payload: { tab: 'alarms' }
      })
      return jobId
    } catch {
      return undefined
    }
  }

  const cancelAlarmJob = async (jobId?: string) => {
    if (!jobId) return
    try {
      await os.scheduler.cancel(jobId)
    } catch {
      // ignore
    }
  }

  const toggleAlarm = async (alarm: AlarmItem) => {
    const willEnable = !alarm.enabled
    let nextJobId: string | undefined = undefined

    if (willEnable) {
      nextJobId = await scheduleAlarmJob(alarm)
    } else {
      await cancelAlarmJob(alarm.jobId)
    }

    const updated = alarms.map((a) =>
      a.id === alarm.id ? { ...a, enabled: willEnable, jobId: nextJobId } : a
    )
    setAlarms(updated)
    await os.storage.set('alarms', updated)
  }

  const handleSaveAlarm = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingAlarm?.jobId) {
      await cancelAlarmJob(editingAlarm.jobId)
    }

    const newAlarmData: AlarmItem = {
      id: editingAlarm ? editingAlarm.id : `alarm-${Date.now()}`,
      time: alarmTime,
      label: alarmLabel.trim() || 'Alarma',
      repeat: alarmRepeat,
      enabled: true
    }

    const jobId = await scheduleAlarmJob(newAlarmData)
    newAlarmData.jobId = jobId

    const next = editingAlarm
      ? alarms.map((a) => (a.id === editingAlarm.id ? newAlarmData : a))
      : [...alarms, newAlarmData]

    setAlarms(next)
    await os.storage.set('alarms', next)
    setIsAlarmModalOpen(false)
  }

  const handleDeleteAlarm = async (alarm: AlarmItem) => {
    await cancelAlarmJob(alarm.jobId)
    const next = alarms.filter((a) => a.id !== alarm.id)
    setAlarms(next)
    await os.storage.set('alarms', next)
    if (isAlarmModalOpen) setIsAlarmModalOpen(false)
  }

  const openCreateAlarmModal = () => {
    setEditingAlarm(null)
    setAlarmTime('07:00')
    setAlarmLabel('Alarma')
    setAlarmRepeat('none')
    setIsAlarmModalOpen(true)
  }

  const openEditAlarmModal = (alarm: AlarmItem) => {
    setEditingAlarm(alarm)
    setAlarmTime(alarm.time)
    setAlarmLabel(alarm.label)
    setAlarmRepeat(alarm.repeat)
    setIsAlarmModalOpen(true)
  }

  // ----------------------------------------------------
  // TAB 3: TEMPORIZADOR
  // ----------------------------------------------------
  const [timerHours, setTimerHours] = useState<number>(0)
  const [timerMinutes, setTimerMinutes] = useState<number>(5)
  const [timerSeconds, setTimerSeconds] = useState<number>(0)
  const [timerRemainingMs, setTimerRemainingMs] = useState<number>(5 * 60 * 1000)
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false)
  const [timerJobId, setTimerJobId] = useState<string | null>(null)

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const stopTimerInterval = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }

  const startTimer = async () => {
    const totalMs = timerRemainingMs > 0 ? timerRemainingMs : (timerHours * 3600 + timerMinutes * 60 + timerSeconds) * 1000
    if (totalMs <= 0) return

    setTimerRemainingMs(totalMs)
    setIsTimerRunning(true)

    // Schedule background notification/sound via scheduler
    const fireDate = new Date(Date.now() + totalMs)

    try {
      const jobId = await os.scheduler.schedule({
        fireAt: fireDate.getTime(),
        title: 'Temporizador completado',
        body: 'El tiempo del temporizador ha finalizado',
        repeat: 'none',
        sound: true,
        payload: { tab: 'timer' }
      })
      setTimerJobId(jobId)
    } catch {
      // ignore
    }

    const startTimestamp = Date.now()
    const targetTimestamp = startTimestamp + totalMs

    timerIntervalRef.current = setInterval(() => {
      const left = Math.max(0, targetTimestamp - Date.now())
      setTimerRemainingMs(left)
      if (left <= 0) {
        stopTimerInterval()
        setIsTimerRunning(false)
        if (volume > 0) {
          os.sound.playSystem('alarm')
        }
        os.notify({
          title: 'Temporizador finalizado',
          body: 'El tiempo configurado ha terminado.',
          sound: true
        })
      }
    }, 100)
  }

  const pauseTimer = async () => {
    stopTimerInterval()
    setIsTimerRunning(false)
    if (timerJobId) {
      try {
        await os.scheduler.cancel(timerJobId)
      } catch {
        // ignore
      }
      setTimerJobId(null)
    }
  }

  const resetTimer = async () => {
    pauseTimer()
    const initial = (timerHours * 3600 + timerMinutes * 60 + timerSeconds) * 1000
    setTimerRemainingMs(initial)
  }

  const formatTimerDigits = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // ----------------------------------------------------
  // TAB 4: CRONÓMETRO
  // ----------------------------------------------------
  const [stopwatchMs, setStopwatchMs] = useState<number>(0)
  const [isStopwatchRunning, setIsStopwatchRunning] = useState<boolean>(false)
  const [laps, setLaps] = useState<LapRecord[]>([])

  const stopwatchIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const stopwatchStartTimeRef = useRef<number>(0)
  const stopwatchAccumulatedRef = useRef<number>(0)

  const startStopwatch = () => {
    setIsStopwatchRunning(true)
    stopwatchStartTimeRef.current = Date.now()

    stopwatchIntervalRef.current = setInterval(() => {
      const delta = Date.now() - stopwatchStartTimeRef.current
      setStopwatchMs(stopwatchAccumulatedRef.current + delta)
    }, 10)
  }

  const pauseStopwatch = () => {
    if (stopwatchIntervalRef.current) {
      clearInterval(stopwatchIntervalRef.current)
      stopwatchIntervalRef.current = null
    }
    stopwatchAccumulatedRef.current = stopwatchMs
    setIsStopwatchRunning(false)
  }

  const resetStopwatch = () => {
    if (stopwatchIntervalRef.current) {
      clearInterval(stopwatchIntervalRef.current)
      stopwatchIntervalRef.current = null
    }
    stopwatchAccumulatedRef.current = 0
    setStopwatchMs(0)
    setIsStopwatchRunning(false)
    setLaps([])
  }

  const addLap = () => {
    const currentTotal = stopwatchMs
    const previousTotal = laps.length > 0 ? laps[0].totalTimeMs : 0
    const split = currentTotal - previousTotal

    const newLap: LapRecord = {
      lapNumber: laps.length + 1,
      splitTimeMs: split,
      totalTimeMs: currentTotal
    }
    setLaps([newLap, ...laps])
  }

  const formatStopwatch = (ms: number) => {
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    const cs = Math.floor((ms % 1000) / 10)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
  }

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
      {/* Top Tab Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-subtle)'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('alarms')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: activeTab === 'alarms' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'alarms' ? 'var(--accent-text)' : 'var(--text-primary)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-medium)',
            cursor: 'pointer'
          }}
        >
          ⏰ Alarmas
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('world')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: activeTab === 'world' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'world' ? 'var(--accent-text)' : 'var(--text-primary)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-medium)',
            cursor: 'pointer'
          }}
        >
          🌐 Reloj mundial
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timer')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: activeTab === 'timer' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'timer' ? 'var(--accent-text)' : 'var(--text-primary)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-medium)',
            cursor: 'pointer'
          }}
        >
          ⏳ Temporizador
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stopwatch')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: activeTab === 'stopwatch' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'stopwatch' ? 'var(--accent-text)' : 'var(--text-primary)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-medium)',
            cursor: 'pointer'
          }}
        >
          ⏱ Cronómetro
        </button>
      </div>

      {/* Main Tab Views */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '16px' }}>
        {/* ================= ALARMS TAB ================= */}
        {activeTab === 'alarms' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Alarmas configuradas</h3>
              <button
                type="button"
                onClick={openCreateAlarmModal}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--accent-color)',
                  color: 'var(--accent-text)',
                  border: 'none',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                + Añadir alarma
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {alarms.map((alarm) => (
                <div
                  key={alarm.id}
                  onClick={() => openEditAlarmModal(alarm)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontSize: '28px', fontWeight: 600, color: alarm.enabled ? 'var(--accent-color)' : 'var(--text-secondary)' }}>
                      {alarm.time}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{alarm.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {alarm.repeat === 'daily' ? 'Todos los días' : alarm.repeat === 'weekdays' ? 'Lunes a viernes' : 'Solo una vez'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
                    {/* Toggle Switch */}
                    <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                      <input
                        type="checkbox"
                        checked={alarm.enabled}
                        onChange={() => toggleAlarm(alarm)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          inset: 0,
                          backgroundColor: alarm.enabled ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.2)',
                          borderRadius: '24px',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            height: '18px',
                            width: '18px',
                            left: alarm.enabled ? '23px' : '3px',
                            bottom: '3px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '50%',
                            transition: 'left 0.2s'
                          }}
                        />
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleDeleteAlarm(alarm)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= WORLD CLOCK TAB ================= */}
        {activeTab === 'world' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
            {/* Local Time Card */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderLeft: '4px solid var(--accent-color)'
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Hora local</span>
                <h2 style={{ margin: '2px 0 0 0', fontSize: '20px' }}>Sistema</h2>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  {now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 600, color: 'var(--accent-color)' }}>
                {now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Ciudades del mundo</h3>
              <button
                type="button"
                onClick={() => setIsAddCityOpen(true)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--accent-color)',
                  color: 'var(--accent-text)',
                  border: 'none',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                + Añadir ciudad
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {cities.map((city) => (
                <div
                  key={city.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    position: 'relative'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleRemoveCity(city.id)}
                    title="Quitar ciudad"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-tertiary)',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ✕
                  </button>

                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px' }}>{city.name}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{city.timezone}</span>
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '26px', fontWeight: 600 }}>{getTimeInTz(city.timezone)}</div>
                    <span style={{ fontSize: '11px', color: 'var(--accent-color)' }}>{getTimeDiff(city.timezone)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TIMER TAB ================= */}
        {activeTab === 'timer' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              maxWidth: '480px',
              margin: '0 auto',
              width: '100%'
            }}
          >
            {/* Visual Circular / Bar Progress */}
            <div
              style={{
                width: '240px',
                height: '240px',
                borderRadius: '50%',
                border: '6px solid var(--border-subtle)',
                borderColor: isTimerRunning ? 'var(--accent-color)' : 'var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '28px',
                boxShadow: isTimerRunning ? '0 0 24px var(--accent-subtle)' : 'none',
                transition: 'border-color 0.3s ease'
              }}
            >
              <span style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '1px' }}>
                {formatTimerDigits(timerRemainingMs)}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                {isTimerRunning ? 'En progreso…' : 'Listo'}
              </span>
            </div>

            {/* Config selectors when stopped */}
            {!isTimerRunning && (
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                    Horas
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={timerHours}
                    onChange={(e) => {
                      const v = Math.max(0, parseInt(e.target.value) || 0)
                      setTimerHours(v)
                      setTimerRemainingMs((v * 3600 + timerMinutes * 60 + timerSeconds) * 1000)
                    }}
                    style={{
                      width: '60px',
                      padding: '6px',
                      fontSize: '18px',
                      textAlign: 'center',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                    Minutos
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={timerMinutes}
                    onChange={(e) => {
                      const v = Math.max(0, parseInt(e.target.value) || 0)
                      setTimerMinutes(v)
                      setTimerRemainingMs((timerHours * 3600 + v * 60 + timerSeconds) * 1000)
                    }}
                    style={{
                      width: '60px',
                      padding: '6px',
                      fontSize: '18px',
                      textAlign: 'center',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                    Segundos
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={timerSeconds}
                    onChange={(e) => {
                      const v = Math.max(0, parseInt(e.target.value) || 0)
                      setTimerSeconds(v)
                      setTimerRemainingMs((timerHours * 3600 + timerMinutes * 60 + v) * 1000)
                    }}
                    style={{
                      width: '60px',
                      padding: '6px',
                      fontSize: '18px',
                      textAlign: 'center',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Timer Controls */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {!isTimerRunning ? (
                <button
                  type="button"
                  onClick={startTimer}
                  style={{
                    padding: '10px 28px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--accent-color)',
                    color: 'var(--accent-text)',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  ▶ Iniciar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pauseTimer}
                  style={{
                    padding: '10px 28px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  ⏸ Pausar
                </button>
              )}

              <button
                type="button"
                onClick={resetTimer}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                ↺ Reiniciar
              </button>
            </div>
          </div>
        )}

        {/* ================= STOPWATCH TAB ================= */}
        {activeTab === 'stopwatch' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              maxWidth: '480px',
              margin: '0 auto',
              width: '100%'
            }}
          >
            {/* Stopwatch Time */}
            <div style={{ margin: '24px 0 20px 0', fontSize: '54px', fontWeight: 700, letterSpacing: '2px' }}>
              {formatStopwatch(stopwatchMs)}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              {!isStopwatchRunning ? (
                <button
                  type="button"
                  onClick={startStopwatch}
                  style={{
                    padding: '10px 28px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--accent-color)',
                    color: 'var(--accent-text)',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  ▶ Iniciar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pauseStopwatch}
                  style={{
                    padding: '10px 28px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  ⏸ Pausar
                </button>
              )}

              <button
                type="button"
                onClick={addLap}
                disabled={!isStopwatchRunning}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '14px',
                  cursor: isStopwatchRunning ? 'pointer' : 'not-allowed',
                  opacity: isStopwatchRunning ? 1 : 0.4
                }}
              >
                🏳 Vuelta
              </button>

              <button
                type="button"
                onClick={resetStopwatch}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                ↺ Reiniciar
              </button>
            </div>

            {/* Laps Table */}
            {laps.length > 0 && (
              <div
                style={{
                  width: '100%',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '12px',
                  flex: 1,
                  overflowY: 'auto'
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 1fr',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    padding: '4px 8px',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}
                >
                  <span>Vuelta</span>
                  <span>Tiempo parcial</span>
                  <span style={{ textAlign: 'right' }}>Tiempo total</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                  {laps.map((lap) => (
                    <div
                      key={lap.lapNumber}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '80px 1fr 1fr',
                        fontSize: '13px',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: 'var(--bg-subtle)'
                      }}
                    >
                      <span style={{ color: 'var(--text-secondary)' }}>#{lap.lapNumber}</span>
                      <span>{formatStopwatch(lap.splitTimeMs)}</span>
                      <span style={{ textAlign: 'right', fontWeight: 600 }}>{formatStopwatch(lap.totalTimeMs)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alarm Modal */}
      {isAlarmModalOpen && (
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
          onClick={() => setIsAlarmModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-window)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600 }}>
              {editingAlarm ? 'Editar alarma' : 'Nueva alarma'}
            </div>

            <form onSubmit={handleSaveAlarm} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Hora
                </label>
                <input
                  type="time"
                  required
                  value={alarmTime}
                  onChange={(e) => setAlarmTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '18px',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Nombre de la alarma
                </label>
                <input
                  type="text"
                  value={alarmLabel}
                  onChange={(e) => setAlarmLabel(e.target.value)}
                  placeholder="Ej: Despertador"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Repetición
                </label>
                <select
                  value={alarmRepeat}
                  onChange={(e) => setAlarmRepeat(e.target.value as AlarmItem['repeat'])}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="none">Una sola vez</option>
                  <option value="daily">Todos los días</option>
                  <option value="weekdays">Lunes a viernes</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsAlarmModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '12px'
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
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add World City Modal */}
      {isAddCityOpen && (
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
          onClick={() => setIsAddCityOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-window)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600 }}>
              Añadir ciudad al reloj mundial
            </div>

            <form onSubmit={handleAddCity} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Nombre de la ciudad
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: Berlín"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Zona horaria IANA
                </label>
                <select
                  value={newCityTz}
                  onChange={(e) => setNewCityTz(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="America/New_York">America/New_York (UTC-5/UTC-4)</option>
                  <option value="America/Chicago">America/Chicago (UTC-6)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
                  <option value="America/Caracas">America/Caracas (UTC-4)</option>
                  <option value="America/Argentina/Buenos_Aires">America/Buenos_Aires (UTC-3)</option>
                  <option value="America/Bogota">America/Bogota (UTC-5)</option>
                  <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
                  <option value="Europe/Madrid">Europe/Madrid (UTC+1/UTC+2)</option>
                  <option value="Europe/London">Europe/London (UTC+0)</option>
                  <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                  <option value="Europe/Berlin">Europe/Berlin (UTC+1)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                  <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
                  <option value="Australia/Sydney">Australia/Sydney (UTC+10/UTC+11)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddCityOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '12px'
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
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Añadir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
