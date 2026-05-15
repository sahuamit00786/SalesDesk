import { useState, useRef, useEffect } from 'react'
import { Bell, CalendarCheck, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '@/features/leave/leaveApi'

export function HrNotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { data } = useGetNotificationsQuery(25)
  const [markRead] = useMarkNotificationReadMutation()
  const [markAll] = useMarkAllNotificationsReadMutation()

  const rows = data?.data || []
  const unread = data?.meta?.unread ?? 0

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  async function onClickRow(row) {
    if (!row.isRead) await markRead(row.id)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <Button type="button" variant="icon" aria-label="Notifications" onClick={() => setOpen((o) => !o)}>
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-surface-border bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unread > 0 ? (
              <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => markAll()}>
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="max-h-80 overflow-auto">
            {rows.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-ink-muted">No notifications</li>
            ) : (
              rows.map((row) => {
                const isLeave = row.type === 'leave'
                const approved = /approved/i.test(row.title || '')
                const rejected = /rejected/i.test(row.title || '')
                const Icon = isLeave && approved ? CheckCircle2 : isLeave && rejected ? XCircle : isLeave ? CalendarCheck : Bell
                const iconClass = approved
                  ? 'bg-emerald-100 text-emerald-700'
                  : rejected
                    ? 'bg-rose-100 text-rose-700'
                    : isLeave
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-brand-100 text-brand-700'
                const inner = (
                  <>
                    <div className="flex gap-3">
                      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconClass)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">{row.title}</p>
                        {row.message ? (
                          <p className="mt-0.5 text-xs text-ink-muted line-clamp-2">{row.message}</p>
                        ) : null}
                      </div>
                    </div>
                  </>
                )
                return (
                  <li key={row.id}>
                    {row.link ? (
                      <Link
                        to={row.link}
                        onClick={() => onClickRow(row)}
                        className={`block px-4 py-3 hover:bg-surface-subtle ${row.isRead ? '' : 'bg-brand-50/50'}`}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onClickRow(row)}
                        className={`w-full px-4 py-3 text-left hover:bg-surface-subtle ${row.isRead ? '' : 'bg-brand-50/50'}`}
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
