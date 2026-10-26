import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useOS, type FsNode } from '@os/sdk'

interface OutputLine {
  id: string
  type: 'prompt' | 'output' | 'error' | 'success' | 'info'
  text: string
  cwdDisplay?: string
}

export default function TerminalApp(): JSX.Element {
  const os = useOS()

  // Terminal state
  const homeDir = useMemo(() => os.fs.getHomeDir(), [os.fs])
  const [cwd, setCwd] = useState<string>(homeDir)
  const [input, setInput] = useState<string>('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [lines, setLines] = useState<OutputLine[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // Current display path for prompt
  const displayCwd = useMemo(() => os.fs.toDisplayPath(cwd), [os.fs, cwd])

  // Update window title
  useEffect(() => {
    os.window.setTitle(`Windows PowerShell - ${displayCwd}`)
  }, [displayCwd, os.window])

  // Initial welcome message
  useEffect(() => {
    setLines([
      {
        id: 'welcome-1',
        type: 'info',
        text: 'Hebi OS Windows PowerShell [Versión 1.0.0]'
      },
      {
        id: 'welcome-2',
        type: 'info',
        text: '(c) Hebi Corporation. Todos los derechos reservados.\nEscribe "help" para ver la lista de comandos disponibles.\n'
      }
    ])
  }, [])

  // Auto-scroll to bottom on new output
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines, input])

  // Focus input on click anywhere inside terminal
  const handleTerminalClick = () => {
    inputRef.current?.focus()
  }

  // Resolve path relative to current working directory
  const resolvePath = useCallback(
    (argPath?: string): string => {
      if (!argPath || argPath.trim() === '') {
        return cwd
      }
      const trimmed = argPath.trim()

      // Handle ~ or C:\ or /
      if (
        trimmed === '~' ||
        trimmed.startsWith('~/') ||
        trimmed.startsWith('~\\') ||
        /^[a-zA-Z]:/.test(trimmed) ||
        trimmed.startsWith('/') ||
        trimmed.startsWith('\\')
      ) {
        return os.fs.fromDisplayPath(trimmed)
      }

      // Handle relative paths like "foo", "foo/bar", ".."
      const combined = cwd === '/' ? `/${trimmed}` : `${cwd}/${trimmed}`
      return os.fs.fromDisplayPath(combined)
    },
    [cwd, os.fs]
  )

  // Tree generator helper
  const generateTree = async (dirPath: string, prefix = '', depth = 0): Promise<string[]> => {
    if (depth > 3) return [`${prefix}└── ... (límite de profundidad)`]
    try {
      const items = await os.fs.list(dirPath)
      const sorted = [...items].sort((a, b) => {
        if (a.kind === 'folder' && b.kind !== 'folder') return -1
        if (a.kind !== 'folder' && b.kind === 'folder') return 1
        return a.name.localeCompare(b.name)
      })

      const result: string[] = []
      for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i]
        const isLast = i === sorted.length - 1
        const pointer = isLast ? '└── ' : '├── '
        result.push(`${prefix}${pointer}${item.name}${item.kind === 'folder' ? '/' : ''}`)

        if (item.kind === 'folder') {
          const nextPrefix = prefix + (isLast ? '    ' : '│   ')
          const subPath = dirPath === '/' ? `/${item.name}` : `${dirPath}/${item.name}`
          const subTree = await generateTree(subPath, nextPrefix, depth + 1)
          result.push(...subTree)
        }
      }
      return result
    } catch {
      return []
    }
  }

  // Command Execution Handler
  const executeCommand = async (commandLine: string) => {
    const raw = commandLine.trim()
    if (!raw) return

    // Add to history
    setHistory((prev) => [...prev, raw])
    setHistoryIndex(-1)

    // Add prompt line to output
    const promptEntry: OutputLine = {
      id: `prompt-${Date.now()}-${Math.random()}`,
      type: 'prompt',
      text: raw,
      cwdDisplay: displayCwd
    }

    // Check for output redirection (> or >>)
    let commandStr = raw
    let redirectMode: '>' | '>>' | null = null
    let redirectTarget: string | null = null

    const redirectAppendIdx = raw.indexOf('>>')
    if (redirectAppendIdx !== -1) {
      redirectMode = '>>'
      commandStr = raw.slice(0, redirectAppendIdx).trim()
      redirectTarget = raw.slice(redirectAppendIdx + 2).trim()
    } else {
      const redirectOverwriteIdx = raw.indexOf('>')
      if (redirectOverwriteIdx !== -1) {
        redirectMode = '>'
        commandStr = raw.slice(0, redirectOverwriteIdx).trim()
        redirectTarget = raw.slice(redirectOverwriteIdx + 1).trim()
      }
    }

    // Parse tokens (respecting quotes)
    const tokens: string[] = []
    let currentToken = ''
    let inQuote: '"' | "'" | null = null

    for (let i = 0; i < commandStr.length; i++) {
      const ch = commandStr[i]
      if (ch === '"' || ch === "'") {
        if (inQuote === ch) {
          inQuote = null
        } else if (!inQuote) {
          inQuote = ch
        } else {
          currentToken += ch
        }
      } else if (/\s/.test(ch) && !inQuote) {
        if (currentToken.length > 0) {
          tokens.push(currentToken)
          currentToken = ''
        }
      } else {
        currentToken += ch
      }
    }
    if (currentToken.length > 0) {
      tokens.push(currentToken)
    }

    if (tokens.length === 0) {
      setLines((prev) => [...prev, promptEntry])
      return
    }

    const [cmd, ...args] = tokens
    const commandLower = cmd.toLowerCase()

    let outputText = ''
    let outputType: OutputLine['type'] = 'output'

    try {
      switch (commandLower) {
        case 'help': {
          outputText =
            `Comandos disponibles:\n` +
            `  help                  Muestra esta ayuda de comandos\n` +
            `  ls, dir [-l] [ruta]   Lista los archivos y directorios\n` +
            `  cd [ruta]             Cambia el directorio de trabajo\n` +
            `  pwd                   Muestra la ruta del directorio actual\n` +
            `  mkdir, md [-p] <dir>  Crea un nuevo directorio\n` +
            `  touch <archivo>       Crea un archivo vacío o actualiza su fecha\n` +
            `  cat, type <archivo>   Muestra el contenido de un archivo de texto\n` +
            `  echo <texto> [>/>> f] Muestra un texto o lo redirige a un archivo\n` +
            `  rm, del [-r] <ruta>   Mueve un archivo o carpeta a la papelera\n` +
            `  mv, move <orig> <des> Mueve un archivo o directorio\n` +
            `  cp, copy [-r] <o> <d> Copia un archivo o directorio\n` +
            `  tree [ruta]           Muestra el árbol de carpetas de forma gráfica\n` +
            `  open, start <archivo> Abre un archivo con su aplicación predeterminada\n` +
            `  date                  Muestra la fecha y hora actual del sistema\n` +
            `  whoami                Muestra el nombre del usuario actual\n` +
            `  clear, cls            Limpia la pantalla de la terminal\n` +
            `  history               Muestra el historial de comandos ejecutados`
          break
        }

        case 'clear':
        case 'cls': {
          setLines([])
          setInput('')
          return
        }

        case 'pwd': {
          outputText = displayCwd
          break
        }

        case 'whoami': {
          const parts = homeDir.split('/').filter(Boolean)
          const username = parts.length > 0 ? parts[parts.length - 1] : 'Usuario'
          outputText = `hebi\\${username}`
          break
        }

        case 'date': {
          outputText = new Date().toLocaleString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
          break
        }

        case 'history': {
          outputText = history.map((h, idx) => `  ${(idx + 1).toString().padStart(4, ' ')}  ${h}`).join('\n')
          break
        }

        case 'cd': {
          const targetArg = args[0]
          const target = resolvePath(targetArg || '~')

          try {
            const stat = await os.fs.stat(target)
            if (stat.kind !== 'folder') {
              outputText = `cd: No se puede cambiar al directorio '${targetArg}'. No es un directorio.`
              outputType = 'error'
            } else {
              setCwd(target)
            }
          } catch {
            outputText = `cd: No se encuentra la ruta '${targetArg}' porque no existe.`
            outputType = 'error'
          }
          break
        }

        case 'ls':
        case 'dir': {
          const isDetailed = args.includes('-l')
          const pathArg = args.find((a) => !a.startsWith('-'))
          const target = resolvePath(pathArg)

          try {
            const items = await os.fs.list(target)
            const sorted = [...items].sort((a, b) => {
              if (a.kind === 'folder' && b.kind !== 'folder') return -1
              if (a.kind !== 'folder' && b.kind === 'folder') return 1
              return a.name.localeCompare(b.name)
            })

            if (isDetailed) {
              const header =
                `    Directorio: ${os.fs.toDisplayPath(target)}\n\n` +
                `Modo          Fecha de modificación       Tamaño Nombre\n` +
                `----          ---------------------       ------ ------`

              const rows = sorted.map((item: FsNode) => {
                const mode = item.kind === 'folder' ? 'd----' : '-a---'
                const dateStr = new Date(item.modifiedAt).toLocaleString('es-ES', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })
                const sizeStr = item.kind === 'folder' ? '' : item.size.toString().padStart(10, ' ')
                return `${mode.padEnd(14, ' ')}${dateStr.padEnd(28, ' ')}${sizeStr.padEnd(7, ' ')}${item.name}`
              })

              outputText = [header, ...rows].join('\n')
            } else {
              if (sorted.length === 0) {
                outputText = ''
              } else {
                outputText = sorted
                  .map((item) => (item.kind === 'folder' ? `[${item.name}]` : item.name))
                  .join('    ')
              }
            }
          } catch (err: unknown) {
            outputText = `ls: No se puede acceder a '${pathArg || '.'}': ${(err as Error).message}`
            outputType = 'error'
          }
          break
        }

        case 'mkdir':
        case 'md': {
          const recursive = args.includes('-p')
          const dirArg = args.find((a) => !a.startsWith('-'))
          if (!dirArg) {
            outputText = 'mkdir: Falta el nombre del directorio a crear.'
            outputType = 'error'
          } else {
            const target = resolvePath(dirArg)
            await os.fs.mkdir(target, { recursive })
          }
          break
        }

        case 'touch': {
          const fileArg = args[0]
          if (!fileArg) {
            outputText = 'touch: Falta el nombre del archivo.'
            outputType = 'error'
          } else {
            const target = resolvePath(fileArg)
            const exists = await os.fs.exists(target)
            if (exists) {
              const currentContent = await os.fs.readText(target)
              await os.fs.writeFile(target, currentContent, { overwrite: true })
            } else {
              await os.fs.writeFile(target, '', { overwrite: false })
            }
          }
          break
        }

        case 'cat':
        case 'type': {
          const fileArg = args[0]
          if (!fileArg) {
            outputText = 'cat: Falta el nombre del archivo.'
            outputType = 'error'
          } else {
            const target = resolvePath(fileArg)
            outputText = await os.fs.readText(target)
          }
          break
        }

        case 'echo': {
          outputText = args.join(' ')
          break
        }

        case 'rm':
        case 'del': {
          const recursive = args.includes('-r') || args.includes('-rf') || args.includes('/s')
          const targetArg = args.find((a) => !a.startsWith('-') && !a.startsWith('/'))
          if (!targetArg) {
            outputText = 'rm: Falta el archivo o directorio a eliminar.'
            outputType = 'error'
          } else {
            const target = resolvePath(targetArg)
            const stat = await os.fs.stat(target)
            if (stat.kind === 'folder' && !recursive) {
              outputText = `rm: No se puede borrar el directorio '${targetArg}' sin la opción -r.`
              outputType = 'error'
            } else {
              await os.fs.trash(target)
            }
          }
          break
        }

        case 'mv':
        case 'move': {
          if (args.length < 2) {
            outputText = 'mv: Se requieren dos argumentos: origen y destino.'
            outputType = 'error'
          } else {
            const src = resolvePath(args[0])
            const dest = resolvePath(args[1])
            await os.fs.move(src, dest)
          }
          break
        }

        case 'cp':
        case 'copy': {
          const filteredArgs = args.filter((a) => !a.startsWith('-'))
          if (filteredArgs.length < 2) {
            outputText = 'cp: Se requieren dos argumentos: origen y destino.'
            outputType = 'error'
          } else {
            const src = resolvePath(filteredArgs[0])
            const dest = resolvePath(filteredArgs[1])
            await os.fs.copy(src, dest)
          }
          break
        }

        case 'tree': {
          const targetArg = args[0]
          const target = resolvePath(targetArg)
          const treeLines = await generateTree(target)
          outputText = [os.fs.toDisplayPath(target), ...treeLines].join('\n')
          break
        }

        case 'open':
        case 'start': {
          const targetArg = args[0]
          if (!targetArg) {
            outputText = 'open: Especifica un archivo para abrir.'
            outputType = 'error'
          } else {
            const target = resolvePath(targetArg)
            os.apps.openFile(target)
          }
          break
        }

        default: {
          outputText = `'${cmd}' no se reconoce como un comando interno o externo, programa o archivo por lotes ejecutable.`
          outputType = 'error'
          break
        }
      }
    } catch (err: unknown) {
      outputText = `Error: ${(err as Error).message || 'Operación no válida'}`
      outputType = 'error'
    }

    // Handle Redirection if output produced without fatal error
    if (redirectMode && redirectTarget && outputType !== 'error') {
      try {
        const destPath = resolvePath(redirectTarget)
        if (redirectMode === '>>') {
          let existing = ''
          try {
            existing = await os.fs.readText(destPath)
          } catch {
            existing = ''
          }
          const combined = existing ? `${existing}\n${outputText}` : outputText
          await os.fs.writeFile(destPath, combined, { overwrite: true })
        } else {
          await os.fs.writeFile(destPath, outputText, { overwrite: true })
        }
        outputText = '' // Silenced output because redirected
      } catch (err: unknown) {
        outputText = `Error de redirección: ${(err as Error).message}`
        outputType = 'error'
      }
    }

    const nextLines: OutputLine[] = [promptEntry]
    if (outputText !== '') {
      nextLines.push({
        id: `output-${Date.now()}-${Math.random()}`,
        type: outputType,
        text: outputText
      })
    }

    setLines((prev) => [...prev, ...nextLines])
    setInput('')
  }

  // Key Down Handler (Enter, Arrow Up/Down, Tab, Ctrl+C, Ctrl+L)
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      await executeCommand(input)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length === 0) return
      const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1)
      setHistoryIndex(nextIdx)
      setInput(history[nextIdx] || '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex === -1) return
      const nextIdx = historyIndex + 1
      if (nextIdx >= history.length) {
        setHistoryIndex(-1)
        setInput('')
      } else {
        setHistoryIndex(nextIdx)
        setInput(history[nextIdx] || '')
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      // Autocompletion
      const words = input.split(' ')
      const lastWord = words[words.length - 1]

      if (words.length === 1) {
        // Autocomplete command name
        const availableCommands = [
          'help',
          'ls',
          'dir',
          'cd',
          'pwd',
          'mkdir',
          'md',
          'touch',
          'cat',
          'type',
          'echo',
          'rm',
          'del',
          'mv',
          'move',
          'cp',
          'copy',
          'tree',
          'open',
          'start',
          'date',
          'whoami',
          'clear',
          'cls',
          'history'
        ]
        const match = availableCommands.find((c) => c.startsWith(lastWord.toLowerCase()))
        if (match) {
          setInput(match + ' ')
        }
      } else {
        // Autocomplete file/folder in current directory
        try {
          const items = await os.fs.list(cwd)
          const match = items.find((item) =>
            item.name.toLowerCase().startsWith(lastWord.toLowerCase())
          )
          if (match) {
            words[words.length - 1] = match.kind === 'folder' ? `${match.name}/` : match.name
            setInput(words.join(' '))
          }
        } catch {
          // ignore
        }
      }
    } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault()
      setLines((prev) => [
        ...prev,
        {
          id: `cancel-${Date.now()}`,
          type: 'prompt',
          text: input + '^C',
          cwdDisplay: displayCwd
        }
      ])
      setInput('')
    } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault()
      setLines([])
    }
  }

  return (
    <div
      onClick={handleTerminalClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#0c0c0e',
        color: '#cccccc',
        fontFamily: "'Cascadia Code', 'Consolas', 'Courier New', monospace",
        fontSize: '13px',
        lineHeight: '1.5',
        padding: '12px 16px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        userSelect: 'text',
        cursor: 'text'
      }}
    >
      {/* Output History */}
      {lines.map((line) => {
        if (line.type === 'prompt') {
          return (
            <div key={line.id} style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '2px' }}>
              <span style={{ color: '#00ffff', fontWeight: 600 }}>PS&nbsp;</span>
              <span style={{ color: '#e5e5e5', fontWeight: 500 }}>{line.cwdDisplay}&gt;&nbsp;</span>
              <span style={{ color: '#ffffff' }}>{line.text}</span>
            </div>
          )
        }

        let textColor = '#cccccc'
        if (line.type === 'error') textColor = '#f87171'
        if (line.type === 'info') textColor = '#94a3b8'
        if (line.type === 'success') textColor = '#4ade80'

        return (
          <div
            key={line.id}
            style={{
              color: textColor,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              marginBottom: '6px'
            }}
          >
            {line.text}
          </div>
        )
      })}

      {/* Current Active Input Prompt Line */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <span style={{ color: '#00ffff', fontWeight: 600, flexShrink: 0 }}>PS&nbsp;</span>
        <span style={{ color: '#e5e5e5', fontWeight: 500, flexShrink: 0 }}>{displayCwd}&gt;&nbsp;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
            padding: 0,
            margin: 0
          }}
        />
      </div>

      <div ref={terminalEndRef} />
    </div>
  )
}
