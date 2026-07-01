import { PageContentPanel } from '@/components/layout/PageContentPanel'
import { cn } from '@/utils/cn'

export function ReportSectionHeading({ title, subtitle, className }) {
  return (
    <div className={cn('mb-2', className)}>
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-ink-faint">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
    </div>
  )
}

export function ReportKpiGrid({ children, className }) {
  return (
    <div className={cn('grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5', className)}>
      {children}
    </div>
  )
}

export function ReportChartGrid({ children, className }) {
  return (
    <div className={cn('grid grid-cols-1 gap-3 lg:grid-cols-2', className)}>
      {children}
    </div>
  )
}

export function ReportTableSection({ title, subtitle, children, className, flush = true }) {
  return (
    <PageContentPanel flush={flush} className={cn('border-[#F7F5FB]', className)}>
      <div className={flush ? 'p-2.5 sm:p-3' : undefined}>
        <ReportSectionHeading title={title} subtitle={subtitle} />
        {children}
      </div>
    </PageContentPanel>
  )
}

const STATUS_TONE_MAP = {
  positive: ['won', 'approved', 'completed', 'done', 'active', 'paid', 'present', 'confirmed', 'live', 'success'],
  attention: ['pending', 'in_progress', 'proposal', 'contacted', 'scheduled', 'upcoming'],
  negative: ['lost', 'rejected', 'cancelled', 'overdue', 'junk', 'absent', 'failed', 'declined', 'missed'],
}

const STATUS_TONE_CLASSES = {
  positive: 'bg-emerald-50 text-emerald-700',
  attention: 'bg-amber-50 text-amber-700',
  negative: 'bg-rose-50 text-rose-700',
  neutral: 'bg-slate-100 text-ink-muted',
}

function statusTone(status) {
  const s = String(status || '').toLowerCase().replace(/\s+/g, '_')
  for (const [tone, keys] of Object.entries(STATUS_TONE_MAP)) {
    if (keys.includes(s)) return tone
  }
  return 'neutral'
}

export function ReportStatusBadge({ status }) {
  const tone = statusTone(status)
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize', STATUS_TONE_CLASSES[tone])}>
      {String(status || '—').replace(/_/g, ' ')}
    </span>
  )
}

export function ReportNote({ children }) {
  return (
    <p className="rounded-xl border border-surface-border bg-surface-subtle/60 px-4 py-2 text-sm text-ink-muted">
      {children}
    </p>
  )
}

export function formatKpiDelta(current, previous) {
  if (previous === undefined || previous === null || current === undefined || current === null) return null
  const cur = Number(current)
  const prev = Number(previous)
  if (!Number.isFinite(cur) || !Number.isFinite(prev)) return null
  if (prev === 0) return cur > 0 ? '+100%' : null
  const pct = Math.round(((cur - prev) / prev) * 100)
  if (pct === 0) return '0%'
  return `${pct > 0 ? '+' : ''}${pct}%`
}
