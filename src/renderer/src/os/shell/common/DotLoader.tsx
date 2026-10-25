import React from 'react'

export interface DotLoaderProps {
  size?: number
  color?: string
}

export const DotLoader: React.FC<DotLoaderProps> = ({
  size = 40,
  color = 'var(--accent-color)'
}) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        height: `${size}px`
      }}
    >
      <style>{`
        @keyframes fluentPulse {
          0%, 100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.15);
            opacity: 1;
          }
        }
      `}</style>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          style={{
            width: `${Math.round(size * 0.16)}px`,
            height: `${Math.round(size * 0.16)}px`,
            borderRadius: '50%',
            backgroundColor: color,
            animation: `fluentPulse 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.18}s`
          }}
        />
      ))}
    </div>
  )
}
