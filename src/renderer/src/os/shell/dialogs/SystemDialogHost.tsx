import React, { useState } from 'react'
import { useDialogsStore } from '../../kernel/dialogs'
import {
  AlertOptions,
  ConfirmOptions,
  PromptOptions,
  ChooseOptions,
  OpenFileOptions,
  SaveFileOptions,
  UnsavedChangesOptions
} from '../../kernel/dialogs/types'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/TextField'
import { FileBrowser } from '../../ui/FileBrowser'

export const SystemDialogHost: React.FC = () => {
  const dialogs = useDialogsStore((s) => s.dialogs)
  const systemDialog = dialogs.find((d) => d.targetWindowId === null)

  const [promptInput, setPromptInput] = useState<string>('')
  const [promptError, setPromptError] = useState<string | null>(null)

  if (!systemDialog) return null

  const { type, options, resolve } = systemDialog

  const renderContent = () => {
    switch (type) {
      case 'unsavedChanges': {
        const opts = options as UnsavedChangesOptions
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '340px', maxWidth: '420px' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
              ¿Quieres guardar los cambios en &quot;{opts.documentName}&quot;?
            </h3>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              <Button variant="primary" onClick={() => resolve('save')}>
                Guardar
              </Button>
              <Button variant="secondary" onClick={() => resolve('dont-save')}>
                No guardar
              </Button>
              <Button variant="secondary" onClick={() => resolve('cancel')}>
                Cancelar
              </Button>
            </div>
          </div>
        )
      }

      case 'alert': {
        const opts = options as AlertOptions
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '320px', maxWidth: '400px' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
              {opts.title}
            </h3>
            {opts.message && (
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                {opts.message}
              </p>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              <Button variant="primary" onClick={() => resolve(undefined)}>
                Aceptar
              </Button>
            </div>
          </div>
        )
      }

      case 'confirm': {
        const opts = options as ConfirmOptions
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '320px', maxWidth: '400px' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
              {opts.title}
            </h3>
            {opts.message && (
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                {opts.message}
              </p>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              <Button
                variant={opts.destructive ? 'destructive' : 'primary'}
                onClick={() => resolve(true)}
              >
                {opts.confirmLabel || 'Aceptar'}
              </Button>
              <Button variant="secondary" onClick={() => resolve(false)}>
                {opts.cancelLabel || 'Cancelar'}
              </Button>
            </div>
          </div>
        )
      }

      case 'prompt': {
        const opts = options as PromptOptions
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '340px', maxWidth: '420px' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
              {opts.title}
            </h3>
            {opts.message && (
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                {opts.message}
              </p>
            )}
            <TextField
              value={promptInput}
              error={promptError || undefined}
              onChange={(e) => {
                setPromptInput(e.target.value)
                setPromptError(null)
              }}
              autoFocus
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              <Button
                variant="primary"
                onClick={() => {
                  if (opts.validate) {
                    const err = opts.validate(promptInput)
                    if (err) {
                      setPromptError(err)
                      return
                    }
                  }
                  resolve(promptInput)
                }}
              >
                Aceptar
              </Button>
              <Button variant="secondary" onClick={() => resolve(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )
      }

      case 'choose': {
        const opts = options as ChooseOptions
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '320px', maxWidth: '400px' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
              {opts.title}
            </h3>
            {opts.message && (
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                {opts.message}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0' }}>
              {opts.options.map((opt) => (
                <Button
                  key={opt.value}
                  variant={opt.destructive ? 'destructive' : 'secondary'}
                  onClick={() => resolve(opt.value)}
                  style={{ justifyContent: 'flex-start' }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="subtle" onClick={() => resolve(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )
      }

      case 'openFile': {
        const opts = options as OpenFileOptions
        return (
          <FileBrowser
            mode="open"
            startPath={opts.startPath}
            extensions={opts.extensions}
            multiple={opts.multiple}
            foldersOnly={opts.folders}
            onConfirm={(paths) => resolve(paths)}
            onCancel={() => resolve(null)}
          />
        )
      }

      case 'saveFile': {
        const opts = options as SaveFileOptions
        return (
          <FileBrowser
            mode="save"
            startPath={opts.startPath}
            defaultName={opts.defaultName}
            extensions={opts.extensions}
            onConfirm={(paths) => resolve(paths[0] || null)}
            onCancel={() => resolve(null)}
          />
        )
      }

      default:
        return null
    }
  }

  const isFileBrowser = type === 'openFile' || type === 'saveFile'

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        userSelect: 'none'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          backgroundColor: isFileBrowser ? 'transparent' : 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: isFileBrowser ? 'none' : 'var(--shadow-window)',
          border: isFileBrowser ? 'none' : '1px solid var(--border-subtle)',
          padding: isFileBrowser ? 0 : '24px 28px',
          boxSizing: 'border-box',
          maxWidth: '96%',
          maxHeight: '96%',
          overflow: 'auto'
        }}
      >
        {renderContent()}
      </div>
    </div>
  )
}
