import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useMarkNotificationsSeenMutation,
} from '@/features/notifications/notificationsApi'
import { groupByDay, notificationVisual, relativeTime } from '@/features/notifications/notificationMeta'
import { NotificationCenterModal } from '@/features/notifications/components/NotificationCenterModal'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [centerOpen, setCenterOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  const { data: countData } = useGetUnreadCountQuery()
  const { data: listData } = useGetNotificationsQuery({ limit: 8, range: 'week' })
  const [markRead] = useMarkNotificationReadMutation()
  const [markAll, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation()
  const [markSeen] = useMarkNotificationsSeenMutation()

  const unread = countData?.data?.count ?? 0
  const rows = useMemo(() => listData?.data || [], [listData])

  const unseenIds = useMemo(() => rows.filter((r) => !r.seenAt).map((r) => r.id), [rows])

  useEffect(() => {
    if (!open || unseenIds.length === 0) return
    markSeen(unseenIds)
    // Only re-fire when the open dropdown reveals a fresh set of unseen ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unseenIds.join(',')])

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const groups = useMemo(() => groupByDay(rows), [rows])

  async function onClickRow(row) {
    if (!row.isRead) await markRead(row.id)
    setOpen(false)
    if (row.link) navigate(row.link)
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
        <div className="absolute right-0 top-full z-50 mt-2 w-80 origin-top-right animate-in fade-in zoom-in-95 duration-150 rounded-2xl border border-surface-border bg-white shadow-2xl sm:w-96">
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-ink">Notifications</p>
              {unread > 0 ? (
                <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                  {unread} new
                </span>
              ) : null}
            </div>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
                disabled={markingAll}
                onClick={() => markAll()}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="max-h-96 overflow-auto">
            {rows.length === 0 ? (
              <li className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-subtle text-ink-faint">
                  <Bell className="h-5 w-5" />
                </span>
                <p className="text-sm text-ink-muted">You're all caught up</p>
              </li>
            ) : (
              groups.map(([label, dayRows]) => (
                <li key={label}>
                  <p className="sticky top-0 bg-white/95 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint backdrop-blur">
                    {label}
                  </p>
                  <ul>
                    {dayRows.map((row) => {
                      const { Icon, className } = notificationVisual(row)
                      return (
                        <li key={row.id}>
                          <button
                            type="button"
                            onClick={() => onClickRow(row)}
                            className={cn(
                              'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-subtle',
                              !row.isRead && 'bg-brand-50/60',
                            )}
                          >
                            <span className="relative shrink-0">
                              <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', className)}>
                                <Icon className="h-4 w-4" />
                              </span>
                              {!row.isRead ? (
                                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-600" />
                              ) : null}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={cn('text-sm text-ink', !row.isRead ? 'font-semibold' : 'font-medium')}>
                                {row.title}
                              </p>
                              {row.message ? (
                                <p className="mt-0.5 text-xs text-ink-muted line-clamp-2">{row.message}</p>
                              ) : null}
                              <p className="mt-1 text-[11px] text-ink-faint">{relativeTime(row.createdAt)}</p>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))
            )}
          </ul>
          <div className="border-t border-surface-border p-2">
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-center text-xs font-semibold text-brand-600 hover:bg-brand-50"
              onClick={() => {
                setOpen(false)
                setCenterOpen(true)
              }}
            >
              View all notifications
            </button>
          </div>
        </div>
      ) : null}
      <NotificationCenterModal open={centerOpen} onClose={() => setCenterOpen(false)} />
    </div>
  )
}
