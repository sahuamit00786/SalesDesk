import { useMemo, useState } from 'react'
import DOMPurify from 'dompurify'
import {
  Bell,
  CalendarCheck2,
  Filter,
  Mail,
  MapPin,
  NotebookPen,
  PhoneCall,
  Search,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import {
  useCreateActivityReminderMutation,
  useGetActivitiesFeedQuery,
  useGetActivityTypesQuery,
  useGetUpcomingRemindersQuery,
} from '@/features/activities/activitiesApi'
import { useGetLeadsQuery } from '@/features/leads/leadsApi'
import { useTeamUsersQuery } from '@/features/team/teamApi'

const PRESET_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'custom', label: 'Custom' },
]

const OUTCOME_OPTIONS = ['', 'connected', 'no_answer', 'interested', 'not_interested', 'follow_up']

const NOTE_SANITIZE = {
  ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'a', 'img'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt'],
}

function sanitizeNoteHtml(html) {
  return DOMPurify.sanitize(html || '', NOTE_SANITIZE)
}

/** Rich notes from the lead editor are HTML; plain text gets wrapped in paragraphs. */
function noteBodyToDisplayHtml(body) {
  const raw = (body || '').trim()
  if (!raw) return ''
  if (/<[a-z][\s\S]*>/i.test(raw)) return sanitizeNoteHtml(raw)
  return sanitizeNoteHtml(
    raw
      .split('\n')
      .map((line) => {
        const esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        return `<p>${esc || '<br>'}</p>`
      })
      .join(''),
  )
}

function plainTextFromHtml(html) {
  if (typeof document === 'undefined') return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const div = document.createElement('div')
  div.innerHTML = sanitizeNoteHtml(html || '')
  return (div.textContent || '').replace(/\s+/g, ' ').trim()
}

const FALLBACK_TYPE_META = {
  call: { icon: PhoneCall, color: '#0f766e', label: 'Call' },
  email: { icon: Mail, color: '#1d4ed8', label: 'Email' },
  meeting: { icon: CalendarCheck2, color: '#7c3aed', label: 'Meeting' },
  note: { icon: NotebookPen, color: '#b45309', label: 'Note' },
  demo: { icon: Sparkles, color: '#0e7490', label: 'Demo' },
  discovery: { icon: Search, color: '#475569', label: 'Discovery' },
  follow_up: { icon: Bell, color: '#be123c', label: 'Follow-up' },
  in_person_visit: { icon: MapPin, color: '#1f2937', label: 'In-person visit' },
}

function dateSeparatorLabel(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function fullTimestamp(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString()
}

function rangeFromPreset(preset) {
  const now = new Date()
  if (preset === 'today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    return { from: start.toISOString(), to: end.toISOString() }
  }
  if (preset === 'week') {
    const start = new Date(now)
    const day = start.getDay()
    const diff = day === 0 ? 6 : day - 1
    start.setDate(start.getDate() - diff)
    start.setHours(0, 0, 0, 0)
    return { from: start.toISOString(), to: now.toISOString() }
  }
  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: start.toISOString(), to: now.toISOString() }
  }
  return { from: '', to: '' }
}

function ActivityCard({ activity, typeMeta, onSetReminder }) {
  const key = activity.metadata?.activityTypeKey || activity.type
  const meta = typeMeta[key] || FALLBACK_TYPE_META[key] || FALLBACK_TYPE_META.note
  const Icon = meta.icon || Sparkles
  const detailRaw = (activity.metadata?.description || activity.body || '').trim()
  const renderNoteHtml = activity.type === 'note' && Boolean(detailRaw)
  const headline =
    activity.metadata?.title?.trim() ||
    (activity.type === 'note' && activity.body ? plainTextFromHtml(activity.body).slice(0, 120) : '') ||
    (activity.type === 'note' ? meta.label : activity.body) ||
    meta.label
  return (
    <article className="rounded-2xl border border-surface-border bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${meta.color}20`, color: meta.color }}>
            <Icon size={15} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{headline}</p>
            <p className="text-[11px] text-ink-muted">{activity.user?.name || 'System'} · {activity.lead?.title || 'Lead'}</p>
          </div>
        </div>
        <p className="text-[11px] text-ink-muted">{fullTimestamp(activity.createdAt)}</p>
      </div>
      {detailRaw ? (
        renderNoteHtml ? (
          <div
            className="prose prose-sm mt-2 max-w-none text-xs leading-relaxed text-ink prose-p:my-1 prose-headings:my-1"
            dangerouslySetInnerHTML={{ __html: noteBodyToDisplayHtml(detailRaw) }}
          />
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">{activity.metadata?.description || activity.body}</p>
        )
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
        {activity.metadata?.durationMinutes ? <span className="rounded bg-slate-100 px-1.5 py-0.5">Duration: {activity.metadata.durationMinutes} min</span> : null}
        {Array.isArray(activity.metadata?.attendees) && activity.metadata.attendees.length ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5">Attendees: {activity.metadata.attendees.map((a) => a.name || a.email).join(', ')}</span>
        ) : null}
        {activity.metadata?.outcome ? <span className="rounded bg-slate-100 px-1.5 py-0.5">Outcome: {activity.metadata.outcome}</span> : null}
        {activity.metadata?.scheduled ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">Scheduled</span> : null}
      </div>
      <div className="mt-3">
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-surface-border px-2 text-xs text-ink-muted hover:bg-surface-subtle"
          onClick={() => onSetReminder(activity.id)}
        >
          <Bell size={13} />
          Set follow-up reminder
        </button>
      </div>
    </article>
  )
}

function ActivitySkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(4)].map((_, idx) => (
        <div key={idx} className="animate-pulse rounded-2xl border border-surface-border bg-white p-3">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-2/3 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-full rounded bg-slate-200" />
        </div>
      ))}
    </div>
  )
}

export function ActivitiesPage() {
  const [scope, setScope] = useState('global')
  const [leadId, setLeadId] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState([])
  const [assignedTo, setAssignedTo] = useState([])
  const [attendees, setAttendees] = useState([])
  const [outcome, setOutcome] = useState('')
  const [datePreset, setDatePreset] = useState('week')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [page, setPage] = useState(1)
  const [showFiltersModal, setShowFiltersModal] = useState(false)

  const [showReminderModal, setShowReminderModal] = useState(false)
  const [selectedReminderActivityId, setSelectedReminderActivityId] = useState(null)

  const [reminderForm, setReminderForm] = useState({
    remindAt: '',
    channelPush: true,
    channelEmail: true,
  })

  const { data: leadsData } = useGetLeadsQuery({ page: 1, limit: 200, search: '' })
  const { data: usersData } = useTeamUsersQuery()
  const { data: typesData } = useGetActivityTypesQuery()
  const { data: remindersData } = useGetUpcomingRemindersQuery({ limit: 10 }, { pollingInterval: 60000 })

  const presetRange = useMemo(
    () => (datePreset === 'custom' ? { from: customFrom, to: customTo } : rangeFromPreset(datePreset)),
    [datePreset, customFrom, customTo],
  )
  const effectiveScope = scope === 'lead' && !leadId ? 'global' : scope
  const feedParams = {
    page,
    limit: 30,
    scope: effectiveScope,
    leadId: effectiveScope === 'lead' ? leadId : undefined,
    types: typeFilter.join(','),
    from: presetRange.from || undefined,
    to: presetRange.to || undefined,
    attendees: attendees.join(','),
    assignedTo: assignedTo.join(','),
    outcome: outcome || undefined,
    search: search || undefined,
  }
  const { data: feedData, isFetching: loadingFeed } = useGetActivitiesFeedQuery(feedParams, { pollingInterval: 60000 })

  const [createReminder, { isLoading: creatingReminder }] = useCreateActivityReminderMutation()

  const leads = Array.isArray(leadsData?.data) ? leadsData.data : Array.isArray(leadsData) ? leadsData : []
  const users = Array.isArray(usersData?.data) ? usersData.data : Array.isArray(usersData?.data?.items) ? usersData.data.items : Array.isArray(usersData) ? usersData : []
  const typeRows = typesData?.data || []
  const activities = feedData?.data || []
  const total = feedData?.meta?.total || 0
  const pages = Math.max(1, Math.ceil(total / 30))

  const typeMeta = useMemo(() => {
    const map = {}
    for (const row of typeRows) {
      map[row.key] = {
        label: row.name,
        color: row.color || '#64748b',
        icon: FALLBACK_TYPE_META[row.key]?.icon || Sparkles,
      }
    }
    return map
  }, [typeRows])

  const groupedActivities = useMemo(() => {
    const out = []
    let lastKey = ''
    for (const row of activities) {
      const d = new Date(row.createdAt)
      const key = Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
      if (key !== lastKey) {
        out.push({ kind: 'date', key: `date-${key || row.id}`, label: dateSeparatorLabel(row.createdAt) })
        lastKey = key
      }
      out.push({ kind: 'activity', key: row.id, row })
    }
    return out
  }, [activities])

  const activeFilterCount = useMemo(() => {
    let n = typeFilter.length + assignedTo.length + attendees.length
    if (outcome) n += 1
    if (search.trim()) n += 1
    if (datePreset !== 'week') n += 1
    if (scope === 'lead' && leadId) n += 1
    return n
  }, [scope, leadId, datePreset, outcome, search, typeFilter, assignedTo, attendees])

  function clearAllFilters() {
    setScope('global')
    setLeadId('')
    setSearch('')
    setTypeFilter([])
    setAssignedTo([])
    setAttendees([])
    setOutcome('')
    setDatePreset('week')
    setCustomFrom('')
    setCustomTo('')
    setPage(1)
  }

  async function submitReminder() {
    if (!selectedReminderActivityId || !reminderForm.remindAt) {
      toast.error('Reminder date-time is required.')
      return
    }
    await createReminder({
      activityId: selectedReminderActivityId,
      remindAt: reminderForm.remindAt,
      channelPush: reminderForm.channelPush,
      channelEmail: reminderForm.channelEmail,
    }).unwrap()
    toast.success('Reminder scheduled')
    setShowReminderModal(false)
    setReminderForm({ remindAt: '', channelPush: true, channelEmail: true })
    setSelectedReminderActivityId(null)
  }

  return (
    <PageShell fullWidth>
      <div className="px-3 py-2.5 lg:px-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
          <section className="rounded-2xl border border-surface-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold text-ink">Lead Activities</h1>
                <p className="text-xs text-ink-muted">Calls, emails, meetings, and notes in one timeline</p>
              </div>
              <button
                type="button"
                className="relative inline-flex h-9 items-center gap-2 rounded-lg border border-surface-border bg-white px-3 text-xs font-medium text-ink hover:bg-surface-subtle"
                onClick={() => setShowFiltersModal(true)}
              >
                <Filter size={14} aria-hidden />
                Filters
                {activeFilterCount > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">{activeFilterCount}</span>
                ) : null}
              </button>
            </div>

            {scope === 'lead' && !leadId ? (
              <p className="mt-2 text-[11px] text-amber-700">Select a lead in Filters to narrow this page to one lead. Showing global activities for now.</p>
            ) : null}

            <div className="mt-3 space-y-2">
              {loadingFeed ? <ActivitySkeleton /> : null}
              {!loadingFeed && groupedActivities.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border p-8 text-center">
                  <p className="text-sm font-medium text-ink">No matching activities</p>
                  <p className="mt-1 text-xs text-ink-muted">Try changing filters or log activity from a lead.</p>
                </div>
              ) : null}
              {!loadingFeed && groupedActivities.map((item) => {
                if (item.kind === 'date') return <p key={item.key} className="pt-2 text-xs font-semibold text-ink-muted">{item.label}</p>
                return (
                  <ActivityCard
                    key={item.key}
                    activity={item.row}
                    typeMeta={typeMeta}
                    onSetReminder={(activityId) => {
                      setSelectedReminderActivityId(activityId)
                      setShowReminderModal(true)
                    }}
                  />
                )
              })}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-ink-muted">Showing page {page} of {pages}</p>
              <div className="flex gap-2">
                <button type="button" className="h-8 rounded-lg border border-surface-border px-3 text-xs disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                <button type="button" className="h-8 rounded-lg border border-surface-border px-3 text-xs disabled:opacity-50" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Load more</button>
              </div>
            </div>
          </section>

          <aside className="space-y-3">
            <section className="rounded-2xl border border-surface-border bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Upcoming reminders</p>
              <div className="mt-2 space-y-2">
                {(remindersData?.data || []).map((row) => (
                  <div key={row.id} className="rounded-xl border border-surface-border bg-slate-50 p-2">
                    <p className="text-xs font-semibold text-ink line-clamp-1">{row.activity?.metadata?.title || row.activity?.body || 'Activity'}</p>
                    <p className="mt-0.5 text-[11px] text-ink-muted">{row.activity?.lead?.title || 'Lead'} · {fullTimestamp(row.remindAt)}</p>
                  </div>
                ))}
                {!(remindersData?.data || []).length ? <p className="text-xs text-ink-muted">No upcoming reminders.</p> : null}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {showFiltersModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-surface-border bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">Filters</p>
                <p className="mt-0.5 text-xs text-ink-muted">Narrow the activity timeline</p>
              </div>
              <button type="button" className="text-xs text-ink-muted hover:text-ink" onClick={() => setShowFiltersModal(false)}>
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              <label className="text-[11px] font-medium text-ink-muted">View</label>
              <select className="h-9 rounded-lg border border-surface-border px-2 text-xs" value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="global">Global view</option>
                <option value="lead">Per-lead view</option>
              </select>
              <label className="mt-2 text-[11px] font-medium text-ink-muted">Lead</label>
              <select className="h-9 rounded-lg border border-surface-border px-2 text-xs" value={leadId} onChange={(e) => setLeadId(e.target.value)} disabled={scope !== 'lead'}>
                <option value="">Select linked lead</option>
                {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.title || lead.contactName || lead.email}</option>)}
              </select>
              <label className="mt-2 text-[11px] font-medium text-ink-muted">Date range</label>
              <select className="h-9 rounded-lg border border-surface-border px-2 text-xs" value={datePreset} onChange={(e) => setDatePreset(e.target.value)}>
                {PRESET_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              {datePreset === 'custom' ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input type="datetime-local" className="h-9 rounded-lg border border-surface-border px-2 text-xs" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                  <input type="datetime-local" className="h-9 rounded-lg border border-surface-border px-2 text-xs" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </div>
              ) : null}
              <label className="mt-2 text-[11px] font-medium text-ink-muted">Outcome</label>
              <select className="h-9 rounded-lg border border-surface-border px-2 text-xs" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                {OUTCOME_OPTIONS.map((x) => <option key={x || 'all'} value={x}>{x || 'All outcomes'}</option>)}
              </select>
              <label className="mt-2 text-[11px] font-medium text-ink-muted">Search</label>
              <input className="h-9 rounded-lg border border-surface-border px-2 text-xs" placeholder="Title or notes" value={search} onChange={(e) => setSearch(e.target.value)} />
              <label className="mt-2 text-[11px] font-medium text-ink-muted">Activity types</label>
              <select
                className="h-9 rounded-lg border border-surface-border px-2 text-xs"
                value=""
                onChange={(e) => {
                  const v = e.target.value
                  if (v && !typeFilter.includes(v)) setTypeFilter((prev) => [...prev, v])
                }}
              >
                <option value="">Add type to filter</option>
                {typeRows.map((type) => <option key={type.key} value={type.key}>{type.name}</option>)}
              </select>
              <label className="mt-2 text-[11px] font-medium text-ink-muted">Assigned to</label>
              <select
                className="h-9 rounded-lg border border-surface-border px-2 text-xs"
                value=""
                onChange={(e) => {
                  const v = e.target.value
                  if (v && !assignedTo.includes(v)) setAssignedTo((prev) => [...prev, v])
                }}
              >
                <option value="">Add user</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}
              </select>
              <label className="mt-2 text-[11px] font-medium text-ink-muted">Attendees</label>
              <select
                className="h-9 rounded-lg border border-surface-border px-2 text-xs"
                value=""
                onChange={(e) => {
                  const v = e.target.value
                  if (v && !attendees.includes(v)) setAttendees((prev) => [...prev, v])
                }}
              >
                <option value="">Add attendee</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}
              </select>
              {typeFilter.length || assignedTo.length || attendees.length ? (
                <div className="mt-2 rounded-lg border border-surface-border bg-slate-50 p-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Active</p>
                  <div className="flex flex-wrap gap-1.5">
                    {typeFilter.map((id) => (
                      <button key={`type-${id}`} type="button" className="rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px]" onClick={() => setTypeFilter((prev) => prev.filter((x) => x !== id))}>
                        {id} ×
                      </button>
                    ))}
                    {assignedTo.map((id) => (
                      <button key={`assign-${id}`} type="button" className="rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px]" onClick={() => setAssignedTo((prev) => prev.filter((x) => x !== id))}>
                        Assigned: {users.find((u) => u.id === id)?.name || id} ×
                      </button>
                    ))}
                    {attendees.map((id) => (
                      <button key={`att-${id}`} type="button" className="rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px]" onClick={() => setAttendees((prev) => prev.filter((x) => x !== id))}>
                        Attendee: {users.find((u) => u.id === id)?.name || id} ×
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-surface-border pt-3">
              <button
                type="button"
                className="h-9 rounded-lg border border-surface-border px-3 text-xs text-ink-muted hover:bg-surface-subtle"
                onClick={() => {
                  clearAllFilters()
                  toast.success('Filters cleared')
                }}
              >
                Clear all
              </button>
              <button type="button" className="h-9 rounded-lg bg-brand-600 px-4 text-xs font-semibold text-white hover:bg-brand-700" onClick={() => setShowFiltersModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showReminderModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-white p-4">
            <p className="text-sm font-semibold text-ink">Set activity reminder</p>
            <div className="mt-3 space-y-2">
              <input type="datetime-local" className="h-9 w-full rounded-lg border border-surface-border px-2 text-xs" value={reminderForm.remindAt} onChange={(e) => setReminderForm((f) => ({ ...f, remindAt: e.target.value }))} />
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                <input type="checkbox" checked={reminderForm.channelPush} onChange={(e) => setReminderForm((f) => ({ ...f, channelPush: e.target.checked }))} />
                Push notification
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                <input type="checkbox" checked={reminderForm.channelEmail} onChange={(e) => setReminderForm((f) => ({ ...f, channelEmail: e.target.checked }))} />
                Email notification
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="h-8 rounded-lg border border-surface-border px-3 text-xs" onClick={() => setShowReminderModal(false)}>Cancel</button>
              <button type="button" className="h-8 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white disabled:opacity-50" onClick={submitReminder} disabled={creatingReminder}>
                {creatingReminder ? 'Saving...' : 'Save reminder'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  )
}
