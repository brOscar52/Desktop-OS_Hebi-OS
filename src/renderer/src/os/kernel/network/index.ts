import osConfig from '@system'
import { settings } from '../settings'

export interface WifiNetwork {
  ssid: string
  secured: boolean
  signal: number // 1 to 4
}

export class NetworkService {
  getNetworks(): WifiNetwork[] {
    return osConfig.networks || [
      { ssid: 'Casa_5G', secured: true, signal: 4 },
      { ssid: 'Oficina_WiFi', secured: true, signal: 3 },
      { ssid: 'Cafeteria_Libre', secured: false, signal: 2 },
      { ssid: 'Red_Invitados', secured: true, signal: 3 },
      { ssid: 'Campus_Uni', secured: true, signal: 4 }
    ]
  }

  isWifiEnabled(): boolean {
    return settings.get('network.wifiEnabled')
  }

  async setWifiEnabled(enabled: boolean): Promise<void> {
    await settings.set('network.wifiEnabled', enabled)
    if (!enabled) {
      await settings.set('network.connectedSsid', null)
    }
  }

  getConnectedSsid(): string | null {
    if (!this.isWifiEnabled()) return null
    return settings.get('network.connectedSsid')
  }

  async connect(ssid: string, password?: string): Promise<boolean> {
    const networks = this.getNetworks()
    const target = networks.find((n) => n.ssid === ssid)
    if (!target) {
      throw new Error(`Red WiFi no encontrada: "${ssid}"`)
    }

    if (target.secured) {
      const known = settings.get('network.knownNetworks') || []
      const knownEntry = known.find((k) => k.ssid === ssid)

      // Check config password
      const configEntry = osConfig.networks.find((n) => n.ssid === ssid)
      const expectedPassword = configEntry?.password || knownEntry?.password || ''

      if (password !== undefined && password !== expectedPassword) {
        throw new Error('La contraseña de red no es correcta.')
      }

      // Add to known
      if (password && !knownEntry) {
        await settings.set('network.knownNetworks', [...known, { ssid, password }])
      }
    }

    await settings.set('network.connectedSsid', ssid)
    return true
  }

  async disconnect(): Promise<void> {
    await settings.set('network.connectedSsid', null)
  }

  async forget(ssid: string): Promise<void> {
    const known = settings.get('network.knownNetworks') || []
    await settings.set(
      'network.knownNetworks',
      known.filter((k) => k.ssid !== ssid)
    )
    if (this.getConnectedSsid() === ssid) {
      await this.disconnect()
    }
  }
}

export const network = new NetworkService()
