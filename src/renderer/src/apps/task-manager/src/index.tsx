import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  useOS,
  useProcesses,
  type ProcessInfo
} from '@os/sdk'
import {
  NavigationPane,
  type NavigationPaneItem,
  Button,
  AppIcon
} from '@os/ui'

type SortColumn = 'name' | 'pid' | 'cpuPercent' | 'memoryMB'
type SortDirection = 'asc' | 'desc'

export default function TaskManagerApp(): JSX.Element {
  const os = useOS()
  const procApi = useProcesses()

  // Navigation state
  const [activeTab, setActiveTab] = useState<'processes' | 'performance'>('processes')

  // Process list state
  const [processList, setProcessList] = useState<ProcessInfo[]>([])
  const [selectedPid, setSelectedPid] = useState<number | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>('cpuPercent')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Performance history buffers (60 data points for last 60 seconds)
  const [cpuHistory, setCpuHistory] = useState<number[]>(() => new Array(60).fill(0))
  const [memoryHistory, setMemoryHistory] = useState<number[]>(() => new Array(60).fill(0))

  const cpuCanvasRef = useRef<HTMLCanvasElement>(null)
  const memoryCanvasRef = useRef<HTMLCanvasElement>(null)

  const totalMemoryMB = useMemo(() => procApi.getTotalMemoryMB(), [procApi])

  // Periodic process metrics refresh (every 1 second)
  useEffect(() => {
    const fetchProcesses = () => {
      const list = procApi.listProcesses()
      setProcessList(list)

      // Compute total CPU and Memory
      const totalCpu = +(list.reduce((acc, p) => acc + p.cpuPercent, 0)).toFixed(1)
      const totalMem = +(list.reduce((acc, p) => acc + p.memoryMB, 0)).toFixed(1)

      setCpuHistory((prev) => [...prev.slice(1), Math.min(100, totalCpu)])
      setMemoryHistory((prev) => [...prev.slice(1), totalMem])
    }

    fetchProcesses()
    const interval = setInterval(fetchProcesses, 1000)
    return () => clearInterval(interval)
  }, [procApi])

  // Window title synchronization
  useEffect(() => {
    os.window.setTitle('Administrador de tareas')
  }, [os.window])

  // Sorting
  const sortedProcesses = useMemo(() => {
    return [...processList].sort((a, b) => {
      let result = 0
      if (sortColumn === 'name') {
        result = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      } else if (sortColumn === 'pid') {
        result = a.pid - b.pid
      } else if (sortColumn === 'cpuPercent') {
        result = a.cpuPercent - b.cpuPercent
      } else if (sortColumn === 'memoryMB') {
        result = a.memoryMB - b.memoryMB
      }
      return sortDirection === 'asc' ? result : -result
    })
  }, [processList, sortColumn, sortDirection])

  const handleHeaderClick = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(col)
      setSortDirection(col === 'name' ? 'asc' : 'desc')
    }
  }

  // Terminate Process Handler
  const handleTerminateProcess = useCallback(async () => {
    if (!selectedPid) return
    const target = processList.find((p) => p.pid === selectedPid)
    if (!target) return

    // Check if critical system process
    if (target.pid < 1000 || !target.instanceId) {
      await os.dialogs.alert({
        title: 'Operación no permitida',
        message: `El proceso "${target.name}" (PID ${target.pid}) es un componente crítico del sistema operativo y no se puede finalizar.`
      })
      return
    }

    // Check if target window has unsaved changes
    const dirtyInfo = procApi.isDirty(target.instanceId)
    if (dirtyInfo.isDirty) {
      const docName = dirtyInfo.documentName || target.name
      const confirmed = await os.dialogs.confirm({
        title: '¿Finalizar tarea?',
        message: `Finalizar el proceso provocará la pérdida de los cambios no guardados en "${docName}". ¿Deseas finalizar la tarea de todos modos?`,
        confirmLabel: 'Finalizar tarea',
        cancelLabel: 'Cancelar',
        destructive: true
      })
      if (!confirmed) return
    }

    // Terminate
    await procApi.terminateByPid(target.pid, true)
    setSelectedPid(null)
    setProcessList(procApi.listProcesses())
  }, [selectedPid, processList, procApi, os.dialogs])

  // Canvas Drawing for CPU and Memory
  useEffect(() => {
    if (activeTab !== 'performance') return

    // Draw CPU Graph
    const cpuCanvas = cpuCanvasRef.current
    if (cpuCanvas) {
      const ctx = cpuCanvas.getContext('2d')
      if (ctx) {
        const w = cpuCanvas.width
        const h = cpuCanvas.height

        ctx.clearRect(0, 0, w, h)

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
        ctx.lineWidth = 1
        for (let i = 0; i <= 4; i++) {
          const y = (h / 4) * i
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(w, y)
          ctx.stroke()
        }

        // Draw CPU curve
        const step = w / 59
        ctx.beginPath()
        ctx.moveTo(0, h)

        cpuHistory.forEach((val, idx) => {
          const x = idx * step
          const normalized = Math.min(100, Math.max(0, val))
          const y = h - (normalized / 100) * (h - 8) - 4
          if (idx === 0) {
            ctx.lineTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })

        // Stroke line
        ctx.strokeStyle = '#00ffff'
        ctx.lineWidth = 2
        ctx.stroke()

        // Area Fill
        ctx.lineTo(w, h)
        ctx.closePath()
        const gradient = ctx.createLinearGradient(0, 0, 0, h)
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0.35)')
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0.02)')
        ctx.fillStyle = gradient
        ctx.fill()
      }
    }

    // Draw Memory Graph
    const memCanvas = memoryCanvasRef.current
    if (memCanvas) {
      const ctx = memCanvas.getContext('2d')
      if (ctx) {
        const w = memCanvas.width
        const h = memCanvas.height

        ctx.clearRect(0, 0, w, h)

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
        ctx.lineWidth = 1
        for (let i = 0; i <= 4; i++) {
          const y = (h / 4) * i
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(w, y)
          ctx.stroke()
        }

        // Draw Memory curve
        const step = w / 59
        ctx.beginPath()
        ctx.moveTo(0, h)

        memoryHistory.forEach((val, idx) => {
          const x = idx * step
          const normalized = Math.min(100, Math.max(0, (val / totalMemoryMB) * 100))
          const y = h - (normalized / 100) * (h - 8) - 4
          if (idx === 0) {
            ctx.lineTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })

        // Stroke line
        ctx.strokeStyle = '#a855f7'
        ctx.lineWidth = 2
        ctx.stroke()

        // Area Fill
        ctx.lineTo(w, h)
        ctx.closePath()
        const gradient = ctx.createLinearGradient(0, 0, 0, h)
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.35)')
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0.02)')
        ctx.fillStyle = gradient
        ctx.fill()
      }
    }
  }, [activeTab, cpuHistory, memoryHistory, totalMemoryMB])

  // Current summary metrics
  const currentTotalCpu = cpuHistory[cpuHistory.length - 1] || 0
  const currentTotalMemMB = memoryHistory[memoryHistory.length - 1] || 0
  const currentMemPercentage = Math.round((currentTotalMemMB / totalMemoryMB) * 100)

  // Navigation Items
  const navItems: NavigationPaneItem[] = [
    { key: 'processes', label: 'Procesos', icon: '📊' },
    { key: 'performance', label: 'Rendimiento', icon: '📈' }
  ]

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-family-base)',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* 1. Left Navigation */}
      <NavigationPane
        items={navItems}
        selectedKey={activeTab}
        onSelect={(key) => setActiveTab(key as 'processes' | 'performance')}
        width="190px"
      />

      {/* 2. Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          backgroundColor: 'var(--bg-card)',
          overflow: 'hidden'
        }}
      >
        {activeTab === 'processes' ? (
          /* ========================================================= */
          /* TAB 1: PROCESOS */
          /* ========================================================= */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Summary Metrics Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                padding: '10px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-subtle)',
                fontSize: 'var(--font-size-xs)'
              }}
            >
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Procesos: </span>
                <span style={{ fontWeight: 'bold' }}>{processList.length}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>CPU global: </span>
                <span
                  style={{
                    fontWeight: 'bold',
                    color: currentTotalCpu > 80 ? '#ef4444' : 'var(--text-primary)'
                  }}
                >
                  {currentTotalCpu}%
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Memoria: </span>
                <span style={{ fontWeight: 'bold' }}>
                  {(currentTotalMemMB / 1024).toFixed(1)} GB / {(totalMemoryMB / 1024).toFixed(0)} GB (
                  {currentMemPercentage}%)
                </span>
              </div>

              <div style={{ marginLeft: 'auto' }}>
                <Button
                  variant="primary"
                  disabled={!selectedPid}
                  onClick={handleTerminateProcess}
                >
                  Finalizar tarea
                </Button>
              </div>
            </div>

            {/* Sortable Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 90px 110px 120px',
                padding: '8px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-subtle)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-secondary)'
              }}
            >
              <div
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => handleHeaderClick('name')}
              >
                Nombre {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </div>
              <div
                style={{ cursor: 'pointer', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}
                onClick={() => handleHeaderClick('pid')}
              >
                PID {sortColumn === 'pid' && (sortDirection === 'asc' ? '↑' : '↓')}
              </div>
              <div
                style={{ cursor: 'pointer', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}
                onClick={() => handleHeaderClick('cpuPercent')}
              >
                CPU {sortColumn === 'cpuPercent' && (sortDirection === 'asc' ? '↑' : '↓')}
              </div>
              <div
                style={{ cursor: 'pointer', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}
                onClick={() => handleHeaderClick('memoryMB')}
              >
                Memoria {sortColumn === 'memoryMB' && (sortDirection === 'asc' ? '↑' : '↓')}
              </div>
            </div>

            {/* Process Rows List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '4px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1px'
              }}
            >
              {sortedProcesses.map((proc) => {
                const isSelected = proc.pid === selectedPid
                return (
                  <div
                    key={proc.pid}
                    onClick={() => setSelectedPid(proc.pid)}
                    onDoubleClick={handleTerminateProcess}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 90px 110px 120px',
                      alignItems: 'center',
                      padding: '7px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                      border: isSelected ? '1px solid var(--accent-border)' : '1px solid transparent',
                      cursor: 'pointer',
                      fontSize: 'var(--font-size-xs)',
                      transition: 'background-color var(--duration-fast) var(--ease-fluent)'
                    }}
                  >
                    {/* Process Name & Icon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      {proc.appId ? (
                        <AppIcon appId={proc.appId} size={18} />
                      ) : (
                        <span style={{ fontSize: '16px' }}>⚙️</span>
                      )}
                      <span
                        style={{
                          fontWeight: isSelected ? 'bold' : 'normal',
                          color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {proc.name}
                      </span>
                    </div>

                    {/* PID */}
                    <div style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {proc.pid}
                    </div>

                    {/* CPU */}
                    <div
                      style={{
                        textAlign: 'right',
                        fontWeight: proc.cpuPercent > 10 ? 'bold' : 'normal',
                        color: proc.cpuPercent > 15 ? '#ef4444' : 'var(--text-primary)'
                      }}
                    >
                      {proc.cpuPercent.toFixed(1)} %
                    </div>

                    {/* Memory */}
                    <div style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {proc.memoryMB.toFixed(1)} MB
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* TAB 2: RENDIMIENTO (Charts Canvas) */
          /* ========================================================= */
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}
          >
            {/* CPU Performance Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    Rendimiento de procesador
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00ffff' }}>
                    CPU: {currentTotalCpu}%
                  </div>
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textAlign: 'right' }}>
                  <div>Velocidad: 3.20 GHz</div>
                  <div>Procesos activos: {processList.length}</div>
                </div>
              </div>

              {/* Canvas Graph */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '140px',
                  backgroundColor: '#09090b',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden'
                }}
              >
                <canvas
                  ref={cpuCanvasRef}
                  width={600}
                  height={140}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '6px',
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.4)'
                  }}
                >
                  60 segundos
                </span>
              </div>
            </div>

            {/* Memory Performance Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    Memoria física simulada
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c084fc' }}>
                    {(currentTotalMemMB / 1024).toFixed(1)} GB / {(totalMemoryMB / 1024).toFixed(0)} GB (
                    {currentMemPercentage}%)
                  </div>
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textAlign: 'right' }}>
                  <div>En uso: {Math.round(currentTotalMemMB)} MB</div>
                  <div>Disponible: {Math.round(totalMemoryMB - currentTotalMemMB)} MB</div>
                </div>
              </div>

              {/* Canvas Graph */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '140px',
                  backgroundColor: '#09090b',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden'
                }}
              >
                <canvas
                  ref={memoryCanvasRef}
                  width={600}
                  height={140}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '6px',
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.4)'
                  }}
                >
                  60 segundos
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
