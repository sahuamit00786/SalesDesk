import { useMemo } from 'react'
import { cn } from '@/utils/cn'

const LIGHT = ['bg-violet-500/55', 'bg-fuchsia-500/45', 'bg-cyan-400/50', 'bg-indigo-500/45', 'bg-amber-400/45']
const DARK = ['bg-fuchsia-400/35', 'bg-cyan-300/30', 'bg-violet-300/35', 'bg-white/25']

/** @param {{ count?: number, tone?: 'light' | 'dark' }} props */
export function ParticleField({ count = 32, tone = 'light' }) {
  const palette = tone === 'dark' ? DARK : LIGHT
  const dots = useMemo(() => {
    const n = Math.max(0, count)
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      left: `${(i * 17) % 100}%`,
      top: `${(i * 23) % 100}%`,
      delay: `${(i % 8) * 0.35}s`,
      size: 2 + (i % 4),
      color: palette[i % palette.length],
    }))
  }, [count, palette])

  if (!dots.length) return null

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', tone === 'dark' ? 'opacity-70' : 'opacity-50')}
      aria-hidden
    >
      {dots.map((d) => (
        <span
          key={d.id}
          className={cn('absolute rounded-full animate-lf-float shadow-sm', d.color)}
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            animationDelay: d.delay,
            boxShadow: tone === 'dark' ? '0 0 12px rgba(244,114,182,0.35)' : '0 0 10px rgba(167,139,250,0.4)',
          }}
        />
      ))}
    </div>
  )
}
