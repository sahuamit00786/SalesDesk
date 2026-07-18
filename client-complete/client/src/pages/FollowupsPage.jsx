import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  AlertTriangle,
  BellRing,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Hourglass,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  XCircle,
} from '@/components/ui/icons'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { PageStack } from '@/components/layout/PageStack'
import { PageFilterBar } from '@/components/layout/PageFilterBar'
import { ReportKpiCard } from '@/features/analytics/components/ReportKpiCard'
import { LeadTabEmptyState } from '@/features/leads/components/LeadTabSectionHeader'
import { AddFollowupDrawer } from '@/features/leads/components/AddFollowupDrawer'
import { SkeletonList } from '@/components/shared/SkeletonLoader'
import { Select } from '@/components/ui/Select'
import { cn } from '@/utils/cn'
import {
  useGetAllFollowupsQuery,
  usePatchLeadFollowupMutation,
  useDeleteLeadFollowupMutation,
} from '@/features/leads/leadsApi'
import { useTeamUsersQuery } from '@/features/team/teamApi'

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

function fmtDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDuration(ms) {
  const abs = Math.max(0, Math.abs(ms))
  const mins = Math.round(abs / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hours < 24) return remMins ? `${hours}h ${remMins}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return remHours ? `${days}d ${remHours}h` : `${days}d`
}

const TONE = {
  overdue: {
    card: 'border-red-200/80 bg-white hover:border-red-300 hover:shadow-md',
    bar: 'bg-red-400',
    pill: 'bg-red-50 text-red-800 ring-1 ring-red-100',
    chip: 'border-red-200/80 bg-red-50/70 text-red-900',
  },
  pending: {
    card: 'border-amber-200/80 bg-white hover:border-amber-300 hover:shadow-md',
    bar: 'bg-amber-400',
    pill: 'bg-amber-50 text-amber-900 ring-1 ring-amber-100',
    chip: 'border-amber-200/80 bg-amber-50/70 text-amber-950',
  },
  done: {
    card: 'border-emerald-200/70 bg-white hover:border-emerald-300 hover:shadow-md',
    bar: 'bg-emerald-400',
    pill: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100',
    chip: 'border-emerald-200/70 bg-emerald-50/70 text-emerald-900',
  },
  cancelled: {
    card: 'border-slate-200 bg-slate-50/50 hover:border-slate-300',
    bar: 'bg-slate-300',
    pill: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    chip: 'border-slate-200 bg-slate-50 text-slate-600',
  },
}

export function FollowupsPage() {
  const user = useSelector((s) => s.auth.user)
  const isCompanyAdmin = Boolean(user?.isCompanyAdmin)
  const userRoleKind = user?.companyRole?.userRoleKind
  const isAdmin = isCompanyAdmin || userRoleKind === 'workspace_admin' || userRoleKind === 'manager'

  const [statusFilter, setStatusFilter] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [search, setSearch] = useState('')
  const [clockMs, setClockMs] = useState(() => Date.now())
  const [addOpen, setAddOpen] = useState(false)
  const [addKey, setAddKey] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setClockMs(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const { data: teamData } = useTeamUsersQuery(undefined, { skip: !isAdmin })
  const teamUsers = Array.isArray(teamData?.data?.items) ? teamData.data.items : []

  const query = useMemo(() => {
    const q = {}
    if (statusFilter && statusFilter !== 'overdue') q.status = statusFilter
    if (isAdmin && employeeId) q.userId = employeeId
    return q
  }, [statusFilter, employeeId, isAdmin])

  const { data, isLoading, isFetching, isError, refetch } = useGetAllFollowupsQuery(query)
  const [patchFollowup, { isLoading: patching }] = usePatchLeadFollowupMutation()
  const [deleteFollowup] = useDeleteLeadFollowupMutation()

  const allRows = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data])

  const kpis = useMemo(() => {
    let pending = 0
    let overdue = 0
    let done = 0
    for (const f of allRows) {
      if (f.status === 'pending') {
        if (new Date(f.scheduledAt).getTime() < clockMs) overdue += 1
        else pending += 1
      } else if (f.status === 'done') {
        done += 1
      }
    }
    return { pending, overdue, done, total: allRows.length }
  }, [allRows, clockMs])

  const rows = useMemo(() => {
    let list = allRows
    if (statusFilter === 'overdue') {
      list = list.filter((f) => f.status === 'pending' && new Date(f.scheduledAt).getTime() < clockMs)
    } else if (statusFilter === 'pending') {
      list = list.filter((f) => f.status === 'pending' && new Date(f.scheduledAt).getTime() >= clockMs)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((f) => {
        const leadName = `${f.lead?.title || ''} ${f.lead?.contactName || ''}`.toLowerCase()
        const remark = String(f.remark || '').toLowerCase()
        return leadName.includes(q) || remark.includes(q)
      })
    }
    const statusRank = { pending: 0, done: 1, cancelled: 2 }
    return [...list].sort((a, b) => {
      const d = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9)
      if (d !== 0) return d
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    })
  }, [allRows, statusFilter, search, clockMs])

  async function handlePatch(row, patch) {
    try {
      await patchFollowup({ id: row.leadId, followupId: row.id, ...patch }).unwrap()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not update follow-up')
    }
  }

  async function handleDelete(row) {
    try {
      await deleteFollowup({ id: row.leadId, followupId: row.id }).unwrap()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not delete follow-up')
    }
  }

  const activeFilterCount = [Boolean(statusFilter), Boolean(employeeId), Boolean(search.trim())].filter(Boolean).length

  return (
    <PageShell fullWidth mainClassName="pt-2 pb-4">
      <PageStack className="gap-3">

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <ReportKpiCard
            label="Pending"
            value={kpis.pending}
            icon={Hourglass}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            accentColor="bg-amber-300"
          />
          <ReportKpiCard
            label="Overdue"
            value={kpis.overdue}
            icon={AlertTriangle}
            iconBg="bg-red-50"
            iconColor="text-red-600"
            accentColor="bg-red-300"
          />
          <ReportKpiCard
            label="Done"
            value={kpis.done}
            icon={CheckCircle2}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            accentColor="bg-emerald-300"
          />
          <ReportKpiCard
            label="Total"
            value={kpis.total}
            icon={BellRing}
            iconBg="bg-brand-50"
            iconColor="text-brand-600"
            accentColor="bg-brand-300"
          />
        </div>

        <PageFilterBar className="justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value || 'all'}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold transition',
                  statusFilter === tab.value
                    ? 'border-brand-300 bg-brand-50 text-brand-700'
                    : 'border-surface-border bg-white text-ink-muted hover:border-brand-200 hover:text-ink',
                )}
              >
                {tab.label}
              </button>
            ))}

            <div className="mx-1 h-6 w-px bg-surface-border" aria-hidden />

            {isAdmin ? (
              <div className="relative">
                <Users className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
                <Select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="h-9 w-44 pl-8 text-xs"
                  aria-label="Filter by employee"
                >
                  <option value="">All employees</option>
                  {teamUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email || u.id}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search lead or note…"
                className="h-9 w-52 rounded-lg border border-surface-border bg-white pl-8 pr-3 text-xs text-ink shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('')
                  setEmployeeId('')
                  setSearch('')
                }}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-surface-border bg-white px-2.5 text-xs text-ink-muted hover:bg-surface-subtle"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            ) : null}

            {isFetching && !isLoading ? <span className="text-[10px] text-ink-muted">Updating…</span> : null}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-muted">
              Showing <span className="font-semibold text-ink">{rows.length}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setAddKey((k) => k + 1)
                setAddOpen(true)
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--brand-primary-dark)]"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Add follow-up
            </button>
          </div>
        </PageFilterBar>

        {isLoading ? (
          <SkeletonList rows={6} />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-surface-border bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-sm font-medium text-rose-800">Could not load follow-ups.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <LeadTabEmptyState
            icon={BellRing}
            title={allRows.length === 0 ? 'No follow-ups yet' : 'No follow-ups match this filter'}
            description={
              allRows.length === 0
                ? 'Follow-ups scheduled from any lead will show up here.'
                : 'Try a different status, employee, or search term.'
            }
          />
        ) : (
          <ul className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((f) => {
              const scheduledMs = new Date(f.scheduledAt).getTime()
              const expired = f.status === 'pending' && scheduledMs < clockMs
              const tone = expired ? 'overdue' : f.status
              const t = TONE[tone] || TONE.pending
              const leadName = f.lead?.title || f.lead?.contactName || 'Lead'
              const initial = String(f.creator?.name || '?').trim().charAt(0).toUpperCase()

              return (
                <li
                  key={f.id}
                  className={cn('group relative overflow-hidden rounded-xl border shadow-sm ring-1 ring-slate-100/60 transition', t.card)}
                >
                  <div className={cn('absolute left-0 top-0 h-full w-1', t.bar)} aria-hidden />
                  <div className="relative pl-4 pr-3 pt-3 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', t.pill)}>
                        {expired ? <AlertTriangle className="h-3 w-3" /> : f.status === 'done' ? <CheckCircle2 className="h-3 w-3" /> : f.status === 'cancelled' ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {expired ? 'Overdue' : f.status}
                      </span>

                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        {f.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              title="Mark done"
                              disabled={patching}
                              onClick={() => handlePatch(f, { status: 'done' })}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-emerald-200 bg-white text-emerald-700 transition hover:bg-emerald-50"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              title="Cancel"
                              disabled={patching}
                              onClick={() => handlePatch(f, { status: 'cancelled' })}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => handleDelete(f)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50/60 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <Link
                      to={`/leads/${f.leadId}`}
                      className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-brand-600 hover:underline"
                    >
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                      <span className="truncate">{leadName}</span>
                    </Link>

                    <p className="mt-1.5 line-clamp-2 min-h-[2rem] text-xs leading-snug text-ink-muted">
                      {f.remark?.trim() ? f.remark : <span className="italic text-ink-faint">No remark</span>}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                      <div className="min-w-0 space-y-1">
                        <p className="flex items-center gap-1 text-[11px] text-ink-muted">
                          <Calendar className="h-3 w-3 shrink-0 text-ink-faint" />
                          <span className="truncate">{fmtDateTime(f.scheduledAt)}</span>
                        </p>
                        {isAdmin && f.creator?.name ? (
                          <p className="flex items-center gap-1 text-[10px] text-ink-faint">
                            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[8px] font-semibold text-slate-600">
                              {initial}
                            </span>
                            <span className="truncate">{f.creator.name}</span>
                          </p>
                        ) : null}
                      </div>

                      {f.status === 'pending' ? (
                        <div className={cn('flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold', t.chip)}>
                          {expired ? `Overdue by ${formatDuration(clockMs - scheduledMs)}` : `In ${formatDuration(scheduledMs - clockMs)}`}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </PageStack>

      <AddFollowupDrawer key={addKey} open={addOpen} onClose={() => setAddOpen(false)} />
    </PageShell>
  )
}
