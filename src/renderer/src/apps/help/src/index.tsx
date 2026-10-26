import React, { useState, useMemo } from 'react'
import { useOS, type AppDetail } from '@os/sdk'
import { TextField, AppIcon, EmptyState, Button } from '@os/ui'

function parseInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} style={{ fontStyle: 'italic' }}>
          {token.slice(1, -1)}
        </em>
      )
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          style={{
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: 'var(--accent-color)'
          }}
        >
          {token.slice(1, -1)}
        </code>
      )
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

function MarkdownRenderer({ content }: { content: string }): JSX.Element {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []
  let listType: 'ul' | 'ol' = 'ul'

  const flushList = (key: number) => {
    if (listItems.length === 0) return null
    const isOrdered = listType === 'ol'
    const rendered = isOrdered ? (
      <ol key={`list-${key}`} style={{ margin: '8px 0 16px 20px', padding: 0 }}>
        {listItems.map((item, idx) => (
          <li key={idx} style={{ marginBottom: '6px', lineHeight: '1.6', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {parseInlineMarkdown(item)}
          </li>
        ))}
      </ol>
    ) : (
      <ul key={`list-${key}`} style={{ margin: '8px 0 16px 20px', padding: 0 }}>
        {listItems.map((item, idx) => (
          <li key={idx} style={{ marginBottom: '6px', lineHeight: '1.6', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {parseInlineMarkdown(item)}
          </li>
        ))}
      </ul>
    )
    listItems = []
    return rendered
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    if (!trimmed) {
      if (listItems.length > 0) {
        elements.push(flushList(idx))
      }
      return
    }

    if (trimmed.startsWith('### ')) {
      if (listItems.length > 0) elements.push(flushList(idx))
      elements.push(
        <h3
          key={idx}
          style={{
            fontSize: '15px',
            fontWeight: 600,
            marginTop: '18px',
            marginBottom: '8px',
            color: 'var(--text-primary)'
          }}
        >
          {parseInlineMarkdown(trimmed.slice(4))}
        </h3>
      )
    } else if (trimmed.startsWith('## ')) {
      if (listItems.length > 0) elements.push(flushList(idx))
      elements.push(
        <h2
          key={idx}
          style={{
            fontSize: '18px',
            fontWeight: 600,
            marginTop: '22px',
            marginBottom: '10px',
            color: 'var(--text-primary)',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '4px'
          }}
        >
          {parseInlineMarkdown(trimmed.slice(3))}
        </h2>
      )
    } else if (trimmed.startsWith('# ')) {
      if (listItems.length > 0) elements.push(flushList(idx))
      elements.push(
        <h1
          key={idx}
          style={{
            fontSize: '24px',
            fontWeight: 700,
            marginTop: '6px',
            marginBottom: '12px',
            color: 'var(--text-primary)'
          }}
        >
          {parseInlineMarkdown(trimmed.slice(2))}
        </h1>
      )
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listType = 'ul'
      listItems.push(trimmed.slice(2))
    } else if (/^\d+\.\s/.test(trimmed)) {
      listType = 'ol'
      listItems.push(trimmed.replace(/^\d+\.\s/, ''))
    } else {
      if (listItems.length > 0) elements.push(flushList(idx))
      elements.push(
        <p
          key={idx}
          style={{
            fontSize: '13px',
            lineHeight: '1.6',
            color: 'var(--text-secondary)',
            marginBottom: '12px'
          }}
        >
          {parseInlineMarkdown(trimmed)}
        </p>
      )
    }
  })

  if (listItems.length > 0) {
    elements.push(flushList(lines.length))
  }

  return <div>{elements}</div>
}

export default function HelpApp(): JSX.Element {
  const os = useOS()

  const [selectedSection, setSelectedSection] = useState<string>('getting-started')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Load registered apps
  const apps = useMemo(() => {
    return os.apps.listDetails().sort((a, b) => a.manifest.name.localeCompare(b.manifest.name))
  }, [os.apps])

  // Filter sections by search query
  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return apps
    const q = searchQuery.toLowerCase()
    return apps.filter(
      (a) =>
        a.manifest.name.toLowerCase().includes(q) ||
        a.manifest.description.toLowerCase().includes(q) ||
        (a.helpText && a.helpText.toLowerCase().includes(q))
    )
  }, [apps, searchQuery])

  const showGettingStarted = useMemo(() => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      'primeros pasos'.includes(q) ||
      'escritorio'.includes(q) ||
      'barra de tareas'.includes(q) ||
      'menú inicio'.includes(q) ||
      'ventanas'.includes(q) ||
      'archivos'.includes(q) ||
      'papelera'.includes(q)
    )
  }, [searchQuery])

  const selectedApp: AppDetail | undefined = useMemo(() => {
    if (selectedSection === 'getting-started') return undefined
    return apps.find((a) => a.id === selectedSection)
  }, [apps, selectedSection])

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* Left Navigation Sidebar */}
      <div
        style={{
          width: '280px',
          minWidth: '240px',
          backgroundColor: 'var(--bg-card)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}
      >
        {/* Header / Search Box */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 700,
              marginBottom: '12px',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>💡</span>
            <span>Ayuda de {os.system.name}</span>
          </div>

          <TextField
            placeholder="Buscar en la ayuda…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Navigation Items List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px'
          }}
        >
          {showGettingStarted && (
            <div
              onClick={() => setSelectedSection('getting-started')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                marginBottom: '4px',
                backgroundColor:
                  selectedSection === 'getting-started' ? 'var(--accent-subtle)' : 'transparent',
                color:
                  selectedSection === 'getting-started'
                    ? 'var(--accent-color)'
                    : 'var(--text-primary)',
                fontWeight: selectedSection === 'getting-started' ? 600 : 400,
                fontSize: '13px'
              }}
            >
              <span style={{ fontSize: '16px' }}>🚀</span>
              <span>Primeros pasos</span>
            </div>
          )}

          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
              padding: '12px 12px 6px 12px',
              letterSpacing: '0.5px'
            }}
          >
            Aplicaciones ({filteredApps.length})
          </div>

          {filteredApps.map((a) => {
            const isSelected = selectedSection === a.id
            return (
              <div
                key={a.id}
                onClick={() => setSelectedSection(a.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '2px',
                  backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                  color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                  fontWeight: isSelected ? 600 : 400,
                  fontSize: '13px'
                }}
              >
                <AppIcon appId={a.id} size={20} />
                <span
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {a.manifest.name}
                </span>
              </div>
            )
          })}

          {!showGettingStarted && filteredApps.length === 0 && (
            <div
              style={{
                padding: '24px 12px',
                textAlign: 'center',
                fontSize: '12px',
                color: 'var(--text-tertiary)'
              }}
            >
              No se encontraron resultados para &ldquo;{searchQuery}&rdquo;.
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          height: '100%',
          overflowY: 'auto',
          padding: '32px 48px',
          maxWidth: '860px'
        }}
      >
        {selectedSection === 'getting-started' ? (
          <div>
            {/* System Banner / Cover */}
            <div
              style={{
                padding: '24px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '28px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '14px',
                  backgroundColor: 'var(--accent-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  color: '#ffffff',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                🐍
              </div>
              <div>
                <h1
                  style={{
                    margin: '0 0 6px 0',
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'var(--text-primary)'
                  }}
                >
                  Bienvenido a {os.system.name}
                </h1>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.5'
                  }}
                >
                  Un entorno de escritorio moderno, ágil y elegante con diseño inspirado en Fluent y
                  una identidad propia en tonalidades turquesa.
                </p>
              </div>
            </div>

            {/* Getting Started Guide Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    marginBottom: '10px',
                    color: 'var(--text-primary)',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '4px'
                  }}
                >
                  1. El Escritorio y los Widgets
                </h2>
                <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                  El Escritorio te ofrece un lienzo interactivo donde conviven tus accesos directos,
                  archivos guardados en <code>~/Escritorio</code> y la <strong>Papelera de reciclaje</strong>.
                  Además, puedes hacer clic derecho sobre el fondo para <strong>Añadir widgets</strong>
                  (Reloj, Calendario, Nota rápida y Estado del sistema), moverlos libremente o redimensionarlos.
                </p>
              </div>

              <div>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    marginBottom: '10px',
                    color: 'var(--text-primary)',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '4px'
                  }}
                >
                  2. La Barra de tareas y el Menú Inicio
                </h2>
                <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                  En la parte inferior de la pantalla encontrarás la <strong>Barra de tareas</strong>.
                  El botón de Inicio abre un menú acrílico flotante con tus aplicaciones fijadas y la
                  lista completa ordenada alfabéticamente. En el extremo derecho se ubica la bandeja
                  del sistema con el estado de red Wi-Fi, control de volumen maestro, batería y reloj con calendario mensual.
                </p>
              </div>

              <div>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    marginBottom: '10px',
                    color: 'var(--text-primary)',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '4px'
                  }}
                >
                  3. Gestión de Ventanas y Multitarea
                </h2>
                <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                  Todas las ventanas cuentan con marcos translúcidos tipo Mica. Puedes arrastrarlas desde
                  su barra de título, redimensionarlas desde cualquiera de sus 8 bordes, maximizarlas
                  al área de trabajo (respetando la barra de tareas) o minimizarlas con un clic. Si cierras
                  una app con cambios pendientes (como el Bloc de notas o Paint), el sistema te avisará
                  para evitar la pérdida accidental de datos.
                </p>
              </div>

              <div>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    marginBottom: '10px',
                    color: 'var(--text-primary)',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '4px'
                  }}
                >
                  4. Sistema de Archivos y Papelera de reciclaje
                </h2>
                <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                  Tus carpetas de usuario (<code>Escritorio</code>, <code>Documentos</code>, <code>Descargas</code>,{' '}
                  <code>Imágenes</code>, <code>Música</code> y <code>Videos</code>) son persistentes.
                  Puedes importar archivos reales desde tu ordenador a través del botón{' '}
                  <strong>Importar desde el equipo…</strong> del Explorador de archivos y abrirlos con las
                  17 aplicaciones integradas.
                </p>
              </div>
            </div>
          </div>
        ) : selectedApp ? (
          <div>
            {/* App Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <AppIcon appId={selectedApp.id} size={48} />
                <div>
                  <h1
                    style={{
                      margin: '0 0 4px 0',
                      fontSize: '22px',
                      fontWeight: 700,
                      color: 'var(--text-primary)'
                    }}
                  >
                    {selectedApp.manifest.name}
                  </h1>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {selectedApp.manifest.description}
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={() => os.apps.launch(selectedApp.id)}
              >
                Abrir aplicación
              </Button>
            </div>

            {/* App Cover Banner if present */}
            {selectedApp.coverUrl && (
              <div
                style={{
                  width: '100%',
                  maxHeight: '220px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  marginBottom: '24px',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <img
                  src={selectedApp.coverUrl}
                  alt={selectedApp.manifest.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            {/* App Information Badges */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
                flexWrap: 'wrap'
              }}
            >
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}
              >
                Categoría: <strong>{selectedApp.manifest.category}</strong>
              </div>
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}
              >
                Versión: <strong>{selectedApp.manifest.version}</strong>
              </div>
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}
              >
                Autor: <strong>{selectedApp.manifest.author}</strong>
              </div>
            </div>

            {/* Render help.md content */}
            {selectedApp.helpText ? (
              <MarkdownRenderer content={selectedApp.helpText} />
            ) : (
              <EmptyState
                title="Sin documentación adicional"
                description="Esta aplicación no tiene un archivo help.md asociado."
              />
            )}
          </div>
        ) : (
          <EmptyState
            title="Sección no encontrada"
            description="Elige una sección de la lista lateral para visualizar su guía."
          />
        )}
      </div>
    </div>
  )
}
