import { useEffect, useMemo, useState } from 'react'
import DOMPurify from 'dompurify'
import { Link } from 'react-router-dom'
import {
  Activity,
  Bell,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  Filter,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  NotebookPen,
  PhoneCall,
  Presentation,
  Search,
  Sparkles,
  UserRoundCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import {
  useCreateActivityReminderMutation,
  useGetActivitiesFeedQuery,
  useGetActivityTypesQuery,
} from '@/features/activities/activitiesApi'
import { useGetLeadsQuery } from '@/features/leads/leadsApi'

const PRESET_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'custom', label: 'Custom' },
]

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
  note: { icon: NotebookPen, color: '#f59e0b', label: 'Note' },
  demo: { icon: Sparkles, color: '#0e7490', label: 'Demo' },
  discovery: { icon: Search, color: '#475569', label: 'Discovery' },
  follow_up: { icon: Bell, color: '#0ea5e9', label: 'Follow-up' },
  in_person_visit: { icon: MapPin, color: '#1f2937', label: 'In-person visit' },
  task: { icon: Bell, color: '#0ea5e9', label: 'Task' },
}

const ICON_BY_NAME = {
  Activity,
  Bell,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  NotebookPen,
  PhoneCall,
  Presentation,
  Search,
  Sparkles,
  UserRoundCheck,
}

const UNIQUE_TYPE_COLORS = ['#0f766e', '#1d4ed8', '#7c3aed', '#b45309', '#0e7490', '#be123c', '#166534', '#374151', '#0891b2', '#7e22ce']
const UNIQUE_TYPE_ICONS = [PhoneCall, Mail, CalendarCheck2, NotebookPen, Presentation, Search, Bell, MapPin, MessageSquare, ClipboardCheck, FileText, UserRoundCheck, CheckCircle2, Activity, Sparkles]

function uniqueIndexFromKey(key) {
  const str = String(key || '')
  let hash = 0
  for (let i = 0; i < str.length; i += 1) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  return hash
}

function dateSeparatorLabel(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function fullTimestamp(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function parseFollowUpTime(activity, headline, detailRaw) {
  const fromMeta = activity.metadata?.scheduledAt || activity.metadata?.remindAt || activity.metadata?.followUpAt
  if (fromMeta) {
    const d = new Date(fromMeta)
    if (!Number.isNaN(d.getTime())) return d
  }
  const txt = `${headline} ${detailRaw}`
  const isoMatch = txt.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/)
  if (!isoMatch) return null
  const d = new Date(isoMatch[0])
  return Number.isNaN(d.getTime()) ? null : d
}

function countdownLabel(targetDate, nowMs) {
  if (!targetDate) return ''
  const diff = targetDate.getTime() - nowMs
  const abs = Math.abs(diff)
  const mins = Math.floor(abs / 60000)
  const days = Math.floor(mins / (60 * 24))
  const hours = Math.floor((mins % (60 * 24)) / 60)
  const minutes = mins % 60
  const pieces = []
  if (days) pieces.push(`${days}d`)
  if (hours) pieces.push(`${hours}h`)
  pieces.push(`${minutes}m`)
  return diff >= 0 ? `in ${pieces.join(' ')}` : 'Time over'
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

function ActivityTimelineItem({ activity, typeMeta, onSetReminder, nowMs }) {
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
  const actorName = activity.user?.name || 'System'
  const followUpText = `${headline} ${detailRaw}`.toLowerCase()
  const looksLikeFollowUp = followUpText.includes('follow-up') || followUpText.includes('follow up') || followUpText.includes('reminder')
  const isFollowUp = key === 'follow_up' || key === 'task' || looksLikeFollowUp
  const isEmail = key === 'email'
  const isNote = !isFollowUp && key === 'note'
  const followUpAt = isFollowUp ? parseFollowUpTime(activity, headline, detailRaw) : null
  const isFollowUpExpired = Boolean(isFollowUp && followUpAt && followUpAt.getTime() < nowMs)
  const canSetReminder = !isNote && !isEmail && !isFollowUpExpired
  const displayHeadline = isFollowUp && followUpAt
    ? headline.replace(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/,
        fullTimestamp(followUpAt),
      )
    : headline
  const remark = (activity.metadata?.description || '').trim()
  const renderedDetail = (activity.metadata?.description || activity.body || '').trim()
  const cardBg = isFollowUp ? '#f0f9ff' : isNote ? '#fff7ed' : `${meta.color}0a`
  const iconBg = isFollowUp ? '#e0f2fe' : isNote ? '#ffedd5' : `${meta.color}14`
  return (
    <article className="grid grid-cols-[160px_36px_minmax(0,1fr)] gap-2 py-1.5">
      <p className="pt-1 text-xs text-ink-muted">{fullTimestamp(activity.createdAt)}</p>
      <div className="relative flex justify-center">
        <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-surface-border" />
        <span
          className="relative z-10 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: iconBg, color: meta.color }}
        >
          <Icon size={14} />
        </span>
      </div>
      <div className="rounded-xl p-2.5" style={{ backgroundColor: cardBg }}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-semibold text-ink">{displayHeadline}</p>
          {isFollowUp && followUpAt ? (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700">{countdownLabel(followUpAt, nowMs)}</span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[11px] text-ink-muted">
          {activity.lead?.id ? (
            <Link
              className="font-medium underline decoration-1 underline-offset-2"
              style={{ color: meta.color, textDecorationColor: meta.color }}
              to={`/leads/${activity.lead.id}`}
            >
              {activity.lead?.title || 'Lead'}
            </Link>
          ) : (
            activity.lead?.title || 'Lead'
          )}
        </p>
        {isFollowUp && followUpAt ? <p className="mt-1 text-xs text-ink-muted">Call time: {fullTimestamp(followUpAt)}</p> : null}
        {isFollowUp && remark ? <p className="mt-0.5 text-xs text-ink-muted">Remark: {remark}</p> : null}
        {detailRaw ? (
          renderNoteHtml ? (
            <div
              className="prose prose-sm mt-1.5 max-w-none text-xs leading-relaxed text-ink prose-p:my-1 prose-headings:my-1"
              dangerouslySetInnerHTML={{ __html: noteBodyToDisplayHtml(detailRaw) }}
            />
          ) : (
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{renderedDetail}</p>
          )
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
          {activity.metadata?.durationMinutes ? <span className="rounded bg-white px-1.5 py-0.5">Duration: {activity.metadata.durationMinutes} min</span> : null}
          {Array.isArray(activity.metadata?.attendees) && activity.metadata.attendees.length ? (
            <span className="rounded bg-white px-1.5 py-0.5">Attendees: {activity.metadata.attendees.map((a) => a.name || a.email).join(', ')}</span>
          ) : null}
          {activity.metadata?.outcome ? <span className="rounded bg-white px-1.5 py-0.5">Outcome: {activity.metadata.outcome}</span> : null}
          {activity.metadata?.scheduled ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">Scheduled</span> : null}
        </div>
        {canSetReminder ? (
          <button
            type="button"
            className="mt-2 inline-flex h-7 items-center gap-1 rounded-lg border border-surface-border bg-white px-2 text-xs text-ink-muted hover:bg-surface-subtle"
            onClick={() => onSetReminder(activity.id)}
          >
            <Bell size={13} />
            Set follow-up reminder
          </button>
        ) : null}
        <p className="mt-2 text-right text-[11px] font-medium text-ink-muted">by {actorName}</p>
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
  const [datePreset, setDatePreset] = useState('week')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [page, setPage] = useState(1)
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [nowMs, setNowMs] = useState(Date.now())

  const [showReminderModal, setShowReminderModal] = useState(false)
  const [selectedReminderActivityId, setSelectedReminderActivityId] = useState(null)

  const [reminderForm, setReminderForm] = useState({
    remindAt: '',
    channelPush: true,
    channelEmail: true,
  })

  const { data: leadsData } = useGetLeadsQuery({ page: 1, limit: 200, search: '' })
  const { data: typesData } = useGetActivityTypesQuery()
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
    search: search || undefined,
  }
  const { data: feedData, isFetching: loadingFeed } = useGetActivitiesFeedQuery(feedParams, { pollingInterval: 60000 })

  const [createReminder, { isLoading: creatingReminder }] = useCreateActivityReminderMutation()

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const leads = Array.isArray(leadsData?.data) ? leadsData.data : Array.isArray(leadsData) ? leadsData : []
  const typeRows = typesData?.data || []
  const activities = feedData?.data || []
  const total = feedData?.meta?.total || 0
  const pages = Math.max(1, Math.ceil(total / 30))

  const typeMeta = useMemo(() => {
    const map = {}
    for (const [idx, row] of typeRows.entries()) {
      const uniqueIdx = uniqueIndexFromKey(row.key || idx)
      const resolvedIcon = ICON_BY_NAME[row.icon] || FALLBACK_TYPE_META[row.key]?.icon || UNIQUE_TYPE_ICONS[uniqueIdx % UNIQUE_TYPE_ICONS.length]
      map[row.key] = {
        label: row.name,
        color: row.color || FALLBACK_TYPE_META[row.key]?.color || UNIQUE_TYPE_COLORS[uniqueIdx % UNIQUE_TYPE_COLORS.length],
        icon: resolvedIcon,
      }
    }
    return map
  }, [typeRows])

  const activeFilterCount = useMemo(() => {
    let n = typeFilter.length
    if (search.trim()) n += 1
    if (datePreset !== 'week') n += 1
    if (scope === 'lead' && leadId) n += 1
    return n
  }, [scope, leadId, datePreset, search, typeFilter])

  function clearAllFilters() {
    setScope('global')
    setLeadId('')
    setSearch('')
    setTypeFilter([])
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
      <div className="h-full pr-[2px] pl-3 py-2.5 lg:pr-[2px] lg:pl-3">
        <div className="grid h-full gap-[2px]">
          <section className="flex h-full min-h-[calc(100dvh-90px)] flex-col rounded-2xl border border-surface-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold text-ink">Lead Activities</h1>
                <p className="text-xs text-ink-muted">Calls, emails, meetings, and notes in one timeline</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <input
                  className="h-9 min-w-[220px] rounded-lg border border-surface-border px-2 text-xs"
                  placeholder="Search title or notes"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  className="h-9 min-w-[170px] rounded-lg border border-surface-border px-2 text-xs"
                  value=""
                  onChange={(e) => {
                    const v = e.target.value
                    if (v && !typeFilter.includes(v)) setTypeFilter((prev) => [...prev, v])
                  }}
                >
                  <option value="">Activity type</option>
                  {typeRows.map((type) => <option key={type.key} value={type.key}>{type.name}</option>)}
                </select>
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
            </div>
            {typeFilter.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {typeFilter.map((id) => (
                  <button
                    key={`head-type-${id}`}
                    type="button"
                    className="rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px]"
                    onClick={() => setTypeFilter((prev) => prev.filter((x) => x !== id))}
                  >
                    {typeRows.find((t) => t.key === id)?.name || id} x
                  </button>
                ))}
              </div>
            ) : null}

            {scope === 'lead' && !leadId ? (
              <p className="mt-2 text-[11px] text-amber-700">Select a lead in Filters to narrow this page to one lead. Showing global activities for now.</p>
            ) : null}

            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {loadingFeed ? <ActivitySkeleton /> : null}
              {!loadingFeed && activities.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border p-8 text-center">
                  <p className="text-sm font-medium text-ink">No activity</p>
                </div>
              ) : null}
              {!loadingFeed && activities.map((row) => (
                <ActivityTimelineItem
                  key={row.id}
                  activity={row}
                  typeMeta={typeMeta}
                  nowMs={nowMs}
                  onSetReminder={(activityId) => {
                    setSelectedReminderActivityId(activityId)
                    setShowReminderModal(true)
                  }}
                />
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-ink-muted">Showing page {page} of {pages}</p>
              <div className="flex gap-2">
                <button type="button" className="h-8 rounded-lg border border-surface-border px-3 text-xs disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                <button type="button" className="h-8 rounded-lg border border-surface-border px-3 text-xs disabled:opacity-50" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Load more</button>
              </div>
            </div>
          </section>

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
