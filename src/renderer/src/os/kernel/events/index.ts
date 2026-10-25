import { EventName, EventData, EventHandler } from './types'

class EventBus {
  private handlers = new Map<EventName, Set<(data: unknown) => void>>()

  on<E extends EventName>(event: E, handler: EventHandler<E>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler as (data: unknown) => void)

    return () => {
      this.off(event, handler)
    }
  }

  off<E extends EventName>(event: E, handler: EventHandler<E>): void {
    const set = this.handlers.get(event)
    if (set) {
      set.delete(handler as (data: unknown) => void)
      if (set.size === 0) {
        this.handlers.delete(event)
      }
    }
  }

  emit<E extends EventName>(event: E, data: EventData<E>): void {
    const set = this.handlers.get(event)
    if (set) {
      for (const handler of Array.from(set)) {
        try {
          const fn = handler as (data: EventData<E>) => void
          fn(data)
        } catch (error) {
          console.error(`[EventBus] Error in handler for event "${event}":`, error)
        }
      }
    }
  }
}

export const events = new EventBus()
export * from './types'
