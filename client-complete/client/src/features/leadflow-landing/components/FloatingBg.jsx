import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'

const SHAPES = [
  // --- gradient blobs / rects ---
  {
    key: 'rect-vio',
    style: {
      top: '6%', left: '3%', width: 96, height: 64,
      background: 'linear-gradient(135deg, rgba(124,58,237,0.22) 0%, rgba(217,70,239,0.14) 100%)',
      borderRadius: 18,
      animation: 'lf-float-a 13s ease-in-out infinite',
    },
  },
  {
    key: 'rect-fuch',
    style: {
      top: '12%', right: '4%', width: 72, height: 48,
      background: 'linear-gradient(120deg, rgba(217,70,239,0.18) 0%, rgba(124,58,237,0.10) 100%)',
      borderRadius: 14,
      animation: 'lf-float-b 10s ease-in-out infinite',
      animationDelay: '1.4s',
    },
  },
  {
    key: 'rect-emerald',
    style: {
      bottom: '18%', left: '5%', width: 80, height: 52,
      background: 'linear-gradient(140deg, rgba(16,185,129,0.14) 0%, rgba(6,182,212,0.10) 100%)',
      borderRadius: 16,
      animation: 'lf-float-c 11s ease-in-out infinite',
      animationDelay: '2.2s',
    },
  },
  {
    key: 'rect-sky',
    style: {
      bottom: '22%', right: '6%', width: 60, height: 40,
      background: 'linear-gradient(110deg, rgba(14,165,233,0.16) 0%, rgba(59,130,246,0.10) 100%)',
      borderRadius: 12,
      animation: 'lf-float-d 9s ease-in-out infinite',
      animationDelay: '0.8s',
    },
  },
  // tall thin bar
  {
    key: 'bar-vio',
    style: {
      top: '38%', left: '1.5%', width: 10, height: 90,
      background: 'linear-gradient(180deg, rgba(124,58,237,0.25) 0%, rgba(217,70,239,0.06) 100%)',
      borderRadius: 99,
      animation: 'lf-float-b 14s ease-in-out infinite',
      animationDelay: '3.1s',
    },
  },
  {
    key: 'bar-em',
    style: {
      top: '45%', right: '1.8%', width: 10, height: 70,
      background: 'linear-gradient(180deg, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.04) 100%)',
      borderRadius: 99,
      animation: 'lf-float-c 12s ease-in-out infinite',
      animationDelay: '1.7s',
    },
  },
  // --- rings ---
  {
    key: 'ring-vio',
    style: {
      top: '28%', left: '8%', width: 56, height: 56,
      borderRadius: '50%',
      border: '2px solid rgba(124,58,237,0.2)',
      animation: 'lf-float-a 16s ease-in-out infinite',
      animationDelay: '0.5s',
    },
  },
  {
    key: 'ring-fuch',
    style: {
      top: '32%', right: '9%', width: 44, height: 44,
      borderRadius: '50%',
      border: '2px solid rgba(217,70,239,0.18)',
      animation: 'lf-float-d 11s ease-in-out infinite',
      animationDelay: '2.6s',
    },
  },
  {
    key: 'ring-sky',
    style: {
      bottom: '30%', left: '11%', width: 34, height: 34,
      borderRadius: '50%',
      border: '1.5px solid rgba(14,165,233,0.2)',
      animation: 'lf-float-b 8.5s ease-in-out infinite',
      animationDelay: '1.1s',
    },
  },
  {
    key: 'ring-em',
    style: {
      bottom: '28%', right: '12%', width: 48, height: 48,
      borderRadius: '50%',
      border: '2px solid rgba(16,185,129,0.16)',
      animation: 'lf-float-c 13.5s ease-in-out infinite',
      animationDelay: '4s',
    },
  },
  // --- dot clusters ---
  {
    key: 'dots-a',
    style: {
      top: '22%', left: '18%', width: 38, height: 38,
      background: 'radial-gradient(circle, rgba(124,58,237,0.22) 2px, transparent 2px)',
      backgroundSize: '8px 8px',
      animation: 'lf-float-c 9s ease-in-out infinite',
      animationDelay: '2s',
    },
  },
  {
    key: 'dots-b',
    style: {
      bottom: '14%', right: '20%', width: 32, height: 32,
      background: 'radial-gradient(circle, rgba(217,70,239,0.20) 2px, transparent 2px)',
      backgroundSize: '8px 8px',
      animation: 'lf-float-a 11s ease-in-out infinite',
      animationDelay: '3.6s',
    },
  },
]

// Mini dashboard stat card
const MINI_CARDS = [
  {
    key: 'card-a',
    color: 'rgba(124,58,237,1)',
    label: 'Leads',
    val: '1,248',
    change: '+18%',
    posStyle: { top: '52%', left: '2.5%', animation: 'lf-float-d 17s ease-in-out infinite', animationDelay: '0.3s' },
  },
  {
    key: 'card-b',
    color: 'rgba(16,185,129,1)',
    label: 'Revenue',
    val: '$84k',
    change: '+32%',
    posStyle: { top: '60%', right: '2.5%', animation: 'lf-float-a 15s ease-in-out infinite', animationDelay: '2.8s' },
  },
]

function MiniCard({ color, label, val, change, posStyle }) {
  return (
    <div
      className="pointer-events-none absolute hidden xl:block"
      style={{
        ...posStyle,
        width: 100,
        zIndex: 0,
      }}
    >
      <div
        style={{
          borderRadius: 10,
          background: '#fff',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ height: 4, background: color }} />
        <div style={{ padding: '8px 10px' }}>
          <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0a0714', lineHeight: 1 }}>{val}</p>
          <p style={{ fontSize: 9, color: '#10b981', fontWeight: 600, marginTop: 3 }}>{change} this month</p>
          {/* Mini bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18, marginTop: 6 }}>
            {[0.4, 0.55, 0.35, 0.7, 0.5, 0.85, 0.65].map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h * 100}%`,
                  borderRadius: 2,
                  background: color,
                  opacity: 0.25 + h * 0.55,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function FloatingBg({ className = '' }) {
  const reduced = usePrefersReducedMotion()

  if (reduced) return null

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}
    >
      {SHAPES.map(({ key, style }) => (
        <div key={key} className="absolute" style={style} />
      ))}
      {MINI_CARDS.map(({ key, color, label, val, change, posStyle }) => (
        <MiniCard key={key} color={color} label={label} val={val} change={change} posStyle={posStyle} />
      ))}
    </div>
  )
}
