import React, { Component, ReactNode, ErrorInfo } from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/inter'
import './system/theme/tokens.css'
import { Shell } from './os/shell'

// Window-level error logging for developer insights
window.addEventListener('error', (event) => {
  console.error('[Window Uncaught Error]:', event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Window Unhandled Rejection]:', event.reason)
})

interface RootErrorBoundaryProps {
  children: ReactNode
}

interface RootErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  constructor(props: RootErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[RootErrorBoundary] Fatal React render crash:', error, info)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            fontFamily: 'system-ui, sans-serif',
            padding: '24px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
            Se produjo un error en la interfaz de hebi OS
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '480px', marginBottom: '24px' }}>
            {this.state.error?.message || 'Error inesperado durante la ejecución.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              backgroundColor: '#0d9488',
              color: '#ffffff',
              border: 'none',
              fontWeight: 500,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Reiniciar interfaz
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <Shell />
    </RootErrorBoundary>
  </React.StrictMode>
)
