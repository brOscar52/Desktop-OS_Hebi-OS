import { create } from 'zustand'
import { storage, UserRecord } from '../storage'
import { events } from '../events'
import { sound } from '../sound'
import { scheduler } from '../scheduler'
import { settings } from '../settings'
import { fs } from '../fs'

export type SessionState =
  | 'booting'
  | 'setup'
  | 'locked'
  | 'login'
  | 'authenticated'
  | 'restarting'
  | 'shutting_down'

interface SessionStore {
  state: SessionState
  user: UserRecord | null
  error: string | null

  // Lifecycle
  initSession: () => Promise<void>
  finishSetup: (user: UserRecord) => Promise<void>
  unlockWithPassword: (password: string) => Promise<boolean>
  lock: () => void
  showLogin: () => void
  showLock: () => void
  logout: () => void
  restart: () => void
  shutdown: () => void
  clearError: () => void
}

export const useSession = create<SessionStore>((set, get) => ({
  state: 'booting',
  user: null,
  error: null,

  initSession: async () => {
    await settings.init()
    const user = await storage.getUser()

    if (user) {
      fs.setHomeDir(user.name)
      set({ user })
    }

    // Play boot sound
    sound.playSystem('boot')

    // Wait bootDurationMs
    const bootDuration = 2500
    await new Promise((resolve) => setTimeout(resolve, bootDuration))

    if (!user) {
      set({ state: 'setup' })
    } else {
      set({ state: 'locked' })
    }
  },

  finishSetup: async (user: UserRecord) => {
    await storage.saveUser(user)
    fs.setHomeDir(user.name)
    set({ user, state: 'authenticated' })
    sound.playSystem('login')
    scheduler.start()
    events.emit('session:unlocked', {})
  },

  unlockWithPassword: async (password: string) => {
    const { user } = get()
    if (!user) return false

    if (!window.native?.auth?.verifyPassword) {
      console.warn('[Session] Native auth not available.')
      return false
    }

    const isValid = await window.native.auth.verifyPassword(
      password,
      user.passwordHash,
      user.salt
    )

    if (isValid) {
      set({ state: 'authenticated', error: null })
      sound.playSystem('login')
      scheduler.start()
      events.emit('session:unlocked', {})
      return true
    } else {
      sound.playSystem('error')
      set({ error: 'La contraseña no es correcta. Inténtalo de nuevo.' })
      return false
    }
  },

  lock: () => {
    sound.playSystem('lock')
    set({ state: 'locked' })
    events.emit('session:locked', {})
  },

  showLogin: () => {
    set({ state: 'login', error: null })
  },

  showLock: () => {
    set({ state: 'locked', error: null })
  },

  logout: () => {
    scheduler.stop()
    sound.playSystem('logout')
    set({ state: 'locked', error: null })
    events.emit('session:logout', {})
  },

  restart: async () => {
    scheduler.stop()
    events.emit('power:restart', {})
    set({ state: 'restarting' })

    // Simulate restarting delay, then restart session
    await new Promise((resolve) => setTimeout(resolve, 2000))
    set({ state: 'booting' })
    get().initSession()
  },

  shutdown: async () => {
    scheduler.stop()
    sound.playSystem('shutdown')
    events.emit('power:shutdown', {})
    set({ state: 'shutting_down' })

    await new Promise((resolve) => setTimeout(resolve, 2000))
    if (window.native?.power?.quit) {
      window.native.power.quit()
    }
  },

  clearError: () => {
    set({ error: null })
  }
}))
