import { events } from '../events'
import { sound } from '../sound'

export interface NotificationItem {
  id: string
  appId: string
  title: string
  body?: string
  sound?: boolean
  launchArgs?: Record<string, unknown>
  createdAt: number
}

export class NotificationsService {
  private activeNotifications = new Map<string, NotificationItem>()

  post(notif: {
    appId: string
    title: string
    body?: string
    sound?: boolean
    launchArgs?: Record<string, unknown>
  }): NotificationItem {
    const id = `notif-${crypto.randomUUID()}`
    const item: NotificationItem = {
      ...notif,
      id,
      createdAt: Date.now()
    }

    this.activeNotifications.set(id, item)

    if (notif.sound !== false) {
      sound.playSystem('notification')
    }

    events.emit('notification:posted', { id, appId: notif.appId })

    return item
  }

  show(notif: {
    appId: string
    title: string
    body?: string
    sound?: boolean
    launchArgs?: Record<string, unknown>
  }): NotificationItem {
    return this.post(notif)
  }

  dismiss(id: string): void {
    this.activeNotifications.delete(id)
  }

  get(id: string): NotificationItem | undefined {
    return this.activeNotifications.get(id)
  }

  list(): NotificationItem[] {
    return Array.from(this.activeNotifications.values())
  }
}

export const notifications = new NotificationsService()
