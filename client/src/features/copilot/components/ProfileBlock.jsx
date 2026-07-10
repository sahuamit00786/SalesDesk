import { useNavigate } from 'react-router-dom'
import { ExternalLink, Users, User } from 'lucide-react'
import { cn } from '@/utils/cn'

const KIND_ICON = { user: User, lead: Users }

const BADGE_TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  gray: 'bg-surface-100 text-ink-muted ring-surface-border',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
}

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

/**
 * Structured card for a single resolved record (a team member or a lead). Header
 * with avatar + name + status badges, a compact key/value strip, and a metric
 * grid — rendered instead of a prose data dump for "tell me about <X>" answers.
 */
export function ProfileBlock({ block }) {
  const navigate = useNavigate()
  const Icon = KIND_ICON[block.kind] || User
  const go = () => block.href && navigate(block.href)

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-surface-border bg-gradient-to-r from-brand-50/60 to-transparent px-4 py-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white shadow-sm">
          {initials(block.name) || <Icon className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-ink">{block.name}</span>
            {block.badges?.map((b, i) => (
              <span
                key={i}
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                  BADGE_TONES[b.tone] || BADGE_TONES.gray,
                )}
              >
                {b.label}
              </span>
            ))}
          </div>
          <span className="flex items-center gap-1.5 text-xs text-ink-faint">
            <Icon className="h-3 w-3" />
            {block.subtitle}
          </span>
        </div>
        {block.href ? (
          <button
            type="button"
            onClick={go}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-surface-border px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
          >
            Open
            <ExternalLink className="h-3 w-3" />
          </button>
        ) : null}
      </div>

      {block.fields?.length ? (
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 border-b border-surface-border/70 px-4 py-2.5">
          {block.fields.map((f, i) => (
            <div key={i} className="min-w-0 text-xs">
              <span className="text-ink-faint">{f.label}: </span>
              <span className="font-medium text-ink">{f.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {block.stats?.length ? (
        <div className="grid grid-cols-2 gap-px bg-surface-border/60 sm:grid-cols-3">
          {block.stats.map((s, i) => (
            <div key={i} className="bg-white px-4 py-2.5">
              <div className="text-[11px] uppercase tracking-wide text-ink-faint">{s.label}</div>
              <div className="text-sm font-semibold text-ink">{s.value}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
