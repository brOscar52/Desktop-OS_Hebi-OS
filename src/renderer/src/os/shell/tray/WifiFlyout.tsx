import React, { useState, useEffect } from 'react'
import { network, WifiNetwork } from '../../kernel/network'
import { Toggle } from '../../ui/Toggle'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/TextField'

export interface WifiFlyoutProps {
  isOpen: boolean
  onClose: () => void
}

export const WifiFlyout: React.FC<WifiFlyoutProps> = ({ isOpen }) => {
  const [wifiEnabled, setWifiEnabled] = useState<boolean>(network.isEnabled())
  const [connectedSsid, setConnectedSsid] = useState<string | null>(network.getConnectedSsid())
  const [networksList, setNetworksList] = useState<WifiNetwork[]>([])
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setWifiEnabled(network.isEnabled())
    setConnectedSsid(network.getConnectedSsid())
    setNetworksList(network.scan())
    setSelectedNetwork(null)
    setPassword('')
    setError(null)
  }, [isOpen])

  if (!isOpen) return null

  const handleToggleWifi = async (enabled: boolean) => {
    await network.setEnabled(enabled)
    setWifiEnabled(enabled)
    setConnectedSsid(network.getConnectedSsid())
    if (enabled) {
      setNetworksList(network.scan())
    }
  }

  const handleConnect = async (net: WifiNetwork) => {
    setError(null)
    const success = await network.connect(net.ssid, password)
    if (success) {
      setConnectedSsid(net.ssid)
      setSelectedNetwork(null)
      setPassword('')
    } else {
      setError('Contraseña incorrecta')
    }
  }

  const handleDisconnect = async () => {
    await network.disconnect()
    setConnectedSsid(null)
    setSelectedNetwork(null)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '56px',
        right: '16px',
        width: '340px',
        maxHeight: '440px',
        backgroundColor: 'var(--material-acrylic)',
        backdropFilter: 'var(--backdrop-filter-acrylic)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-flyout)',
        border: '1px solid var(--border-subtle)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 999900,
        fontFamily: 'var(--font-family-base)',
        color: 'var(--text-primary)',
        boxSizing: 'border-box',
        userSelect: 'none'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
          Wi-Fi
        </h3>
        <Toggle checked={wifiEnabled} onChange={handleToggleWifi} />
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)' }} />

      {/* Network List */}
      {!wifiEnabled ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
          El Wi-Fi está desactivado
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '320px' }}>
          {networksList.map((net) => {
            const isConnected = connectedSsid === net.ssid
            const isExpanded = selectedNetwork === net.ssid

            return (
              <div
                key={net.ssid}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isConnected ? 'var(--bg-active)' : 'transparent',
                  border: isConnected ? '1px solid var(--accent-border)' : '1px solid transparent',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  if (isConnected) return
                  setSelectedNetwork(isExpanded ? null : net.ssid)
                  setPassword('')
                  setError(null)
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>📶</span>
                    <div>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                        {net.ssid}
                      </div>
                      {isConnected && (
                        <div style={{ fontSize: '11px', color: 'var(--accent-color)' }}>
                          Conectado
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {net.secured && <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>🔒</span>}
                    {isConnected && (
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDisconnect()
                        }}
                      >
                        Desconectar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Password input when selected and not connected */}
                {isExpanded && !isConnected && (
                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {net.secured ? (
                      <TextField
                        type="password"
                        placeholder="Escribe la contraseña de red"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={error || undefined}
                        autoFocus
                      />
                    ) : (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Red abierta (sin contraseña)
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <Button size="small" variant="primary" onClick={() => handleConnect(net)}>
                        Conectar
                      </Button>
                      <Button size="small" variant="subtle" onClick={() => setSelectedNetwork(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
