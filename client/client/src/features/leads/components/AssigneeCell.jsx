import { useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'

function resolveAssignees(lead) {
  const list = Array.isArray(lead?.assignedUsers) ? lead.assignedUsers.filter(Boolean) : []
  if (list.length) return list
  if (lead?.assignee) return [lead.assignee]
  if (lead?.owner) return [lead.owner]
  return []
}

/** Owner cell: "Name" or "Name +N" when a lead has multiple assignees, with a hover list of everyone assigned. */
export function AssigneeCell({ lead, className }) {
  const [anchor, setAnchor] = useState(null)
  const users = resolveAssignees(lead)

  if (!users.length) return <span className={className}>-</span>

  const [first, ...rest] = users
  const firstLabel = first.name || first.email || '-'

  if (!rest.length) {
    return <span className={className}>{firstLabel}</span>
  }

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="truncate">{firstLabel}</span>
      <span
        className="cursor-default rounded-full bg-surface-subtle px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted"
        onMouseEnter={(e) => setAnchor({ x: e.clientX, y: e.clientY })}
        onMouseMove={(e) => setAnchor({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setAnchor(null)}
      >
        +{rest.length}
      </span>
      {anchor
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-[120] min-w-[160px] max-w-[240px] rounded-xl border border-surface-border bg-white p-2 shadow-2xl ring-1 ring-black/5"
              style={{ left: anchor.x + 12, top: anchor.y - 8 }}
            >
              <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Assigned to</p>
              <ul className="space-y-0.5">
                {users.map((u) => (
                  <li key={u.id || u.email || u.name} className="truncate px-1 text-[12px] text-ink">
                    {u.name || u.email}
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}
