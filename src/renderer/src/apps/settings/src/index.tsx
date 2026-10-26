import { useState, useEffect, useCallback } from 'react'
import {
  useOS,
  useLaunchArgs,
  useSetting,
  useAccount,
  type UserRecord,
  type UserAvatar,
  type WifiNetwork
} from '@os/sdk'
import {
  NavigationPane,
  type NavigationPaneItem,
  Button,
  TextField,
  Toggle,
  Slider,
  SegmentedControl,
  Select
} from '@os/ui'

// Builtin wallpapers list
const BUILTIN_WALLPAPERS = [
  { id: 'aurora', name: 'Aurora', color: 'linear-gradient(135deg, #0f766e, #0284c7)' },
  { id: 'lagoon', name: 'Laguna', color: 'linear-gradient(135deg, #0d9488, #10b981)' },
  { id: 'dusk', name: 'Crepúsculo', color: 'linear-gradient(135deg, #1e1b4b, #4338ca)' },
  { id: 'emerald', name: 'Esmeralda', color: 'linear-gradient(135deg, #064e3b, #059669)' }
]

// Preset accent colors (headed by turquoise as principal)
const ACCENT_COLORS = [
  { name: 'Turquesa hebi', value: '#0d9488' },
  { name: 'Azul océano', value: '#0284c7' },
  { name: 'Verde esmeralda', value: '#10b981' },
  { name: 'Púrpura real', value: '#8b5cf6' },
  { name: 'Ámbar cálido', value: '#f59e0b' },
  { name: 'Carmín rosa', value: '#f43f5e' }
]

export default function SettingsApp(): JSX.Element {
  const os = useOS()
  const account = useAccount()
  const launchArgs = useLaunchArgs()

  // Active section
  const [activeSection, setActiveSection] = useState<string>(() => {
    return (launchArgs.section as string) || 'personalization'
  })

  // Synchronize window title
  useEffect(() => {
    const titles: Record<string, string> = {
      personalization: 'Personalización',
      'desktop-taskbar': 'Escritorio y barra de tareas',
      sound: 'Sonido',
      network: 'Red e Internet',
      datetime: 'Hora e idioma',
      account: 'Cuentas'
    }
    os.window.setTitle(`Configuración - ${titles[activeSection] || 'Sistema'}`)
  }, [activeSection, os.window])

  // ==========================================
  // 1. Personalization Settings
  // ==========================================
  const theme = useSetting('appearance.theme')
  const accent = useSetting('appearance.accent')
  const transparency = useSetting('appearance.transparency')
  const wallpaper = useSetting('appearance.wallpaper')

  // Handle launchArgs.setWallpaper if provided
  useEffect(() => {
    if (launchArgs.setWallpaper) {
      const nodeId = String(launchArgs.setWallpaper)
      os.dialogs
        .confirm({
          title: 'Fondo de pantalla',
          message: '¿Deseas establecer esta imagen como nuevo fondo de pantalla del escritorio?',
          confirmLabel: 'Establecer como fondo'
        })
        .then((confirmed: boolean) => {
          if (confirmed) {
            os.settings.set('appearance.wallpaper', { type: 'file', nodeId })
          }
        })
    }
  }, [launchArgs.setWallpaper, os.dialogs, os.settings])

  const handlePickWallpaperFile = async () => {
    const files = await os.dialogs.openFile({
      extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
      multiple: false
    })
    if (!files || files.length === 0) return

    try {
      const stat = await os.fs.stat(files[0])
      await os.settings.set('appearance.wallpaper', { type: 'file', nodeId: stat.id })
    } catch {
      await os.dialogs.alert({
        title: 'Error',
        message: 'No se pudo cargar la imagen seleccionada.'
      })
    }
  }

  // ==========================================
  // 2. Desktop & Taskbar Settings
  // ==========================================
  const taskbarAlignment = useSetting('taskbar.alignment')
  const iconSize = useSetting('desktop.iconSize')

  const handleResetIconPositions = async () => {
    const items = os.settings.get('desktop.items') || []
    const resetItems = items.map((item, idx) => ({
      ...item,
      x: 20,
      y: 20 + idx * 90
    }))
    await os.settings.set('desktop.items', resetItems)
    os.notify({
      title: 'Iconos restablecidos',
      body: 'La posición de los iconos del escritorio se ha restablecido a la cuadrícula predeterminada.'
    })
  }

  const handleResetPinnedApps = async () => {
    await os.settings.set('taskbar.pinned', ['files', 'terminal', 'settings'])
    await os.settings.set('start.pinned', ['files', 'terminal', 'settings', 'task-manager'])
    os.notify({
      title: 'Accesos directos restablecidos',
      body: 'Las aplicaciones ancladas a la barra de tareas y al menú Inicio se han restablecido.'
    })
  }

  // ==========================================
  // 3. Sound Settings
  // ==========================================
  const soundVolume = useSetting('sound.volume')
  const soundMuted = useSetting('sound.muted')
  const systemSounds = useSetting('sound.systemSounds')

  const handleTestSound = () => {
    os.sound.playSystem('notification')
  }

  // ==========================================
  // 4. Network Settings
  // ==========================================
  const wifiEnabled = useSetting('network.wifiEnabled')
  const connectedSsid = useSetting('network.connectedSsid')
  const [networks, setNetworks] = useState<WifiNetwork[]>([])

  const refreshNetworks = useCallback(() => {
    setNetworks(os.network.getNetworks())
  }, [os.network])

  useEffect(() => {
    refreshNetworks()
  }, [wifiEnabled, refreshNetworks])

  const handleToggleWifi = async (enabled: boolean) => {
    await os.network.setWifiEnabled(enabled)
    refreshNetworks()
  }

  const handleConnectNetwork = async (net: WifiNetwork) => {
    if (net.ssid === connectedSsid) return

    let password = ''
    if (net.secured) {
      const promptPwd = await os.dialogs.prompt({
        title: `Conectar a ${net.ssid}`,
        message: 'Introduce la clave de seguridad de la red Wi-Fi:'
      })
      if (promptPwd === null) return
      password = promptPwd
    }

    try {
      await os.network.connect(net.ssid, password)
      os.notify({
        title: 'Red conectada',
        body: `Te has conectado correctamente a "${net.ssid}".`
      })
    } catch (err: unknown) {
      await os.dialogs.alert({
        title: 'Error de conexión',
        message: (err as Error).message || 'No se pudo conectar a la red seleccionada.'
      })
    }
  }

  const handleDisconnectNetwork = async () => {
    await os.network.disconnect()
  }

  const handleForgetNetwork = async (ssid: string) => {
    await os.network.forget(ssid)
    os.notify({
      title: 'Red olvidada',
      body: `Se ha eliminado la configuración de la red "${ssid}".`
    })
  }

  // ==========================================
  // 5. Date & Time Settings
  // ==========================================
  const timezone = useSetting('datetime.timezone') || 'America/Caracas'
  const hour24 = Boolean(useSetting('datetime.hour24'))
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date()
        const formatted = new Intl.DateTimeFormat('es-ES', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: !hour24,
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(now)
        setCurrentTimeDisplay(formatted)
      } catch {
        setCurrentTimeDisplay(new Date().toLocaleTimeString())
      }
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [timezone, hour24])

  // ==========================================
  // 6. Account Settings
  // ==========================================
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null)
  const [editName, setEditName] = useState<string>('')
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>('')
  const [newPasswordInput, setNewPasswordInput] = useState<string>('')
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('')
  const [passwordStatus, setPasswordStatus] = useState<{ msg: string; error?: boolean } | null>(null)

  useEffect(() => {
    account.getUser().then((user) => {
      if (user) {
        setCurrentUser(user)
        setEditName(user.name)
      }
    })
  }, [account])

  const handleSaveName = async () => {
    if (!editName.trim()) return
    const success = await account.updateName(editName.trim())
    if (success) {
      const updated = await account.getUser()
      if (updated) setCurrentUser(updated)
      os.notify({
        title: 'Nombre de usuario actualizado',
        body: `Tu nombre ahora es "${editName.trim()}".`
      })
    }
  }

  const handleSelectAvatar = async (avatar: UserAvatar) => {
    const success = await account.updateAvatar(avatar)
    if (success) {
      const updated = await account.getUser()
      if (updated) setCurrentUser(updated)
    }
  }

  const handlePickAvatarFile = async () => {
    const files = await os.dialogs.openFile({
      extensions: ['png', 'jpg', 'jpeg', 'webp'],
      multiple: false
    })
    if (!files || files.length === 0) return

    try {
      const stat = await os.fs.stat(files[0])
      await handleSelectAvatar({ type: 'file', nodeId: stat.id })
    } catch {
      await os.dialogs.alert({
        title: 'Error',
        message: 'No se pudo cargar la imagen de perfil.'
      })
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordStatus(null)

    if (!currentPasswordInput) {
      setPasswordStatus({ msg: 'Introduce tu contraseña actual.', error: true })
      return
    }
    if (newPasswordInput.length < 4) {
      setPasswordStatus({ msg: 'La nueva contraseña debe tener al menos 4 caracteres.', error: true })
      return
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordStatus({ msg: 'Las contraseñas nuevas no coinciden.', error: true })
      return
    }

    const res = await account.changePassword(currentPasswordInput, newPasswordInput)
    if (res.success) {
      setPasswordStatus({ msg: 'Contraseña cambiada exitosamente.', error: false })
      setCurrentPasswordInput('')
      setNewPasswordInput('')
      setConfirmPasswordInput('')
      os.notify({
        title: 'Seguridad',
        body: 'La contraseña de tu cuenta se ha modificado correctamente.'
      })
    } else {
      setPasswordStatus({ msg: res.error || 'Error al cambiar la contraseña.', error: true })
    }
  }

  // Navigation Items
  const navItems: NavigationPaneItem[] = [
    { key: 'personalization', label: 'Personalización', icon: '🎨' },
    { key: 'desktop-taskbar', label: 'Escritorio y barra de tareas', icon: '🖥️' },
    { key: 'sound', label: 'Sonido', icon: '🔊' },
    { key: 'network', label: 'Red e Internet', icon: '🌐' },
    { key: 'datetime', label: 'Hora e idioma', icon: '🕒' },
    { key: 'account', label: 'Cuentas', icon: '👤' }
  ]

  const userDisplayName = currentUser?.name || 'Usuario'

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-family-base)',
        overflow: 'hidden'
      }}
    >
      {/* 1. Left Navigation Pane with User Profile Header */}
      <NavigationPane
        items={navItems}
        selectedKey={activeSection}
        onSelect={(key) => setActiveSection(key)}
        header={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '6px 4px',
              marginBottom: '6px',
              borderBottom: '1px solid var(--border-subtle)'
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--accent-color)',
                color: 'var(--accent-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '18px',
                flexShrink: 0
              }}
            >
              {userDisplayName.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span
                style={{
                  fontWeight: 'var(--font-weight-semibold)',
                  fontSize: 'var(--font-size-sm)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {userDisplayName}
              </span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                Cuenta local
              </span>
            </div>
          </div>
        }
        width="240px"
      />

      {/* 2. Right Content Section */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        {/* ========================================================= */}
        {/* SECTION: PERSONALIZACIÓN */}
        {/* ========================================================= */}
        {activeSection === 'personalization' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Personalización</h2>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Modo de color, acento, fondo de pantalla y transparencia
              </span>
            </div>

            {/* Mode: Light / Dark / Auto */}
            <div className="settings-card" style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <div style={cardTitleStyle}>Modo de color</div>
                  <div style={cardDescStyle}>Elige cómo deben mostrarse las aplicaciones y el sistema</div>
                </div>
                <SegmentedControl
                  value={theme}
                  onChange={(val) => os.settings.set('appearance.theme', val)}
                  options={[
                    { value: 'light', label: 'Claro' },
                    { value: 'dark', label: 'Oscuro' },
                    { value: 'auto', label: 'Automático' }
                  ]}
                />
              </div>
            </div>

            {/* Accent Color */}
            <div className="settings-card" style={cardStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={cardTitleStyle}>Color de énfasis</div>
                  <div style={cardDescStyle}>Selecciona el color primario de los controles e indicadores</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {ACCENT_COLORS.map((c) => {
                    const isSelected = (accent || '').toLowerCase() === c.value.toLowerCase()
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => os.settings.set('appearance.accent', c.value)}
                        title={c.name}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: c.value,
                          border: isSelected ? '3px solid var(--text-primary)' : '2px solid transparent',
                          boxShadow: 'var(--shadow-sm)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          transition: 'transform var(--duration-fast) var(--ease-fluent)',
                          outline: 'none'
                        }}
                      >
                        {isSelected && '✓'}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Transparency Effects */}
            <div className="settings-card" style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <div style={cardTitleStyle}>Efectos de transparencia</div>
                  <div style={cardDescStyle}>
                    Las ventanas y superficies lucen translúcidas con material Mica y Acrílico
                  </div>
                </div>
                <Toggle
                  checked={transparency}
                  onChange={(checked) => os.settings.set('appearance.transparency', checked)}
                />
              </div>
            </div>

            {/* Wallpaper */}
            <div className="settings-card" style={cardStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={cardTitleStyle}>Fondo de pantalla</div>
                    <div style={cardDescStyle}>Elige entre los fondos incluidos o una imagen del sistema</div>
                  </div>
                  <Button variant="secondary" onClick={handlePickWallpaperFile}>
                    Examinar imagen…
                  </Button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {BUILTIN_WALLPAPERS.map((wp) => {
                    const isSelected = wallpaper.type === 'builtin' && wallpaper.id === wp.id
                    return (
                      <div
                        key={wp.id}
                        onClick={() => os.settings.set('appearance.wallpaper', { type: 'builtin', id: wp.id })}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          boxShadow: isSelected ? 'var(--shadow-md)' : 'none'
                        }}
                      >
                        <div style={{ height: '70px', background: wp.color }} />
                        <div
                          style={{
                            padding: '6px 8px',
                            fontSize: 'var(--font-size-xs)',
                            textAlign: 'center',
                            backgroundColor: 'var(--bg-card)',
                            fontWeight: isSelected ? 'var(--font-weight-semibold)' : 'normal'
                          }}
                        >
                          {wp.name}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION: ESCRITORIO Y BARRA DE TAREAS */}
        {/* ========================================================= */}
        {activeSection === 'desktop-taskbar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Escritorio y barra de tareas</h2>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Configuración del diseño y comportamiento del escritorio y barra inferior
              </span>
            </div>

            {/* Taskbar Alignment */}
            <div className="settings-card" style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <div style={cardTitleStyle}>Alineación de la barra de tareas</div>
                  <div style={cardDescStyle}>Alinea los íconos de aplicaciones al centro o a la izquierda</div>
                </div>
                <SegmentedControl
                  value={taskbarAlignment}
                  onChange={(val) => os.settings.set('taskbar.alignment', val)}
                  options={[
                    { value: 'center', label: 'Centro' },
                    { value: 'left', label: 'Izquierda' }
                  ]}
                />
              </div>
            </div>

            {/* Desktop Icon Size */}
            <div className="settings-card" style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <div style={cardTitleStyle}>Tamaño de íconos del escritorio</div>
                  <div style={cardDescStyle}>Escala visual de los archivos y accesos directos del escritorio</div>
                </div>
                <SegmentedControl
                  value={iconSize}
                  onChange={(val) => os.settings.set('desktop.iconSize', val)}
                  options={[
                    { value: 'small', label: 'Pequeño' },
                    { value: 'medium', label: 'Mediano' },
                    { value: 'large', label: 'Grande' }
                  ]}
                />
              </div>
            </div>

            {/* Reset Icon Positions */}
            <div className="settings-card" style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <div style={cardTitleStyle}>Restablecer posición de íconos</div>
                  <div style={cardDescStyle}>Reorganiza automáticamente los íconos a la cuadrícula inicial</div>
                </div>
                <Button variant="secondary" onClick={handleResetIconPositions}>
                  Restablecer
                </Button>
              </div>
            </div>

            {/* Reset Pinned Apps */}
            <div className="settings-card" style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <div style={cardTitleStyle}>Restablecer aplicaciones ancladas</div>
                  <div style={cardDescStyle}>Restaura las aplicaciones ancladas en Inicio y la barra de tareas</div>
                </div>
                <Button variant="secondary" onClick={handleResetPinnedApps}>
                  Restablecer accesos
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION: SONIDO */}
        {/* ========================================================= */}
        {activeSection === 'sound' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Sonido</h2>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Configuración de volumen, silencio y efectos sonoros del sistema
              </span>
            </div>

            {/* Volume */}
            <div className="settings-card" style={cardStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={cardTitleStyle}>Volumen maestro</div>
                    <div style={cardDescStyle}>Nivel general de audio para aplicaciones y sistema</div>
                  </div>
                  <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{soundVolume}%</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  value={soundVolume}
                  onChange={(v) => os.settings.set('sound.volume', v)}
                />
              </div>
            </div>

            {/* Mute */}
            <div className="settings-card" style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <div style={cardTitleStyle}>Silencio</div>
                  <div style={cardDescStyle}>Silenciar todos los sonidos y reproducción de audio</div>
                </div>
                <Toggle
                  checked={soundMuted}
                  onChange={(checked) => os.settings.set('sound.muted', checked)}
                />
              </div>
            </div>

            {/* System Sounds & Test */}
            <div className="settings-card" style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <div style={cardTitleStyle}>Sonidos del sistema</div>
                  <div style={cardDescStyle}>
                    Reproducir sonidos de inicio, notificaciones, papelera y alertas
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Button variant="secondary" onClick={handleTestSound}>
                    Probar sonido 🔔
                  </Button>
                  <Toggle
                    checked={systemSounds}
                    onChange={(checked) => os.settings.set('sound.systemSounds', checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION: RED E INTERNET */}
        {/* ========================================================= */}
        {activeSection === 'network' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Red e Internet</h2>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Conexión Wi-Fi y administración de redes inalámbricas
              </span>
            </div>

            {/* Wi-Fi Switch */}
            <div className="settings-card" style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <div style={cardTitleStyle}>Wi-Fi</div>
                  <div style={cardDescStyle}>
                    {wifiEnabled ? 'Activado y buscando redes disponibles' : 'El Wi-Fi está apagado'}
                  </div>
                </div>
                <Toggle checked={wifiEnabled} onChange={handleToggleWifi} />
              </div>
            </div>

            {/* Connected Network */}
            {wifiEnabled && connectedSsid && (
              <div className="settings-card" style={{ ...cardStyle, borderColor: 'var(--accent-color)' }}>
                <div style={cardHeaderStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '24px' }}>📶</div>
                    <div>
                      <div style={cardTitleStyle}>{connectedSsid}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-color)', fontWeight: 500 }}>
                        Conectada, segura
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="secondary" onClick={handleDisconnectNetwork}>
                      Desconectar
                    </Button>
                    <Button variant="secondary" onClick={() => handleForgetNetwork(connectedSsid)}>
                      Olvidar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Available Networks List */}
            {wifiEnabled && (
              <div className="settings-card" style={cardStyle}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={cardTitleStyle}>Redes disponibles</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                    {networks.map((net) => {
                      const isConnected = net.ssid === connectedSsid
                      return (
                        <div
                          key={net.ssid}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isConnected ? 'var(--accent-subtle)' : 'var(--bg-subtle)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>📶</span>
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>
                                {net.ssid}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                {net.secured ? '🔒 Seguridad WPA2/WPA3' : 'Red abierta'} • Señal: {net.signal}/4
                              </div>
                            </div>
                          </div>
                          <div>
                            {isConnected ? (
                              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-color)' }}>
                                Conectada
                              </span>
                            ) : (
                              <Button variant="secondary" onClick={() => handleConnectNetwork(net)}>
                                Conectar
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION: HORA E IDIOMA */}
        {/* ========================================================= */}
        {activeSection === 'datetime' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Hora e idioma</h2>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Zona horaria, formato horario y reloj del sistema
              </span>
            </div>

            {/* Current Clock Live Preview */}
            <div className="settings-card" style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '32px' }}>🕒</div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{currentTimeDisplay}</div>
                  <div style={cardDescStyle}>Hora simulada según tu zona horaria seleccionada</div>
                </div>
              </div>
            </div>

            {/* Timezone */}
            <div className="settings-card" style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <div style={cardTitleStyle}>Zona horaria</div>
                  <div style={cardDescStyle}>Selecciona tu región geográfica para el reloj del sistema</div>
                </div>
                <div style={{ width: '280px' }}>
                  <Select
                    value={timezone}
                    onChange={(e) => os.settings.set('datetime.timezone', e.target.value)}
                    options={[
                      { value: 'America/Caracas', label: '(UTC-04:00) Caracas' },
                      { value: 'America/Bogota', label: '(UTC-05:00) Bogotá, Lima, Quito' },
                      { value: 'America/New_York', label: '(UTC-05:00) Nueva York, Miami' },
                      { value: 'America/Mexico_City', label: '(UTC-06:00) Ciudad de México' },
                      { value: 'America/Buenos_Aires', label: '(UTC-03:00) Buenos Aires' },
                      { value: 'America/Santiago', label: '(UTC-04:00) Santiago de Chile' },
                      { value: 'Europe/Madrid', label: '(UTC+01:00) Madrid, París' },
                      { value: 'UTC', label: '(UTC+00:00) Tiempo Universal Coordinado' }
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* 24-Hour Format */}
            <div className="settings-card" style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <div style={cardTitleStyle}>Formato de 24 horas</div>
                  <div style={cardDescStyle}>Mostrar reloj en formato 24 horas (ej. 14:30) en vez de 12 horas (2:30 PM)</div>
                </div>
                <Toggle
                  checked={hour24}
                  onChange={(checked) => os.settings.set('datetime.hour24', checked)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION: CUENTA */}
        {/* ========================================================= */}
        {activeSection === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Tu cuenta</h2>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Nombre de usuario, foto de perfil y seguridad de la contraseña
              </span>
            </div>

            {/* Name and Avatar */}
            <div className="settings-card" style={cardStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={cardTitleStyle}>Información de perfil</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--accent-color)',
                      color: 'var(--accent-text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '28px',
                      boxShadow: 'var(--shadow-md)',
                      flexShrink: 0
                    }}
                  >
                    {userDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <TextField
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nombre de usuario"
                      />
                      <Button variant="primary" onClick={handleSaveName}>
                        Guardar
                      </Button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Button variant="secondary" onClick={handlePickAvatarFile}>
                        Cambiar avatar desde archivo…
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password Form */}
            <div className="settings-card" style={cardStyle}>
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={cardTitleStyle}>Cambiar contraseña</div>
                <div style={cardDescStyle}>
                  Actualiza tu clave de acceso. Requiere verificar tu contraseña actual.
                </div>

                {passwordStatus && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: passwordStatus.error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                      color: passwordStatus.error ? '#ef4444' : '#22c55e',
                      fontSize: 'var(--font-size-xs)'
                    }}
                  >
                    {passwordStatus.msg}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <TextField
                    type="password"
                    label="Contraseña actual"
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  />
                  <TextField
                    type="password"
                    label="Nueva contraseña"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                  />
                  <TextField
                    type="password"
                    label="Confirmar contraseña"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <Button variant="primary" type="submit">
                    Actualizar contraseña
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Card Layout Styles
const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-subtle)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: '16px 20px',
  boxShadow: 'var(--shadow-sm)'
}

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px'
}

const cardTitleStyle: React.CSSProperties = {
  fontWeight: 'var(--font-weight-semibold)',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--text-primary)'
}

const cardDescStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  color: 'var(--text-secondary)',
  marginTop: '2px'
}
