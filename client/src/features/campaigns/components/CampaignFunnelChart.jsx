import { useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

/** Horizontal funnel ribbon + stage headers, with stage-to-stage drop-off %. */
export function CampaignFunnelChart({ stages, activeStageKey, onStageClick, title, subtitle }) {
  const data = useMemo(() => {
    if (!stages?.length) return []
    const counts = stages.map((s) => Number(s.count) || 0)
    const base = counts[0] > 0 ? counts[0] : 1
    return stages.map((s, i) => ({
      key: s.key,
      label: s.label,
      count: counts[i],
      pct: Math.min(100, Math.round((counts[i] / base) * 100)),
      dropPct: i === 0 ? null : (counts[i - 1] > 0 ? Math.round((counts[i] / counts[i - 1]) * 100) : 0),
    }))
  }, [stages])

  const vbW = 1000
  const vbH = 128
  const cy = 82
  const maxHalf = 38

  const polyPoints = useMemo(() => {
    const m = data.length
    if (m === 0) return ''
    const counts = data.map((d) => d.count)
    const maxC = Math.max(...counts, 1)
    const hs = counts.map((c) => Math.max((c / maxC) * maxHalf, m === 1 ? maxHalf * 0.42 : 7))
    const tops = []
    for (let i = 0; i <= m; i += 1) {
      const x = (i / m) * vbW
      const h = i < m ? hs[i] : hs[m - 1]
      tops.push(`${x},${cy - h}`)
    }
    const bots = []
    for (let i = m; i >= 0; i -= 1) {
      const x = (i / m) * vbW
      const h = i < m ? hs[i] : hs[m - 1]
      bots.push(`${x},${cy + h}`)
    }
    return [...tops, ...bots].join(' ')
  }, [data, vbW, cy, maxHalf])

  if (!data.length) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500 shadow-sm">
        No funnel stages configured for this campaign yet.
      </div>
    )
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-bold text-neutral-900">{title || 'Campaign funnel'}</h2>
        <p className="mt-0.5 text-xs text-neutral-500">
          {subtitle || 'Live counts by stage · click a column to filter the roster.'}
        </p>
      </div>

      <div
        className="grid divide-x divide-dashed divide-neutral-200/90"
        style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
      >
        {data.map((d) => {
          const active = activeStageKey === d.key
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onStageClick?.(d.key)}
              className={cn(
                'group relative px-2 py-4 text-center transition sm:px-3',
                active ? 'bg-sky-50/90 ring-1 ring-inset ring-sky-300/80' : 'bg-white hover:bg-slate-50/80',
                !onStageClick && 'cursor-default',
              )}
            >
              {d.dropPct !== null && (
                <span className="absolute -left-3.5 top-1/2 z-10 hidden -translate-y-1/2 items-center gap-0.5 rounded-full border border-neutral-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-neutral-500 shadow-sm sm:flex">
                  <ChevronDown className="h-2.5 w-2.5 -rotate-90 text-neutral-400" />
                  {d.dropPct}%
                </span>
              )}
              <div className="text-[11px] font-medium leading-tight text-neutral-500 sm:text-xs">{d.label}</div>
              <div className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-neutral-900 sm:text-3xl">
                {d.count.toLocaleString()}
              </div>
              <span className="mt-2 inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600 ring-1 ring-neutral-200/80">
                {d.pct}% of total
              </span>
            </button>
          )
        })}
      </div>

      <div className="border-t border-neutral-100 bg-gradient-to-b from-white to-slate-50/60 px-1 pb-2 pt-1">
        <svg viewBox={`0 0 ${vbW} ${vbH}`} className="h-[88px] w-full sm:h-[108px]" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="camp-funnel-flow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="18%" stopColor="#dbeafe" />
              <stop offset="45%" stopColor="#93c5fd" />
              <stop offset="78%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
          </defs>
          <polygon points={polyPoints} fill="url(#camp-funnel-flow)" opacity={0.95} />
        </svg>
      </div>
    </div>
  )
}
