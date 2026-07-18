import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'

const SHAPES = [
  {
    key: 'blob-a',
    style: {
      top: '8%',
      left: '4%',
      width: 120,
      height: 80,
      background: 'linear-gradient(135deg, rgba(71,85,105,0.12) 0%, rgba(124,58,237,0.10) 100%)',
      borderRadius: 24,
      animation: 'lf-float-a 14s ease-in-out infinite',
    },
  },
  {
    key: 'blob-b',
    style: {
      top: '15%',
      right: '6%',
      width: 88,
      height: 56,
      background: 'linear-gradient(120deg, rgba(124,58,237,0.14) 0%, rgba(99,102,241,0.08) 100%)',
      borderRadius: 18,
      animation: 'lf-float-b 11s ease-in-out infinite',
      animationDelay: '1.2s',
    },
  },
  {
    key: 'blob-c',
    style: {
      bottom: '12%',
      left: '8%',
      width: 96,
      height: 64,
      background: 'linear-gradient(140deg, rgba(16,185,129,0.10) 0%, rgba(59,130,246,0.08) 100%)',
      borderRadius: 20,
      animation: 'lf-float-c 12s ease-in-out infinite',
      animationDelay: '2s',
    },
  },
  {
    key: 'ring-a',
    style: {
      bottom: '20%',
      right: '10%',
      width: 52,
      height: 52,
      borderRadius: '50%',
      border: '2px solid rgba(124,58,237,0.14)',
      animation: 'lf-float-d 10s ease-in-out infinite',
      animationDelay: '0.6s',
    },
  },
  {
    key: 'bar-a',
    style: {
      top: '42%',
      right: '3%',
      width: 8,
      height: 72,
      background: 'linear-gradient(180deg, rgba(71,85,105,0.18) 0%, transparent 100%)',
      borderRadius: 99,
      animation: 'lf-float-b 13s ease-in-out infinite',
      animationDelay: '2.4s',
    },
  },
]

export function OnboardingFloatingBg({ className = '' }) {
  const reduced = usePrefersReducedMotion()
  if (reduced) return null

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}>
      {SHAPES.map(({ key, style }) => (
        <div key={key} className="absolute opacity-80" style={style} />
      ))}
    </div>
  )
}
