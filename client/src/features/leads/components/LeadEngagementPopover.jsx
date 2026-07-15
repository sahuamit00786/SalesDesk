import { createPortal } from 'react-dom'
import { Activity, Calendar, CheckSquare, Mail, Phone, StickyNote } from '@/components/ui/icons'
import { cn } from '@/utils/cn'

const STAT_ROWS = [
  { key: 'calls', label: 'Calls', icon: Phone },
  { key: 'emails', label: 'Emails (activity)', icon: Mail },
  { key: 'emailLogs', label: 'Template emails', icon: Mail },
  { key: 'meetings', label: 'Meetings', icon: Calendar },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'followups', label: 'Follow-ups', icon: CheckSquare },
  { key: 'activities', label: 'All activities', icon: Activity },
]

export function LeadEngagementPopover({ open, anchor, lead, onClose }) {
  if (!open || !anchor || !lead) return null

  const engagement = lead.engagement || {}
  const name = lead.contactName || lead.title || 'Lead'

  const style = {
    position: 'fixed',
    left: Math.min(anchor.x, window.innerWidth - 240),
    top: Math.min(anchor.y + 12, window.innerHeight - 220),
    zIndex: 120,
  }

  return createPortal(
    <div
      className="w-52 rounded-xl border border-surface-border bg-white p-3 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150"
      style={style}
      onMouseLeave={onClose}
      role="tooltip"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Engagement</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-ink">{name}</p>
      <ul className="mt-2 space-y-1">
        {STAT_ROWS.map(({ key, label, icon: Icon }) => {
          const n = Number(engagement[key] || 0)
          if (key === 'emailLogs' && n === 0 && !lead.emailSent) return null
          return (
            <li key={key} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="flex min-w-0 items-center gap-1.5 text-ink-muted">
                <Icon className="h-3 w-3 shrink-0 text-brand-600" aria-hidden />
                <span className="truncate">{label}</span>
              </span>
              <span className={cn('shrink-0 tabular-nums font-semibold', n > 0 ? 'text-ink' : 'text-ink-faint')}>
                {n}
              </span>
            </li>
          )
        })}
      </ul>
      {lead.emailSent ? (
        <p className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-800">
          Template email sent
        </p>
      ) : null}
    </div>,
    document.body,
  )
}
