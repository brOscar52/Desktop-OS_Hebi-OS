import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useOS } from '@os/sdk'

interface HistoryEntry {
  id: string
  expression: string
  result: string
}

type Operator = '+' | '-' | '×' | '÷' | null

export default function CalculatorApp(): JSX.Element {
  const os = useOS()

  // Display states
  const [display, setDisplay] = useState<string>('0')
  const [expression, setExpression] = useState<string>('')
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [pendingOperator, setPendingOperator] = useState<Operator>(null)
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false)
  const [isError, setIsError] = useState<boolean>(false)

  // History panel
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false)

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    os.window.setTitle('Calculadora')
  }, [os.window])

  // Focus container on mount and click
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  const formatNumber = (num: number): string => {
    if (!isFinite(num) || isNaN(num)) return 'Error'
    // Avoid precision issues like 0.1 + 0.2 = 0.30000000000000004
    const formatted = parseFloat(num.toPrecision(12)).toString()
    return formatted
  }

  const handleDigit = (digit: string) => {
    if (isError) {
      handleClearAll()
    }

    if (waitingForOperand) {
      setDisplay(digit)
      setWaitingForOperand(false)
    } else {
      if (display === '0') {
        setDisplay(digit)
      } else {
        if (display.length < 16) {
          setDisplay(display + digit)
        }
      }
    }
  }

  const handleDecimal = () => {
    if (isError) {
      handleClearAll()
      setDisplay('0.')
      setWaitingForOperand(false)
      return
    }

    if (waitingForOperand) {
      setDisplay('0.')
      setWaitingForOperand(false)
    } else if (!display.includes('.')) {
      setDisplay(display + '.')
    }
  }

  const handleBackspace = () => {
    if (isError || waitingForOperand) return
    if (display.length > 1) {
      const next = display.slice(0, -1)
      setDisplay(next === '-' ? '0' : next)
    } else {
      setDisplay('0')
    }
  }

  const handleClearEntry = () => {
    if (isError) {
      handleClearAll()
    } else {
      setDisplay('0')
    }
  }

  const handleClearAll = () => {
    setDisplay('0')
    setExpression('')
    setPreviousValue(null)
    setPendingOperator(null)
    setWaitingForOperand(false)
    setIsError(false)
  }

  const calculate = (prev: number, current: number, op: Operator): number | 'DIV_ZERO' => {
    switch (op) {
      case '+':
        return prev + current
      case '-':
        return prev - current
      case '×':
        return prev * current
      case '÷':
        if (current === 0) return 'DIV_ZERO'
        return prev / current
      default:
        return current
    }
  }

  const handleOperator = (nextOp: Operator) => {
    if (isError) return

    const currentVal = parseFloat(display)

    if (previousValue === null) {
      setPreviousValue(currentVal)
      setExpression(`${formatNumber(currentVal)} ${nextOp}`)
    } else if (pendingOperator && !waitingForOperand) {
      const res = calculate(previousValue, currentVal, pendingOperator)
      if (res === 'DIV_ZERO') {
        setDisplay('No se puede dividir entre cero')
        setIsError(true)
        setPreviousValue(null)
        setPendingOperator(null)
        return
      }
      const formatted = formatNumber(res)
      setDisplay(formatted)
      setPreviousValue(res)
      setExpression(`${formatted} ${nextOp}`)
    } else {
      setExpression(`${formatNumber(previousValue)} ${nextOp}`)
    }

    setPendingOperator(nextOp)
    setWaitingForOperand(true)
  }

  const handleEquals = () => {
    if (isError || previousValue === null || !pendingOperator) return

    const currentVal = parseFloat(display)
    const res = calculate(previousValue, currentVal, pendingOperator)

    if (res === 'DIV_ZERO') {
      setDisplay('No se puede dividir entre cero')
      setIsError(true)
      setPreviousValue(null)
      setPendingOperator(null)
      return
    }

    const formattedRes = formatNumber(res)
    const exprString = `${formatNumber(previousValue)} ${pendingOperator} ${formatNumber(currentVal)} =`

    setExpression(exprString)
    setDisplay(formattedRes)

    // Add to session history
    setHistory((prev) => [
      {
        id: `calc-${Date.now()}-${Math.random()}`,
        expression: exprString,
        result: formattedRes
      },
      ...prev
    ])

    setPreviousValue(null)
    setPendingOperator(null)
    setWaitingForOperand(true)
  }

  // Unary functions
  const handleNegate = () => {
    if (isError) return
    const currentVal = parseFloat(display)
    if (currentVal === 0) return
    setDisplay(formatNumber(-currentVal))
  }

  const handlePercent = () => {
    if (isError) return
    const currentVal = parseFloat(display)
    if (previousValue !== null && pendingOperator) {
      const pct = (previousValue * currentVal) / 100
      setDisplay(formatNumber(pct))
    } else {
      setDisplay(formatNumber(currentVal / 100))
    }
  }

  const handleSquare = () => {
    if (isError) return
    const currentVal = parseFloat(display)
    const res = currentVal * currentVal
    setDisplay(formatNumber(res))
    setExpression(`sqr(${formatNumber(currentVal)})`)
    setWaitingForOperand(true)
  }

  const handleSqrt = () => {
    if (isError) return
    const currentVal = parseFloat(display)
    if (currentVal < 0) {
      setDisplay('Entrada no válida')
      setIsError(true)
      return
    }
    const res = Math.sqrt(currentVal)
    setDisplay(formatNumber(res))
    setExpression(`√(${formatNumber(currentVal)})`)
    setWaitingForOperand(true)
  }

  const handleReciprocal = () => {
    if (isError) return
    const currentVal = parseFloat(display)
    if (currentVal === 0) {
      setDisplay('No se puede dividir entre cero')
      setIsError(true)
      return
    }
    const res = 1 / currentVal
    setDisplay(formatNumber(res))
    setExpression(`1/(${formatNumber(currentVal)})`)
    setWaitingForOperand(true)
  }

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault()
        handleDigit(e.key)
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault()
        handleDecimal()
      } else if (e.key === '+') {
        e.preventDefault()
        handleOperator('+')
      } else if (e.key === '-') {
        e.preventDefault()
        handleOperator('-')
      } else if (e.key === '*' || e.key === 'x' || e.key === 'X') {
        e.preventDefault()
        handleOperator('×')
      } else if (e.key === '/') {
        e.preventDefault()
        handleOperator('÷')
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault()
        handleEquals()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        handleBackspace()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleClearAll()
      } else if (e.key === '%') {
        e.preventDefault()
        handlePercent()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [display, previousValue, pendingOperator, waitingForOperand, isError]
  )

  const buttonStyle: React.CSSProperties = {
    flex: 1,
    height: '42px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontSize: 'var(--font-size-md)',
    fontFamily: 'var(--font-family-base)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    transition: 'background-color var(--duration-fast) ease'
  }

  const opButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: 'var(--bg-subtle)',
    color: 'var(--accent-color)',
    fontWeight: 'var(--font-weight-semibold)'
  }

  const equalsButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: 'var(--accent-color)',
    color: 'var(--accent-text)',
    fontWeight: 'var(--font-weight-bold)'
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => containerRef.current?.focus()}
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-window)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-family-base)',
        outline: 'none',
        overflow: 'hidden'
      }}
    >
      {/* Main Calculator Body */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: '12px',
          boxSizing: 'border-box',
          minWidth: '280px'
        }}
      >
        {/* Top Header with History Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--text-secondary)'
            }}
          >
            Estándar
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsHistoryOpen(!isHistoryOpen)
            }}
            title={isHistoryOpen ? 'Ocultar historial' : 'Mostrar historial'}
            style={{
              border: 'none',
              background: isHistoryOpen ? 'var(--bg-active)' : 'transparent',
              color: isHistoryOpen ? 'var(--accent-color)' : 'var(--text-secondary)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-xs)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>🕒</span>
            <span>Historial</span>
          </button>
        </div>

        {/* Display Screen */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
            padding: '10px 12px',
            minHeight: '70px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '12px'
          }}
        >
          {/* Micro Expression */}
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-tertiary)',
              minHeight: '16px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {expression}
          </div>

          {/* Current Display Number */}
          <div
            style={{
              fontSize: display.length > 11 ? '22px' : '32px',
              fontWeight: 'var(--font-weight-semibold)',
              color: isError ? '#ef4444' : 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%'
            }}
          >
            {display}
          </div>
        </div>

        {/* Keypad Grid (6 rows x 4 cols) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flex: 1
          }}
        >
          {/* Row 1: %, CE, C, ⌫ */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button style={opButtonStyle} onClick={handlePercent} title="Porcentaje">
              %
            </button>
            <button style={opButtonStyle} onClick={handleClearEntry} title="Borrar entrada">
              CE
            </button>
            <button style={opButtonStyle} onClick={handleClearAll} title="Borrar todo">
              C
            </button>
            <button style={opButtonStyle} onClick={handleBackspace} title="Retroceso">
              ⌫
            </button>
          </div>

          {/* Row 2: 1/x, x², √x, ÷ */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button style={opButtonStyle} onClick={handleReciprocal} title="Inverso">
              1/x
            </button>
            <button style={opButtonStyle} onClick={handleSquare} title="Cuadrado">
              x²
            </button>
            <button style={opButtonStyle} onClick={handleSqrt} title="Raíz cuadrada">
              √x
            </button>
            <button style={opButtonStyle} onClick={() => handleOperator('÷')} title="Dividir">
              ÷
            </button>
          </div>

          {/* Row 3: 7, 8, 9, × */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button style={buttonStyle} onClick={() => handleDigit('7')}>
              7
            </button>
            <button style={buttonStyle} onClick={() => handleDigit('8')}>
              8
            </button>
            <button style={buttonStyle} onClick={() => handleDigit('9')}>
              9
            </button>
            <button style={opButtonStyle} onClick={() => handleOperator('×')} title="Multiplicar">
              ×
            </button>
          </div>

          {/* Row 4: 4, 5, 6, - */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button style={buttonStyle} onClick={() => handleDigit('4')}>
              4
            </button>
            <button style={buttonStyle} onClick={() => handleDigit('5')}>
              5
            </button>
            <button style={buttonStyle} onClick={() => handleDigit('6')}>
              6
            </button>
            <button style={opButtonStyle} onClick={() => handleOperator('-')} title="Restar">
              -
            </button>
          </div>

          {/* Row 5: 1, 2, 3, + */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button style={buttonStyle} onClick={() => handleDigit('1')}>
              1
            </button>
            <button style={buttonStyle} onClick={() => handleDigit('2')}>
              2
            </button>
            <button style={buttonStyle} onClick={() => handleDigit('3')}>
              3
            </button>
            <button style={opButtonStyle} onClick={() => handleOperator('+')} title="Sumar">
              +
            </button>
          </div>

          {/* Row 6: +/-, 0, ., = */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button style={buttonStyle} onClick={handleNegate} title="Cambio de signo">
              +/-
            </button>
            <button style={buttonStyle} onClick={() => handleDigit('0')}>
              0
            </button>
            <button style={buttonStyle} onClick={handleDecimal} title="Coma decimal">
              .
            </button>
            <button style={equalsButtonStyle} onClick={handleEquals} title="Igual">
              =
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible History Drawer */}
      {isHistoryOpen && (
        <div
          style={{
            width: '180px',
            backgroundColor: 'var(--bg-subtle)',
            borderLeft: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            padding: '10px',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
              paddingBottom: '6px',
              borderBottom: '1px solid var(--border-subtle)'
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-secondary)'
              }}
            >
              Historial
            </span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setHistory([])}
                title="Borrar historial"
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)',
                  fontSize: '12px'
                }}
              >
                🗑️
              </button>
            )}
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            {history.length === 0 ? (
              <div
                style={{
                  padding: '24px 0',
                  textAlign: 'center',
                  fontSize: '11px',
                  color: 'var(--text-tertiary)'
                }}
              >
                Aún no hay historial
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setDisplay(item.result)
                    setWaitingForOperand(true)
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer'
                  }}
                  title="Recuperar resultado"
                >
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                    {item.expression}
                  </span>
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--accent-color)'
                    }}
                  >
                    {item.result}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
