import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { Inbox } from '@/components/ui/icons'
import {
  useGetNotificationSummaryQuery,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useMarkNotificationsSeenMutation,
} from '@/features/notifications/notificationsApi'
import { groupByDay, notificationVisual, relativeTime } from '@/features/notifications/notificationMeta'

const RANGE_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Recent (7 days)' },
  { id: 'all', label: 'All time' },
]

export function NotificationCenterModal({ open, onClose }) {
  // Mounted only while open, so every re-open starts from fresh filter state
  // (no separate "reset on open" effect needed).
  if (!open) return null
  return <NotificationCenterModalBody onClose={onClose} />
}

function NotificationCenterModalBody({ onClose }) {
  const navigate = useNavigate()
  const [range, setRange] = useState('week')
  const [category, setCategory] = useState('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [limit, setLimit] = useState(20)

  // Reset the accumulated "Load more" limit when a filter changes, computed
  // during render (React's documented pattern) instead of in an effect.
  const filtersKey = `${range}|${category}|${unreadOnly}`
  const [appliedFiltersKey, setAppliedFiltersKey] = useState(filtersKey)
  if (filtersKey !== appliedFiltersKey) {
    setAppliedFiltersKey(filtersKey)
    setLimit(20)
  }

  const { data: summaryData } = useGetNotificationSummaryQuery()
  const { data: listData, isFetching } = useGetNotificationsQuery({ page: 1, limit, range, category, unreadOnly })
  const [markRead] = useMarkNotificationReadMutation()
  const [markAll, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation()
  const [markSeen] = useMarkNotificationsSeenMutation()

  const rows = useMemo(() => listData?.data || [], [listData])
  const pagination = listData?.pagination
  const totalUnread = summaryData?.data?.totalUnread ?? 0
  const todayCount = summaryData?.data?.todayCount ?? 0
  const categoryCounts = summaryData?.data?.categories || []

  const unseenIds = useMemo(() => rows.filter((r) => !r.seenAt).map((r) => r.id), [rows])
  useEffect(() => {
    if (unseenIds.length === 0) return
    markSeen(unseenIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseenIds.join(',')])

  async function onClickRow(row) {
    if (!row.isRead) await markRead(row.id)
    onClose?.()
    if (row.link) navigate(row.link)
  }

  const grouped = groupByDay(rows)

  return (
    <Modal
      open
      onClose={onClose}
      title="All notifications"
      description={`${todayCount} today · ${totalUnread} unread`}
      maxWidthClassName="max-w-2xl"
      footer={
        pagination && rows.length < pagination.total ? (
          <>
            <span className="mr-auto text-xs text-ink-muted">
              Showing {rows.length} of {pagination.total}
            </span>
            <Button variant="secondary" onClick={() => setLimit((l) => l + 20)} disabled={isFetching}>
              Load more
            </Button>
          </>
        ) : null
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRange(opt.id)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                range === opt.id
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-surface-border text-ink-muted hover:bg-surface-subtle',
              )}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setUnreadOnly((v) => !v)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              unreadOnly
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-surface-border text-ink-muted hover:bg-surface-subtle',
            )}
          >
            Unread only
          </button>
        </div>
        {totalUnread > 0 ? (
          <button
            type="button"
            className="shrink-0 text-xs font-semibold text-brand-600 hover:underline disabled:opacity-50"
            disabled={markingAll}
            onClick={() => markAll()}
          >
            Mark all read
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategory('all')}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            category === 'all' ? 'bg-ink text-white' : 'bg-surface-subtle text-ink-muted hover:bg-brand-50',
          )}
        >
          All types
        </button>
        {categoryCounts
          .filter((c) => c.count > 0)
          .map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                category === c.id ? 'bg-ink text-white' : 'bg-surface-subtle text-ink-muted hover:bg-brand-50',
              )}
            >
              {c.label} · {c.count}
            </button>
          ))}
      </div>

      <div className="flex flex-col divide-y divide-surface-border rounded-xl border border-surface-border">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Inbox className="h-8 w-8 text-ink-faint" />
            <p className="text-sm text-ink-muted">No notifications for this filter</p>
          </div>
        ) : (
          grouped.map(([label, groupRows]) => (
            <div key={label}>
              <p className="bg-surface-subtle px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                {label}
              </p>
              {groupRows.map((row) => {
                const { Icon, className } = notificationVisual(row)
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => onClickRow(row)}
                    className={cn(
                      'flex w-full gap-3 border-t border-surface-border px-4 py-3 text-left hover:bg-surface-subtle',
                      !row.isRead && 'bg-slate-50',
                    )}
                  >
                    <span className="relative shrink-0">
                      <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', className)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      {!row.isRead ? (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-600" />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-ink">{row.title}</p>
                        <p className="shrink-0 text-[11px] text-ink-faint">{relativeTime(row.createdAt)}</p>
                      </div>
                      {row.message ? <p className="mt-0.5 text-xs text-ink-muted">{row.message}</p> : null}
                      {row.link ? <p className="mt-1 text-[11px] font-medium text-brand-600">View details →</p> : null}
                    </div>
                  </button>
                )
              })}
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}
