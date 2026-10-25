import osConfig from '@system'
import { events } from '../events'

export interface ProcessInfo {
  pid: number
  name: string
  appId?: string
  instanceId?: string
  startedAt: number
  cpuPercent: number
  memoryMB: number
}

export class ProcessesService {
  private nextPid = 1000
  private systemProcesses: ProcessInfo[] = [
    {
      pid: 100,
      name: 'Explorador del sistema',
      startedAt: Date.now() - 3600000,
      cpuPercent: 0.8,
      memoryMB: 94.2
    },
    {
      pid: 104,
      name: 'Barra de tareas y Shell',
      startedAt: Date.now() - 3600000,
      cpuPercent: 0.5,
      memoryMB: 76.5
    },
    {
      pid: 110,
      name: 'Servicios del host',
      startedAt: Date.now() - 3600000,
      cpuPercent: 0.2,
      memoryMB: 48.0
    },
    {
      pid: 115,
      name: 'Gestor de ventanas',
      startedAt: Date.now() - 3600000,
      cpuPercent: 1.2,
      memoryMB: 112.4
    },
    {
      pid: 120,
      name: 'Programador de tareas',
      startedAt: Date.now() - 3600000,
      cpuPercent: 0.1,
      memoryMB: 28.1
    }
  ]

  private appProcesses = new Map<string, ProcessInfo>()

  getTotalMemoryMB(): number {
    return osConfig.simulatedMemoryMB || 16384
  }

  registerAppProcess(appId: string, appName: string): { pid: number; instanceId: string } {
    const instanceId = `inst-${crypto.randomUUID().slice(0, 8)}`
    const pid = this.nextPid++

    const proc: ProcessInfo = {
      pid,
      name: appName,
      appId,
      instanceId,
      startedAt: Date.now(),
      cpuPercent: +(Math.random() * 2 + 0.5).toFixed(1),
      memoryMB: +(Math.random() * 40 + 35).toFixed(1)
    }

    this.appProcesses.set(instanceId, proc)
    events.emit('app:launched', { appId, instanceId })

    return { pid, instanceId }
  }

  spawnApp(appId: string, appName: string): { pid: number; instanceId: string } {
    return this.registerAppProcess(appId, appName)
  }

  terminateAppProcess(instanceId: string): void {
    const proc = this.appProcesses.get(instanceId)
    if (proc) {
      this.appProcesses.delete(instanceId)
      events.emit('app:terminated', { appId: proc.appId || '', instanceId })
    }
  }

  terminate(instanceId: string): void {
    this.terminateAppProcess(instanceId)
  }

  listProcesses(): ProcessInfo[] {
    // Return all system + app processes with slight simulated variations
    const time = Date.now() / 3000

    const updatedSystem = this.systemProcesses.map((p, idx) => ({
      ...p,
      cpuPercent: Math.max(0.1, +(p.cpuPercent + Math.sin(time + idx) * 0.4).toFixed(1)),
      memoryMB: +(p.memoryMB + Math.cos(time + idx) * 0.8).toFixed(1)
    }))

    const appProcs = Array.from(this.appProcesses.values()).map((p, idx) => ({
      ...p,
      cpuPercent: Math.max(0.2, +(p.cpuPercent + Math.sin(time + idx + 10) * 0.8).toFixed(1)),
      memoryMB: +(p.memoryMB + Math.cos(time + idx + 10) * 1.5).toFixed(1)
    }))

    return [...updatedSystem, ...appProcs]
  }
}

export const processes = new ProcessesService()
