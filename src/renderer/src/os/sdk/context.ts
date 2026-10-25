import { createContext, useContext } from 'react'
import type { LaunchArgs } from './index'

export interface WindowContextValue {
  windowId: string
  appId: string
  instanceId: string
  launchArgs?: LaunchArgs
}

export const WindowContext = createContext<WindowContextValue>({
  windowId: 'root',
  appId: 'system',
  instanceId: 'inst-0',
  launchArgs: {}
})

export function useWindowContext(): WindowContextValue {
  return useContext(WindowContext)
}
