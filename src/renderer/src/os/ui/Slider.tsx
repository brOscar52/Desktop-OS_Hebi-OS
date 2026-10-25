import React from 'react'

export interface SliderProps {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  disabled?: boolean
  label?: string
  showValue?: boolean
  style?: React.CSSProperties
  className?: string
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled = false,
  label,
  showValue = false,
  style,
  className
}) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: '100%',
        ...style
      }}
      className={className}
    >
      {(label || showValue) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)' }}>
          {label && <span style={{ color: 'var(--text-secondary)' }}>{label}</span>}
          {showValue && <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-weight-medium)' }}>{value}</span>}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          accentColor: 'var(--accent-color)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          height: '4px',
          borderRadius: 'var(--radius-full)',
          background: `linear-gradient(to right, var(--accent-color) ${percentage}%, var(--border-strong) ${percentage}%)`
        }}
      />
    </div>
  )
}
