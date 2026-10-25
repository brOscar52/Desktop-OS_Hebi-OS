import { storage, ScheduledRecord, ScheduleRepeat } from '../storage'
import { notifications } from '../notifications'
import { sound } from '../sound'
import { events } from '../events'

export class SchedulerService {
  private timer: number | null = null
  private running = false

  start(): void {
    if (this.running) return
    this.running = true
    this.checkJobs()
    this.timer = window.setInterval(() => this.checkJobs(), 1000)
  }

  stop(): void {
    this.running = false
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  async schedule(job: Omit<ScheduledRecord, 'id'>): Promise<string> {
    const id = `job-${crypto.randomUUID()}`
    const record: ScheduledRecord = { ...job, id }
    await storage.saveScheduled(record)
    return id
  }

  async cancel(id: string): Promise<void> {
    await storage.deleteScheduled(id)
  }

  async list(appId?: string): Promise<ScheduledRecord[]> {
    const all = await storage.listScheduled()
    return appId ? all.filter((j) => j.appId === appId) : all
  }

  private async checkJobs(): Promise<void> {
    const now = Date.now()
    const allJobs = await storage.listScheduled()

    for (const job of allJobs) {
      if (job.fireAt <= now) {
        await this.fireJob(job)
      }
    }
  }

  private async fireJob(job: ScheduledRecord): Promise<void> {
    // 1. Post notification
    notifications.post({
      appId: job.appId,
      title: job.title,
      body: job.body,
      sound: false // alarm is played separately if enabled
    })

    // 2. Play alarm sound if enabled
    if (job.sound) {
      sound.playSystem('alarm')
    }

    // 3. Emit scheduler:fired
    events.emit('scheduler:fired', { jobId: job.id, appId: job.appId })

    // 4. Reschedule or delete
    if (job.repeat === 'none') {
      await storage.deleteScheduled(job.id)
    } else {
      const nextFire = this.calculateNextFireTime(job.fireAt, job.repeat)
      await storage.saveScheduled({
        ...job,
        fireAt: nextFire
      })
    }
  }

  private calculateNextFireTime(prevFire: number, repeat: ScheduleRepeat): number {
    const d = new Date(prevFire)
    const now = Date.now()

    do {
      if (repeat === 'daily') {
        d.setDate(d.getDate() + 1)
      } else if (repeat === 'weekdays') {
        d.setDate(d.getDate() + 1)
        const day = d.getDay()
        if (day === 6) d.setDate(d.getDate() + 2) // skip saturday -> monday
        else if (day === 0) d.setDate(d.getDate() + 1) // skip sunday -> monday
      }
    } while (d.getTime() <= now)

    return d.getTime()
  }
}

export const scheduler = new SchedulerService()
