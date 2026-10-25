import { useState, useEffect } from 'react'
import { useOS } from '@os/sdk'

export default function QuickNoteWidget(): JSX.Element {
  const os = useOS()
  const [content, setContent] = useState<string>('')
  const [loaded, setLoaded] = useState<boolean>(false)

  // Load persisted note content
  useEffect(() => {
    let isMounted = true
    os.storage.get<string>('content').then((saved) => {
      if (isMounted) {
        if (saved !== undefined) setContent(saved)
        setLoaded(true)
      }
    })
    return () => {
      isMounted = false
    }
  }, [os.storage])

  const handleChange = (newVal: string) => {
    setContent(newVal)
    os.storage.set('content', newVal)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        padding: '12px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '8px',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--text-secondary)'
        }}
      >
        <span>📝</span>
        <span>Nota rápida</span>
      </div>

      <textarea
        disabled={!loaded}
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Escribe una nota rápida..."
        style={{
          flex: 1,
          width: '100%',
          resize: 'none',
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
          fontFamily: 'var(--font-family-base)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--text-primary)',
          lineHeight: '1.4',
          boxSizing: 'border-box',
          padding: 0
        }}
      />
    </div>
  )
}
