import React, { useState } from 'react'
import logoSvg from '../../../system/boot/logo.svg'
import osConfig from '../../../system/os.config.json'
import avatarDefault from '../../../system/icons/avatar-default.svg'
import { useSession } from '../../kernel/session'
import { fs } from '../../kernel/fs'
import { settings } from '../../kernel/settings'
import { UserRecord } from '../../kernel/storage'

const BUILTIN_AVATARS = [
  { id: 'default', label: 'Predeterminado', color: '#0D9488' },
  { id: 'blue', label: 'Océano', color: '#0284C7' },
  { id: 'emerald', label: 'Esmeralda', color: '#10B981' },
  { id: 'purple', label: 'Amatista', color: '#8B5CF6' },
  { id: 'amber', label: 'Ámbar', color: '#F59E0B' }
]

export const SetupWizard: React.FC = () => {
  const { finishSetup } = useSession()

  const [step, setStep] = useState<number>(1)
  const [name, setName] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [selectedAvatar, setSelectedAvatar] = useState<string>('default')
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const handleNext = async () => {
    setError('')

    if (step === 1) {
      setStep(2)
      return
    }

    if (step === 2) {
      if (!name.trim()) {
        setError('Por favor escribe tu nombre.')
        return
      }
      if (name.includes('/') || name.includes('\\') || name.includes(':')) {
        setError('El nombre no puede contener caracteres como / \\ :')
        return
      }
      setStep(3)
      return
    }

    if (step === 3) {
      if (password.length < 4) {
        setError('La contraseña debe tener al menos 4 caracteres.')
        return
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.')
        return
      }
      setStep(4)
      return
    }

    if (step === 4) {
      setStep(5)
      return
    }

    if (step === 5) {
      setLoading(true)
      try {
        // Hash password with native crypto scrypt
        const { hash, salt } = await window.native.auth.hashPassword(password)

        const user: UserRecord = {
          id: 'user-default',
          name: name.trim(),
          avatar: { type: 'builtin', id: selectedAvatar },
          passwordHash: hash,
          salt,
          createdAt: Date.now()
        }

        // Apply chosen theme
        await settings.set('appearance.theme', themeMode)

        // Seed initial filesystem tree
        await fs.seedInitialTree(user.name)

        // Finish setup and login
        await finishSetup(user)
      } catch (err) {
        console.error('Error during setup:', err)
        setError('Ocurrió un error al guardar la configuración.')
        setLoading(false)
      }
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        userSelect: 'none'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          backgroundColor: '#1E293B',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#F8FAFC'
        }}
      >
        {/* Header / Step Bar */}
        <div
          style={{
            padding: '24px 36px 12px 36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={logoSvg} alt={osConfig.name} style={{ width: '28px', height: '28px' }} />
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#2DD4BF' }}>
              {osConfig.name}
            </span>
          </div>
          <span style={{ fontSize: '13px', color: '#94A3B8' }}>
            Paso {step} de 5
          </span>
        </div>

        {/* Card Body */}
        <div style={{ padding: '36px', minHeight: '320px', display: 'flex', flexDirection: 'column' }}>
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px', margin: 'auto 0' }}>
              <img src={logoSvg} alt="Logo" style={{ width: '72px', height: '72px' }} />
              <h2 style={{ fontSize: '26px', margin: 0, fontWeight: 700 }}>
                Bienvenido a {osConfig.name}
              </h2>
              <p style={{ margin: 0, color: '#94A3B8', maxWidth: '460px', lineHeight: 1.6, fontSize: '15px' }}>
                Vamos a preparar tu entorno de escritorio en solo unos pasos. Configura tu cuenta para empezar a usar el sistema.
              </p>
            </div>
          )}

          {/* Step 2: Name */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: 'auto 0' }}>
              <h2 style={{ fontSize: '24px', margin: 0, fontWeight: 600 }}>
                ¿Cómo te llamas?
              </h2>
              <p style={{ margin: 0, color: '#94A3B8', fontSize: '14px' }}>
                Este nombre se usará para tu cuenta de usuario y tu carpeta personal.
              </p>
              <input
                type="text"
                value={name}
                autoFocus
                placeholder="Ingresa tu nombre"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  outline: 'none',
                  marginTop: '8px'
                }}
              />
            </div>
          )}

          {/* Step 3: Password */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: 'auto 0' }}>
              <h2 style={{ fontSize: '24px', margin: 0, fontWeight: 600 }}>
                Crea una contraseña segura
              </h2>
              <p style={{ margin: 0, color: '#94A3B8', fontSize: '14px' }}>
                Mínimo 4 caracteres. Se guardará de forma cifrada con sal criptográfica.
              </p>
              <input
                type="password"
                value={password}
                autoFocus
                placeholder="Contraseña"
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
              <input
                type="password"
                value={confirmPassword}
                placeholder="Confirmar contraseña"
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* Step 4: Avatar */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', margin: 'auto 0' }}>
              <h2 style={{ fontSize: '24px', margin: 0, fontWeight: 600 }}>
                Elige tu avatar
              </h2>
              <p style={{ margin: 0, color: '#94A3B8', fontSize: '14px' }}>
                Selecciona la imagen de perfil que se mostrará en el inicio de sesión y la barra de tareas.
              </p>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px' }}>
                {BUILTIN_AVATARS.map((av) => (
                  <div
                    key={av.id}
                    onClick={() => setSelectedAvatar(av.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: av.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: selectedAvatar === av.id ? '3px solid #2DD4BF' : '3px solid transparent',
                        boxShadow: selectedAvatar === av.id ? '0 0 16px rgba(45, 212, 191, 0.5)' : 'none',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <img src={avatarDefault} alt={av.label} style={{ width: '48px', height: '48px' }} />
                    </div>
                    <span style={{ fontSize: '12px', color: selectedAvatar === av.id ? '#2DD4BF' : '#94A3B8' }}>
                      {av.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Color Mode */}
          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', margin: 'auto 0' }}>
              <h2 style={{ fontSize: '24px', margin: 0, fontWeight: 600 }}>
                Elige tu estilo visual
              </h2>
              <p style={{ margin: 0, color: '#94A3B8', fontSize: '14px' }}>
                Puedes cambiar el modo de color en cualquier momento desde Configuración.
              </p>
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '12px' }}>
                {/* Light */}
                <div
                  onClick={() => setThemeMode('light')}
                  style={{
                    flex: 1,
                    maxWidth: '220px',
                    padding: '20px',
                    borderRadius: '8px',
                    backgroundColor: '#F8FAFC',
                    color: '#0F172A',
                    border: themeMode === 'light' ? '3px solid #0D9488' : '3px solid transparent',
                    cursor: 'pointer',
                    textAlign: 'center',
                    boxShadow: themeMode === 'light' ? '0 0 16px rgba(13, 148, 136, 0.4)' : 'none'
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>☀️</div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>Modo claro</div>
                </div>

                {/* Dark */}
                <div
                  onClick={() => setThemeMode('dark')}
                  style={{
                    flex: 1,
                    maxWidth: '220px',
                    padding: '20px',
                    borderRadius: '8px',
                    backgroundColor: '#0F172A',
                    color: '#F8FAFC',
                    border: themeMode === 'dark' ? '3px solid #0D9488' : '3px solid #334155',
                    cursor: 'pointer',
                    textAlign: 'center',
                    boxShadow: themeMode === 'dark' ? '0 0 16px rgba(13, 148, 136, 0.4)' : 'none'
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>🌙</div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>Modo oscuro</div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: '16px',
                padding: '10px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #EF4444',
                color: '#FCA5A5',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 36px',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          {step > 1 ? (
            <button
              onClick={() => {
                setError('')
                setStep(step - 1)
              }}
              disabled={loading}
              style={{
                padding: '8px 18px',
                borderRadius: '4px',
                border: '1px solid #475569',
                backgroundColor: 'transparent',
                color: '#CBD5E1',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Atrás
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            disabled={loading}
            style={{
              padding: '10px 24px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#0D9488',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '14px',
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.15s ease'
            }}
          >
            {loading ? 'Configurando...' : step === 5 ? 'Finalizar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  )
}
