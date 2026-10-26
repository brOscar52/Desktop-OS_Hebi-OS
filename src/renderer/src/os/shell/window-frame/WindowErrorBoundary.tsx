import { Component, ReactNode, ErrorInfo } from 'react'
import { windowManager } from '../../kernel/windows'

interface WindowErrorBoundaryProps {
  windowId: string
  children: ReactNode
}

interface WindowErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class WindowErrorBoundary extends Component<
  WindowErrorBoundaryProps,
  WindowErrorBoundaryState
> {
  constructor(props: WindowErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): WindowErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[WindowErrorBoundary] Error in window ${this.props.windowId}:`, error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  handleClose = (): void => {
    windowManager.close(this.props.windowId)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 24px',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-family-base)',
            textAlign: 'center',
            userSelect: 'none'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              marginBottom: '16px'
            }}
          >
            ⚠️
          </div>

          <h3
            style={{
              margin: '0 0 8px 0',
              fontSize: 'var(--font-size-md)',
              fontWeight: 'var(--font-weight-semibold)'
            }}
          >
            Se produjo un problema al cargar esta aplicación
          </h3>

          <p
            style={{
              margin: '0 0 20px 0',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-secondary)',
              maxWidth: '380px',
              lineHeight: 1.5,
              wordBreak: 'break-word'
            }}
          >
            {this.state.error?.message || 'Error inesperado durante la ejecución.'}
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={this.handleRetry}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-color)',
                color: 'var(--accent-text)',
                border: 'none',
                fontWeight: 'var(--font-weight-medium)',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer'
              }}
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={this.handleClose}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer'
              }}
            >
              Cerrar ventana
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
