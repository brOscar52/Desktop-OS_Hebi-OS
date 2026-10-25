import React, { useEffect, useState } from 'react'
import { fs as kernelFs, FsNode } from '../kernel/fs'
import { FileIcon } from './FileIcon'
import { Button } from './Button'
import { TextField } from './TextField'

export interface FileBrowserProps {
  mode?: 'open' | 'save'
  startPath?: string
  extensions?: string[]
  multiple?: boolean
  foldersOnly?: boolean
  defaultName?: string
  onConfirm: (paths: string[]) => void
  onCancel: () => void
  style?: React.CSSProperties
  className?: string
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
  mode = 'open',
  startPath = '/Usuario/Documentos',
  extensions,
  multiple = false,
  foldersOnly = false,
  defaultName = '',
  onConfirm,
  onCancel,
  style,
  className
}) => {
  const [currentPath, setCurrentPath] = useState<string>(startPath)
  const [nodes, setNodes] = useState<FsNode[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [fileName, setFileName] = useState<string>(defaultName)
  const [error, setError] = useState<string | null>(null)

  // Load directory contents
  useEffect(() => {
    let isMounted = true
    const loadDir = async () => {
      try {
        const list = await kernelFs.list(currentPath)
        if (isMounted) {
          // Filter if foldersOnly or extensions
          let filtered = list
          if (foldersOnly) {
            filtered = list.filter((n) => n.kind === 'folder')
          } else if (extensions && extensions.length > 0) {
            filtered = list.filter((n) => {
              if (n.kind === 'folder') return true
              const ext = n.name.split('.').pop()?.toLowerCase() || ''
              return extensions.map((e) => e.replace('.', '').toLowerCase()).includes(ext)
            })
          }
          setNodes(filtered)
          setSelectedIds(new Set())
          setError(null)
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError((err as Error).message || 'Error al abrir la carpeta')
        }
      }
    }
    loadDir()
    return () => {
      isMounted = false
    }
  }, [currentPath, extensions, foldersOnly])

  const handleNodeClick = (node: FsNode, e: React.MouseEvent) => {
    if (multiple && (e.ctrlKey || e.metaKey)) {
      const next = new Set(selectedIds)
      if (next.has(node.id)) next.delete(node.id)
      else next.add(node.id)
      setSelectedIds(next)
    } else {
      setSelectedIds(new Set([node.id]))
    }

    if (node.kind === 'file') {
      setFileName(node.name)
    }
  }

  const handleNodeDoubleClick = async (node: FsNode) => {
    if (node.kind === 'folder') {
      const newPath = currentPath.endsWith('/') ? `${currentPath}${node.name}` : `${currentPath}/${node.name}`
      setCurrentPath(newPath)
    } else if (mode === 'open') {
      onConfirm([`${currentPath}/${node.name}`])
    }
  }

  const navigateUp = () => {
    if (currentPath === '/' || currentPath === '') return
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    const parentPath = '/' + parts.join('/')
    setCurrentPath(parentPath === '' ? '/' : parentPath)
  }

  const handleAction = () => {
    if (mode === 'save') {
      if (!fileName.trim()) {
        setError('Introduce un nombre de archivo válido')
        return
      }
      const fullPath = currentPath.endsWith('/') ? `${currentPath}${fileName.trim()}` : `${currentPath}/${fileName.trim()}`
      onConfirm([fullPath])
    } else {
      // Open mode
      const selectedNodes = nodes.filter((n) => selectedIds.has(n.id))
      if (selectedNodes.length === 0) {
        setError('Selecciona al menos un elemento')
        return
      }
      const paths = selectedNodes.map((n) =>
        currentPath.endsWith('/') ? `${currentPath}${n.name}` : `${currentPath}/${n.name}`
      )
      onConfirm(paths)
    }
  }

  const sidebarLocations = [
    { label: 'Escritorio', path: '/Usuario/Escritorio' },
    { label: 'Documentos', path: '/Usuario/Documentos' },
    { label: 'Descargas', path: '/Usuario/Descargas' },
    { label: 'Imágenes', path: '/Usuario/Imágenes' },
    { label: 'Música', path: '/Usuario/Música' },
    { label: 'Vídeos', path: '/Usuario/Vídeos' },
    { label: 'Disco local (C:)', path: '/' }
  ]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '680px',
        height: '460px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-window)',
        fontFamily: 'var(--font-family-base)',
        color: 'var(--text-primary)',
        userSelect: 'none',
        ...style
      }}
      className={className}
    >
      {/* Top Address & Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-subtle)'
        }}
      >
        <button
          type="button"
          onClick={navigateUp}
          disabled={currentPath === '/'}
          style={{
            border: 'none',
            background: 'transparent',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            cursor: currentPath === '/' ? 'not-allowed' : 'pointer',
            opacity: currentPath === '/' ? 0.4 : 1,
            color: 'var(--text-primary)'
          }}
          title="Subir de nivel"
        >
          ↑
        </button>

        <div
          style={{
            flex: 1,
            padding: '4px 8px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {kernelFs.toDisplayPath(currentPath)}
        </div>
      </div>

      {/* Main View: Left Sidebar + File Grid */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left Quick Access Sidebar */}
        <div
          style={{
            width: '160px',
            backgroundColor: 'var(--bg-subtle)',
            borderRight: '1px solid var(--border-subtle)',
            padding: '8px 6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', padding: '4px 6px' }}>Acceso rápido</span>
          {sidebarLocations.map((loc) => {
            const isCurrent = currentPath === loc.path
            return (
              <button
                key={loc.path}
                type="button"
                onClick={() => setCurrentPath(loc.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isCurrent ? 'var(--bg-active)' : 'transparent',
                  color: isCurrent ? 'var(--accent-color)' : 'var(--text-primary)',
                  fontWeight: isCurrent ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
                  fontSize: 'var(--font-size-xs)',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>📁</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.label}</span>
              </button>
            )
          })}
        </div>

        {/* File Grid */}
        <div
          style={{
            flex: 1,
            padding: '12px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))',
            alignContent: 'start',
            gap: '10px'
          }}
        >
          {nodes.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '40px',
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: 'var(--font-size-sm)'
              }}
            >
              Esta carpeta está vacía
            </div>
          ) : (
            nodes.map((node) => {
              const isSelected = selectedIds.has(node.id)
              const ext = node.name.split('.').pop()
              return (
                <div
                  key={node.id}
                  onClick={(e) => handleNodeClick(node, e)}
                  onDoubleClick={() => handleNodeDoubleClick(node)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                    border: isSelected ? '1px solid var(--accent-border)' : '1px solid transparent',
                    cursor: 'pointer',
                    gap: '6px',
                    textAlign: 'center'
                  }}
                >
                  <FileIcon
                    type={node.kind}
                    mime={node.mime}
                    extension={ext}
                    size={40}
                  />
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-primary)',
                      maxWidth: '76px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={node.name}
                  >
                    {node.name}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Footer / Action Controls */}
      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {error && (
          <span style={{ fontSize: 'var(--font-size-xs)', color: '#c42b1c' }}>{error}</span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {mode === 'save' && (
            <div style={{ flex: 1 }}>
              <TextField
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Nombre del archivo"
              />
            </div>
          )}

          {extensions && extensions.length > 0 && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
              ({extensions.map((e) => `*.${e.replace('.', '')}`).join(', ')})
            </span>
          )}

          <div style={{ display: 'flex', gap: '8px', marginLeft: mode === 'open' ? 'auto' : undefined }}>
            <Button variant="primary" onClick={handleAction}>
              {mode === 'save' ? 'Guardar' : 'Abrir'}
            </Button>
            <Button variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
