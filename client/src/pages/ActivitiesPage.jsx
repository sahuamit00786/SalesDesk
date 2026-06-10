import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import DOMPurify from 'dompurify'
import { Link } from 'react-router-dom'
import {
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
} from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import {
  useGetActivitiesFeedQuery,
  useGetActivityTypesQuery,
} from '@/features/activities/activitiesApi'
import { useGetLeadsQuery } from '@/features/leads/leadsApi'
import { useTeamUsersQuery } from '@/features/team/teamApi'


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

function ActivityTimelineItem({ activity, typeMeta, nowMs }) {
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
  const isNote = !isFollowUp && key === 'note'
  const followUpAt = isFollowUp ? parseFollowUpTime(activity, headline, detailRaw) : null
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
  const [leadId, setLeadId] = useState('')
  const [leadRecord, setLeadRecord] = useState(null)
  const [leadSearch, setLeadSearch] = useState('')
  const [debouncedLeadSearch, setDebouncedLeadSearch] = useState('')
  const leadDebounceRef = useRef(null)
  const [typeFilter, setTypeFilter] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [userId, setUserId] = useState('')
  const [page, setPage] = useState(1)
  const [nowMs, setNowMs] = useState(Date.now())

  useEffect(() => {
    clearTimeout(leadDebounceRef.current)
    leadDebounceRef.current = setTimeout(() => setDebouncedLeadSearch(leadSearch), 300)
    return () => clearTimeout(leadDebounceRef.current)
  }, [leadSearch])

  const leadQueryParams = useMemo(() => {
    const p = { limit: 100, sort: 'createdAt', order: 'desc' }
    if (debouncedLeadSearch.trim()) p.search = debouncedLeadSearch.trim()
    return p
  }, [debouncedLeadSearch])

  const { data: leadsData, isFetching: leadsFetching } = useGetLeadsQuery(leadQueryParams)
  const { data: typesData } = useGetActivityTypesQuery()
  const { data: teamData } = useTeamUsersQuery()

  const feedParams = useMemo(() => {
    const p = { page, limit: 30, scope: leadId ? 'lead' : 'global' }
    if (leadId) p.leadId = leadId
    if (typeFilter.length) p.types = typeFilter.join(',')
    if (fromDate) {
      const [fy, fm, fd] = fromDate.split('-').map(Number)
      p.from = new Date(fy, fm - 1, fd, 0, 0, 0, 0).toISOString()
    }
    if (toDate) {
      const [ty, tm, td] = toDate.split('-').map(Number)
      p.to = new Date(ty, tm - 1, td, 23, 59, 59, 999).toISOString()
    }
    if (userId) p.userId = userId
    return p
  }, [page, leadId, typeFilter, fromDate, toDate, userId])

  const { data: feedData, isFetching: loadingFeed } = useGetActivitiesFeedQuery(feedParams, { pollingInterval: 60000 })

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const currentUser = useSelector((s) => s.auth.user)

  const leads = useMemo(() => (Array.isArray(leadsData?.data) ? leadsData.data : Array.isArray(leadsData) ? leadsData : []), [leadsData])
  const teamUsers = useMemo(() => {
    const items = Array.isArray(teamData?.data?.items) ? teamData.data.items : []
    if (currentUser && !items.some((u) => u.id === currentUser.id)) {
      return [{ id: currentUser.id, name: currentUser.name || currentUser.email }, ...items]
    }
    return items
  }, [teamData, currentUser])
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
    if (fromDate || toDate) n += 1
    if (leadId) n += 1
    if (userId) n += 1
    return n
  }, [leadId, fromDate, toDate, typeFilter, userId])

  function clearAllFilters() {
    setLeadId('')
    setLeadRecord(null)
    setLeadSearch('')
    setDebouncedLeadSearch('')
    setTypeFilter([])
    setFromDate('')
    setToDate('')
    setUserId('')
    setPage(1)
  }

  return (
    <PageShell fullWidth>
      <div className="h-full pr-[2px] pl-3 py-2.5 lg:pr-[2px] lg:pl-3">
        <div className="grid h-full gap-[2px]">
          <section className="flex h-full min-h-[calc(100dvh-90px)] flex-col rounded-2xl border border-surface-border bg-white p-4">
            {/* Single filter row */}
            <div className="flex items-center gap-2">

              {/* Lead / Opp search — takes remaining space */}
              <div className="relative flex-1 min-w-0">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-muted" />
                <input
                  className="h-9 w-full rounded-lg border border-surface-border bg-white pl-7 pr-6 text-xs outline-none focus:border-brand-400"
                  placeholder={leadRecord ? (leadRecord.title || leadRecord.contactName || 'Selected') : 'Search lead or opportunity…'}
                  value={leadSearch}
                  onChange={(e) => { setLeadSearch(e.target.value); if (!e.target.value) { setLeadId(''); setLeadRecord(null) } setPage(1) }}
                />
                {leadRecord && (
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink" onClick={() => { setLeadId(''); setLeadRecord(null); setLeadSearch('') }}>×</button>
                )}
                {leadSearch && (
                  <div className="absolute left-0 top-10 z-30 max-h-56 w-72 overflow-y-auto rounded-xl border border-surface-border bg-white shadow-lg">
                    {leadsFetching ? (
                      <p className="p-3 text-xs text-ink-muted">Loading…</p>
                    ) : leads.length === 0 ? (
                      <p className="p-3 text-xs text-ink-muted">No results</p>
                    ) : leads.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-subtle"
                        onClick={() => { setLeadId(r.id); setLeadRecord(r); setLeadSearch(''); setPage(1) }}
                      >
                        <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase ${r.isOpportunity ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {r.isOpportunity ? 'OPP' : 'LEAD'}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium text-ink">{r.title || r.contactName || '—'}</span>
                          {r.company && <span className="block truncate text-[10px] text-ink-muted">{r.company}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="date"
                className="h-9 shrink-0 rounded-lg border border-surface-border bg-white px-3 text-xs outline-none focus:border-brand-400"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
              />

              <input
                type="date"
                className="h-9 shrink-0 rounded-lg border border-surface-border bg-white px-3 text-xs outline-none focus:border-brand-400"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1) }}
              />

              <select
                className="h-9 shrink-0 rounded-lg border border-surface-border bg-white px-3 text-xs text-ink outline-none focus:border-brand-400"
                value=""
                onChange={(e) => { const v = e.target.value; if (v && !typeFilter.includes(v)) { setTypeFilter((prev) => [...prev, v]); setPage(1) } }}
              >
                <option value="">Activity type</option>
                {typeRows.map((type) => <option key={type.key} value={type.key}>{type.name}</option>)}
              </select>

              {/* By whom */}
              <select
                className="h-9 shrink-0 rounded-lg border border-surface-border bg-white px-3 text-xs text-ink outline-none focus:border-brand-400"
                value={userId}
                onChange={(e) => { setUserId(e.target.value); setPage(1) }}
              >
                <option value="">By whom</option>
                {teamUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  className="h-9 shrink-0 rounded-lg border border-surface-border bg-white px-3 text-xs text-ink-muted hover:bg-surface-subtle hover:text-ink"
                  onClick={clearAllFilters}
                >
                  Clear
                </button>
              )}

            </div>

            {/* Active type chips */}
            {typeFilter.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {typeFilter.map((id) => (
                  <button
                    key={`head-type-${id}`}
                    type="button"
                    className="rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px] hover:bg-surface-subtle"
                    onClick={() => setTypeFilter((prev) => prev.filter((x) => x !== id))}
                  >
                    {typeRows.find((t) => t.key === id)?.name || id} ×
                  </button>
                ))}
              </div>
            )}

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


    </PageShell>
  )
}
