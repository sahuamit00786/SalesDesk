import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, isValid, parseISO } from 'date-fns'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flag,
  GripVertical,
  LayoutGrid,
  List,
  MoreVertical,
  ArrowUpDown,
  Search,
  X,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { SkeletonList } from '@/components/shared/SkeletonLoader'
import { CalendarWorkspace } from '@/features/calendar/components/CalendarWorkspace'
import { TaskAttachmentIcons } from '@/features/leads/components/TaskAttachmentIcons'
import { useGetLeadsQuery } from '@/features/leads/leadsApi'
import { usePatchLeadTaskMutation } from '@/features/leads/leadsApi'
import { useTeamUsersQuery } from '@/features/team/teamApi'
import { useGetTasksQuery } from '@/features/tasks/tasksApi'
import { cn } from '@/utils/cn'

const ACCENT = '#7c3aed'

const VIEWS = [
  { id: 'list', label: 'List', icon: List },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
]

const PRIORITY = {
  urgent: { label: 'Urgent', flagClass: 'text-rose-600', textClass: 'text-rose-700' },
  high: { label: 'High', flagClass: 'text-red-500', textClass: 'text-red-600' },
  medium: { label: 'Medium', flagClass: 'text-amber-400', textClass: 'text-amber-600' },
  low: { label: 'Low', flagClass: 'text-emerald-500', textClass: 'text-emerald-600' },
}

const STATUS_SECTIONS = [
  { id: 'pending', title: 'Pending', icon: 'grid' },
  { id: 'in_progress', title: 'In progress', icon: 'dot' },
  { id: 'completed', title: 'Completed', icon: 'check' },
  { id: 'cancelled', title: 'Cancelled', icon: 'cancel' },
]

const PRIORITY_SECTIONS = [
  { id: 'urgent', title: 'Urgent', icon: 'flag' },
  { id: 'high', title: 'High', icon: 'flag' },
  { id: 'medium', title: 'Medium', icon: 'flag' },
  { id: 'low', title: 'Low', icon: 'flag' },
]

const LIST_GROUP_TABS = [
  { id: 'status', label: 'By status' },
  { id: 'priority', label: 'By priority' },
]

/** Server-backed due / overdue quick filters (orthogonal to group-by). */
const DUE_QUICK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'not_overdue', label: 'Not overdue' },
  { id: 'due_today', label: 'Due today' },
  { id: 'upcoming', label: 'Upcoming' },
]

const SORT_OPTIONS = [
  { value: 'dueAt', label: 'Due date' },
  { value: 'createdAt', label: 'Created date' },
  { value: 'title', label: 'Title' },
  { value: 'priority', label: 'Priority' },
]

const PAGE_LIMIT = 200
const SECTION_PAGE_SIZE = 10

const ALL_SECTION_IDS = [...STATUS_SECTIONS.map((s) => s.id), ...PRIORITY_SECTIONS.map((s) => s.id)]
const DEFAULT_OPEN = ALL_SECTION_IDS.reduce((acc, id) => ({ ...acc, [id]: true }), {})
const DEFAULT_SECTION_PAGES = ALL_SECTION_IDS.reduce((acc, id) => ({ ...acc, [id]: 1 }), {})

function localDateToIso(dateStr, endOfDay = false) {
  if (!dateStr) return undefined
  const [y, m, d] = dateStr.split('-').map(Number)
  return endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999).toISOString()
    : new Date(y, m - 1, d, 0, 0, 0, 0).toISOString()
}

function todayLocalDateKey() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function tomorrowLocalDateKey() {
  const t = new Date()
  t.setDate(t.getDate() + 1)
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const d = String(t.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function initialsFromName(name) {
  const n = String(name || '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDueLabel(dueAt) {
  if (!dueAt) return '—'
  const d = dueAt instanceof Date ? dueAt : parseISO(String(dueAt))
  if (!isValid(d)) return '—'
  return format(d, 'MMM d, yyyy')
}

function isOpenTaskStatus(status) {
  const s = String(status || '').toLowerCase()
  return s === 'pending' || s === 'in_progress'
}

function isTaskOverdueRow(task) {
  if (!task || !isOpenTaskStatus(task.status)) return false
  if (typeof task.isOverdue === 'boolean') return task.isOverdue
  if (!task.dueAt) return false
  const t = new Date(task.dueAt).getTime()
  if (Number.isNaN(t)) return false
  return t < Date.now()
}

function isSubtaskOverdueRow(parent, subtask) {
  if (!parent || !subtask || subtask.done) return false
  return isTaskOverdueRow(parent)
}

function computeTaskProgress(task) {
  if (!task) return { pct: 0, label: '—' }
  if (task.status === 'completed') return { pct: 100, label: 'Done' }
  if (task.status === 'cancelled') return { pct: 0, label: 'Cancelled' }
  const subs = Array.isArray(task.subtasks) ? task.subtasks : []
  if (subs.length === 0) return { pct: 0, label: 'No checklist' }
  const done = subs.filter((s) => s.done).length
  const pct = Math.round((done / subs.length) * 100)
  return { pct, label: `${done}/${subs.length}` }
}

function ProgressRing({ value, size = 32, stroke = 2.5 }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, value))
  const offset = c - (pct / 100) * c
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={ACCENT} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
      />
    </svg>
  )
}

function AvatarStack({ people }) {
  if (!people?.length) return <span className="text-xs text-gray-400">—</span>
  return (
    <div className="flex -space-x-2">
      {people.map((p, i) => (
        <span
          key={`${p.initials}-${i}`}
          title={p.name || p.initials}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-slate-200 to-slate-300 text-[8px] font-semibold text-slate-700"
        >
          {p.initials}
        </span>
      ))}
    </div>
  )
}

function TasksTableColGroup() {
  return (
    <colgroup>
      <col style={{ width: '22%' }} />
      <col style={{ width: '18%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '44px' }} />
    </colgroup>
  )
}

function TaskRow({ task, subtask, depth = 0, isLastChild = false, onToggleParentComplete, onToggleSubtaskDone, patchingKey }) {
  const isChild = Boolean(subtask)
  const parent = isChild ? task : null
  const title = isChild ? subtask.title : task.title
  const description = isChild ? '' : (task.description || '').trim()
  const priKey = (isChild ? parent?.priority : task?.priority) || 'medium'
  const pri = PRIORITY[priKey] || PRIORITY.medium
  const padLeft = depth > 0 ? 32 + (depth - 1) * 22 : 0

  const assigneeUser = isChild ? parent?.assignee : task?.assignee
  const assignees = assigneeUser?.name || assigneeUser?.email
    ? [{ initials: initialsFromName(assigneeUser.name || assigneeUser.email), name: assigneeUser.name || assigneeUser.email }]
    : []

  const dueLabel = isChild ? (parent?.dueAt ? formatDueLabel(parent.dueAt) : '—') : formatDueLabel(task?.dueAt)
  const overdue = isChild ? isSubtaskOverdueRow(parent, subtask) : isTaskOverdueRow(task)

  const { pct, label } = isChild
    ? { pct: subtask.done ? 100 : 0, label: subtask.done ? 'Done' : 'Open' }
    : computeTaskProgress(task)

  const parentComplete = task?.status === 'completed'
  const parentCancelled = task?.status === 'cancelled'
  const rowPatchKey = isChild ? `${parent.leadId}:${parent.id}:sub` : `${task.leadId}:${task.id}`
  const isPatching = patchingKey === rowPatchKey

  return (
    <>
      <tr className={cn('group bg-white transition-colors', parentCancelled && 'opacity-70')}>
        <td className="max-w-0 overflow-hidden align-middle" style={{ paddingLeft: `${8 + padLeft}px` }}>
          <div className="relative flex min-w-0 items-center gap-1">
            {depth > 0 ? (
              <>
                <span className={cn('pointer-events-none absolute -left-5 w-px bg-violet-200', isLastChild ? 'top-[-4px] h-[calc(50%+4px)]' : 'top-[-4px] h-[calc(100%+20px)]')} aria-hidden />
                <span className="pointer-events-none absolute -left-5 top-1/2 h-px w-4 -translate-y-1/2 bg-violet-300" aria-hidden />
              </>
            ) : null}
            <button type="button" className="cursor-grab text-gray-400 opacity-0 transition group-hover:opacity-100" tabIndex={-1}>
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <input
              type="checkbox"
              className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-[#7c3aed] focus:ring-[#7c3aed]"
              checked={isChild ? Boolean(subtask.done) : parentComplete}
              disabled={isPatching || (!isChild && parentCancelled)}
              onChange={() => isChild ? onToggleSubtaskDone?.(task, subtask) : onToggleParentComplete?.(task)}
            />
            <div className="min-w-0 flex-1">
              {!isChild ? (
                <Link to={`/leads/${task.leadId}`} className="block truncate text-xs font-medium text-gray-900 hover:text-[#7c3aed]">
                  {title}
                </Link>
              ) : (
                <span className="inline-flex max-w-full items-center gap-1 truncate text-xs font-medium text-gray-800">
                  <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />
                  <span className="truncate">{title}</span>
                </span>
              )}
              {!isChild ? <TaskAttachmentIcons attachments={task.attachments} variant="compact" className="mt-1" /> : null}
            </div>
          </div>
        </td>
        <td className="max-w-0 overflow-hidden align-middle">
          {description ? <p className="line-clamp-2 break-words text-xs text-gray-500">{description}</p> : <span className="text-xs text-gray-400">—</span>}
        </td>
        <td className="max-w-0 overflow-hidden align-middle">
          {!isChild && (task.lead?.title || task.lead?.contactName) ? (
            <Link
              to={`/leads/${task.leadId}`}
              className="block truncate text-xs font-medium text-gray-700 hover:text-violet-600 hover:underline"
              title={task.lead?.title || task.lead?.contactName}
            >
              {task.lead?.title || task.lead?.contactName}
            </Link>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>
        <td className="align-middle text-center">
          <div className="flex justify-center"><AvatarStack people={assignees} /></div>
        </td>
        <td className="whitespace-nowrap align-middle text-left text-xs text-gray-700">{dueLabel}</td>
        <td className="whitespace-nowrap align-middle text-center">
          {overdue ? (
            <span className="inline-flex items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600">
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
              Overdue
            </span>
          ) : <span className="text-xs text-gray-400">—</span>}
        </td>
        <td className="whitespace-nowrap align-middle text-left">
          <span className="inline-flex items-center gap-1 text-xs">
            <Flag className={cn('h-3.5 w-3.5 fill-current', pri.flagClass)} strokeWidth={1.5} />
            <span className={cn('font-medium', pri.textClass)}>{pri.label}</span>
          </span>
        </td>
        <td className="max-w-0 overflow-hidden align-middle text-left">
          <div className="flex min-w-0 items-center gap-1">
            <ProgressRing value={pct} size={22} />
            <span className="min-w-0 truncate text-xs text-gray-600">{label}</span>
          </div>
        </td>
        <td className="cx-table-cell-actions w-11 shrink-0 text-right">
          {!isChild && task.leadId ? (
            <Link to={`/leads/${task.leadId}`} className="inline-flex rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-[#7c3aed]" aria-label="Open lead">
              <MoreVertical className="h-3.5 w-3.5" />
            </Link>
          ) : <span className="inline-block w-8" />}
        </td>
      </tr>
      {!isChild && Array.isArray(task.subtasks) && task.subtasks.length
        ? task.subtasks.map((s, idx, arr) => (
            <TaskRow
              key={s.id}
              task={task}
              subtask={s}
              depth={depth + 1}
              isLastChild={idx === arr.length - 1}
              onToggleParentComplete={onToggleParentComplete}
              onToggleSubtaskDone={onToggleSubtaskDone}
              patchingKey={patchingKey}
            />
          ))
        : null}
    </>
  )
}

function StatusSummaryBar({ counts, overdueOpen, showAllClear }) {
  const chips = [
    { id: 'pending', label: 'Pending', count: counts.pending, ring: 'ring-violet-200', bg: 'bg-violet-50', text: 'text-violet-800' },
    { id: 'in_progress', label: 'In progress', count: counts.in_progress, ring: 'ring-amber-200', bg: 'bg-amber-50', text: 'text-amber-900' },
    { id: 'completed', label: 'Completed', count: counts.completed, ring: 'ring-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-900' },
    { id: 'cancelled', label: 'Cancelled', count: counts.cancelled, ring: 'ring-gray-200', bg: 'bg-gray-50', text: 'text-gray-800' },
  ]
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2 py-2 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
      <p className="w-full text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:w-auto sm:pr-1.5">Totals by status</p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <div key={c.id} className={cn('inline-flex min-w-[6.25rem] items-center justify-between gap-2 rounded-md px-2 py-1 ring-1', c.ring, c.bg)}>
            <span className={cn('text-[11px] font-medium', c.text)}>{c.label}</span>
            <span className={cn('text-sm font-bold tabular-nums', c.text)}>{c.count}</span>
          </div>
        ))}
      </div>
      {overdueOpen > 0 ? (
        <div className="flex items-center sm:ml-auto">
          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-red-100">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {overdueOpen} open {overdueOpen === 1 ? 'task' : 'tasks'} overdue
          </span>
        </div>
      ) : showAllClear ? (
        <p className="text-xs text-gray-500 sm:ml-auto">No open overdue tasks.</p>
      ) : null}
    </div>
  )
}

function SectionHeader({ section, open, onToggle, count }) {
  return (
    <div className="flex w-full items-center justify-between gap-1.5 rounded-md bg-[#F9FAFB] px-2 py-1.5 transition hover:bg-gray-100">
      <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className="shrink-0 text-gray-500">{open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>
        {section.icon === 'grid' ? (
          <LayoutGrid className="h-4 w-4 shrink-0 text-violet-600" />
        ) : section.icon === 'dot' ? (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400" aria-hidden />
        ) : section.icon === 'check' ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        ) : section.icon === 'cancel' ? (
          <XCircle className="h-4 w-4 shrink-0 text-gray-500" />
        ) : section.icon === 'flag' ? (
          <Flag
            className={cn(
              'h-4 w-4 shrink-0 fill-current',
              section.id === 'urgent' && 'text-rose-600',
              section.id === 'high' && 'text-red-500',
              section.id === 'medium' && 'text-amber-500',
              section.id === 'low' && 'text-emerald-600',
            )}
            strokeWidth={1.5}
          />
        ) : <XCircle className="h-4 w-4 shrink-0 text-gray-500" />}
        <span className="text-xs font-semibold text-gray-900">{section.title}</span>
        <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-500 shadow-sm ring-1 ring-[#E5E7EB]">
          {count === 1 ? 'Task' : 'Tasks'} {count}
        </span>
      </button>
    </div>
  )
}

function buildTaskSections(rows, groupBy) {
  if (groupBy === 'priority') {
    const byPri = { urgent: [], high: [], medium: [], low: [] }
    for (const t of rows) {
      const p = String(t.priority || 'medium').toLowerCase()
      const key = byPri[p] != null ? p : 'medium'
      byPri[key].push(t)
    }
    return PRIORITY_SECTIONS.map((meta) => ({ ...meta, tasks: byPri[meta.id] || [], count: (byPri[meta.id] || []).length }))
  }
  const byStatus = { pending: [], in_progress: [], completed: [], cancelled: [] }
  for (const t of rows) {
    const key = t.status && byStatus[t.status] != null ? t.status : 'pending'
    byStatus[key].push(t)
  }
  return STATUS_SECTIONS.map((meta) => ({ ...meta, tasks: byStatus[meta.id] || [], count: (byStatus[meta.id] || []).length }))
}

/* ── Sort By popover ──────────────────────────────────── */
function SortByPopover({ sortBy, sortDir, onChange, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-30 mt-1 w-52 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-lg"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Sort by</p>
      <div className="flex flex-col gap-1">
        {SORT_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value, sortBy === o.value && sortDir === 'asc' ? 'desc' : 'asc')}
            className={cn(
              'flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
              sortBy === o.value
                ? 'bg-violet-50 text-violet-800'
                : 'text-gray-700 hover:bg-gray-50',
            )}
          >
            {o.label}
            {sortBy === o.value
              ? sortDir === 'asc'
                ? <ArrowUp className="h-3.5 w-3.5" />
                : <ArrowDown className="h-3.5 w-3.5" />
              : <ArrowUpDown className="h-3.5 w-3.5 text-gray-300" />}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Filter Modal ─────────────────────────────────────── */
function FilterModal({ open, onClose, filters, onApply }) {
  const [draft, setDraft] = useState(filters)
  const [leadSearch, setLeadSearch] = useState('')

  useEffect(() => {
    if (open) {
      setDraft(filters)
      setLeadSearch(filters.leadLabel || '')
    }
  }, [open, filters])

  const { data: teamData } = useTeamUsersQuery(undefined, { skip: !open })
  const teamUsers = useMemo(() => {
    const items = Array.isArray(teamData?.data?.items) ? teamData.data.items : []
    return items
  }, [teamData])

  const { data: leadsData } = useGetLeadsQuery(
    { search: leadSearch.trim(), limit: 20, page: 1 },
    { skip: !open || leadSearch.trim().length < 1 },
  )
  const leadOptions = useMemo(() => {
    const rows = Array.isArray(leadsData?.data?.rows) ? leadsData.data.rows : []
    return rows.map((l) => ({ id: l.id, label: l.title || l.contactName || l.email || l.id }))
  }, [leadsData])

  function set(key, val) {
    setDraft((d) => ({ ...d, [key]: val }))
  }

  function handleSelectLead(lead) {
    setDraft((d) => ({ ...d, leadId: lead.id, leadLabel: lead.label }))
    setLeadSearch(lead.label)
  }

  function handleClearLead() {
    setDraft((d) => ({ ...d, leadId: '', leadLabel: '' }))
    setLeadSearch('')
  }

  const activeCount = [draft.leadId, draft.assigneeId, draft.dueFrom, draft.dueTo].filter(Boolean).length

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filter Tasks"
      maxWidthClassName="max-w-md"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              const cleared = { leadId: '', leadLabel: '', assigneeId: '', dueFrom: '', dueTo: '' }
              setDraft(cleared)
              setLeadSearch('')
            }}
            className="text-sm text-ink-faint hover:text-ink underline underline-offset-2"
          >
            Clear all
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-subtle"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { onApply(draft); onClose() }}
              className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Apply{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">

        {/* Lead */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Lead</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <Input
              className="pl-9 pr-9"
              placeholder="Search lead name…"
              value={leadSearch}
              onChange={(e) => {
                setLeadSearch(e.target.value)
                if (!e.target.value) handleClearLead()
              }}
            />
            {draft.leadId ? (
              <button
                type="button"
                onClick={handleClearLead}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {draft.leadId ? (
            <p className="mt-1.5 text-xs text-brand-600">
              Selected: <span className="font-medium">{draft.leadLabel}</span>
            </p>
          ) : leadSearch.length >= 1 && leadOptions.length > 0 ? (
            <ul className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-surface-border bg-white shadow-md">
              {leadOptions.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectLead(l)}
                    className="w-full px-3.5 py-2.5 text-left text-sm text-ink hover:bg-brand-50"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : leadSearch.length >= 1 && leadOptions.length === 0 ? (
            <p className="mt-1.5 text-xs text-ink-faint">No leads found.</p>
          ) : null}
        </div>

        {/* Assigned to */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Assigned to</label>
          <Select
            value={draft.assigneeId || ''}
            onChange={(e) => set('assigneeId', e.target.value)}
          >
            <option value="">Anyone</option>
            {teamUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.name || u.email}</option>
            ))}
          </Select>
        </div>

        {/* Due date range */}
        <div className="pb-4">
          <label className="mb-1.5 block text-sm font-medium text-ink">Due date range</label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="mb-1 text-xs text-ink-faint">From</p>
              <Input
                type="date"
                value={draft.dueFrom || ''}
                onChange={(e) => set('dueFrom', e.target.value)}
              />
            </div>
            <span className="mt-5 text-ink-faint">—</span>
            <div className="flex-1">
              <p className="mb-1 text-xs text-ink-faint">To</p>
              <Input
                type="date"
                value={draft.dueTo || ''}
                onChange={(e) => set('dueTo', e.target.value)}
              />
            </div>
          </div>
        </div>

      </div>
    </Modal>
  )
}

export function TasksPage() {
  const [activeView, setActiveView] = useState('list')
  const [listGroupBy, setListGroupBy] = useState('status')
  const [dueQuickFilter, setDueQuickFilter] = useState('all')
  const [openSections, setOpenSections] = useState(() => ({ ...DEFAULT_OPEN }))
  const [patchingKey, setPatchingKey] = useState(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('dueAt')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [sectionPages, setSectionPages] = useState(() => ({ ...DEFAULT_SECTION_PAGES }))
  const [showSortPopover, setShowSortPopover] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState({
    leadId: '', leadLabel: '', assigneeId: '', dueFrom: '', dueTo: '',
  })

  const sortBtnRef = useRef(null)

  const taskQuery = useMemo(() => {
    const params = { page, limit: PAGE_LIMIT, sort: sortBy, sortDir }
    if (search.trim()) params.search = search.trim()
    if (appliedFilters.assigneeId) params.assignedTo = appliedFilters.assigneeId
    if (appliedFilters.leadId) params.leadId = appliedFilters.leadId
    if (appliedFilters.dueFrom) params.dueFrom = localDateToIso(appliedFilters.dueFrom)
    if (appliedFilters.dueTo) params.dueTo = localDateToIso(appliedFilters.dueTo, true)
    if (dueQuickFilter === 'overdue') params.status = 'overdue'
    else if (dueQuickFilter === 'not_overdue') params.overdue = 'false'
    else if (dueQuickFilter === 'due_today') {
      const day = todayLocalDateKey()
      params.dueFrom = localDateToIso(day)
      params.dueTo = localDateToIso(day, true)
    } else if (dueQuickFilter === 'upcoming') {
      params.dueFrom = localDateToIso(tomorrowLocalDateKey())
    }
    return params
  }, [page, sortBy, sortDir, search, appliedFilters, dueQuickFilter])

  const { data: tasksRes, isLoading, isError, error, refetch } = useGetTasksQuery(taskQuery)
  const [patchLeadTask] = usePatchLeadTaskMutation()

  const allRows = useMemo(() => Array.isArray(tasksRes?.data) ? tasksRes.data : [], [tasksRes])
  const total = tasksRes?.meta?.total ?? allRows.length
  const pages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  const statusCounts = useMemo(() => {
    const c = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 }
    for (const t of allRows) {
      const k = t.status && c[t.status] != null ? t.status : 'pending'
      c[k] += 1
    }
    return c
  }, [allRows])

  const overdueOpenCount = useMemo(() => allRows.filter(isTaskOverdueRow).length, [allRows])
  const taskSections = useMemo(() => buildTaskSections(allRows, listGroupBy), [allRows, listGroupBy])

  const activeFilterCount =
    [appliedFilters.leadId, appliedFilters.assigneeId, appliedFilters.dueFrom, appliedFilters.dueTo].filter(Boolean).length +
    (dueQuickFilter !== 'all' ? 1 : 0)

  const toggleSection = useCallback((id) => {
    setOpenSections((s) => ({ ...s, [id]: !s[id] }))
  }, [])

  const setSectionPage = useCallback((id, p) => {
    setSectionPages((s) => ({ ...s, [id]: p }))
  }, [])

  const onToggleParentComplete = useCallback(async (task) => {
    const leadId = task.leadId
    const taskId = task.id
    if (!leadId || !taskId) return
    const next = task.status === 'completed' ? 'pending' : 'completed'
    const key = `${leadId}:${taskId}`
    setPatchingKey(key)
    try {
      await patchLeadTask({ id: leadId, taskId, status: next }).unwrap()
    } catch {
      toast.error('Could not update task.')
    } finally {
      setPatchingKey(null)
    }
  }, [patchLeadTask])

  const onToggleSubtaskDone = useCallback(async (parentTask, sub) => {
    const leadId = parentTask.leadId
    const taskId = parentTask.id
    if (!leadId || !taskId) return
    const subs = Array.isArray(parentTask.subtasks) ? parentTask.subtasks : []
    const next = subs.map((s) => ({
      title: String(s.title || '').trim() || 'Item',
      done: s.id === sub.id ? !s.done : Boolean(s.done),
    }))
    setPatchingKey(`${leadId}:${taskId}:sub`)
    try {
      await patchLeadTask({ id: leadId, taskId, subtasks: next }).unwrap()
    } catch {
      toast.error('Could not update checklist.')
    } finally {
      setPatchingKey(null)
    }
  }, [patchLeadTask])

  return (
    <PageShell fullWidth>
      <div className="bg-white">
        {/* Top bar */}
        <div className="mb-3 flex flex-col gap-2 px-2 pt-2 sm:px-3 lg:flex-row lg:items-center lg:justify-between lg:px-4">
          {/* View toggle */}
          <div className="flex flex-wrap gap-1.5">
            {VIEWS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveView(id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                  activeView === id
                    ? 'border-[#7c3aed] bg-violet-50 text-[#7c3aed]'
                    : 'border-[#E5E7EB] bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Search + action buttons */}
          <div className="flex flex-wrap items-center gap-1.5 lg:ml-auto">
            {/* Search (list only) */}
            {activeView === 'list' ? (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  className="h-9 w-48 rounded-lg border border-[#E5E7EB] bg-white pl-8 pr-3 text-xs outline-none focus:border-[#7c3aed]"
                  placeholder="Search tasks…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
              </div>
            ) : null}

            {/* Filter button */}
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                activeFilterCount > 0
                  ? 'border-violet-400 bg-violet-50 text-violet-700'
                  : 'border-[#E5E7EB] bg-white text-gray-700 hover:bg-gray-50',
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
              {activeFilterCount > 0 ? (
                <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>

            {/* Sort By button + popover */}
            <div className="relative" ref={sortBtnRef}>
              <button
                type="button"
                onClick={() => setShowSortPopover((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                  showSortPopover
                    ? 'border-violet-400 bg-violet-50 text-violet-700'
                    : 'border-[#E5E7EB] bg-white text-gray-700 hover:bg-gray-50',
                )}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                Sort By
                {sortBy !== 'dueAt' || sortDir !== 'asc' ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                ) : null}
              </button>
              {showSortPopover ? (
                <SortByPopover
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onChange={(field, dir) => {
                    setSortBy(field)
                    setSortDir(dir)
                    setPage(1)
                    setShowSortPopover(false)
                  }}
                  onClose={() => setShowSortPopover(false)}
                />
              ) : null}
            </div>

            {/* Clear filters chip */}
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setAppliedFilters({ leadId: '', leadLabel: '', assigneeId: '', dueFrom: '', dueTo: '' })
                  setDueQuickFilter('all')
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        {activeView === 'list' ? (
          <div className="space-y-3 px-2 pb-3 sm:px-3 lg:px-4">

            {/* Group by + due quick filters */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {LIST_GROUP_TABS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setListGroupBy(id)}
                    className={cn(
                      'inline-flex items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                      listGroupBy === id
                        ? 'border-[#7c3aed] bg-violet-50 text-[#7c3aed]'
                        : 'border-[#E5E7EB] bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    {label}
                  </button>
                ))}
                <span className="mx-0.5 hidden h-5 w-px bg-[#E5E7EB] sm:inline" aria-hidden />
                {DUE_QUICK_FILTERS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setDueQuickFilter(id)
                      setPage(1)
                    }}
                    className={cn(
                      'inline-flex items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                      dueQuickFilter === id
                        ? id === 'overdue'
                          ? 'border-rose-300 bg-rose-50 text-rose-800'
                          : 'border-[#7c3aed] bg-violet-50 text-[#7c3aed]'
                        : 'border-[#E5E7EB] bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    {id === 'overdue' ? <AlertTriangle className="mr-1 h-3 w-3 shrink-0" aria-hidden /> : null}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {appliedFilters.leadLabel ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200">
                    Lead: {appliedFilters.leadLabel}
                  </span>
                ) : null}
                {appliedFilters.assigneeId ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200">
                    Assignee filter active
                  </span>
                ) : null}
                {(appliedFilters.dueFrom || appliedFilters.dueTo) ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200">
                    Due: {appliedFilters.dueFrom || '…'} → {appliedFilters.dueTo || '…'}
                  </span>
                ) : null}
                {dueQuickFilter !== 'all' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200">
                    {DUE_QUICK_FILTERS.find((f) => f.id === dueQuickFilter)?.label || dueQuickFilter}
                    <button
                      type="button"
                      className="rounded p-0.5 hover:bg-violet-100"
                      aria-label="Clear due quick filter"
                      onClick={() => setDueQuickFilter('all')}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Summary bar */}
            {listGroupBy === 'status' && !isLoading && !isError ? (
              <StatusSummaryBar
                counts={statusCounts}
                overdueOpen={overdueOpenCount}
                showAllClear={Boolean(allRows.length > 0 && overdueOpenCount === 0)}
              />
            ) : null}

            {isLoading ? <SkeletonList rows={8} /> : null}
            {isError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-sm text-red-800">
                Could not load tasks.{error?.data?.error?.message ? ` ${error.data.error.message}` : ''}{' '}
                <button type="button" className="font-medium underline" onClick={() => refetch()}>Retry</button>
              </div>
            ) : null}

            {!isLoading && !isError
              ? taskSections.map((section) => {
                  const secPage = sectionPages[section.id] ?? 1
                  const secPages = Math.max(1, Math.ceil(section.count / SECTION_PAGE_SIZE))
                  const secStart = (secPage - 1) * SECTION_PAGE_SIZE
                  const visibleTasks = section.tasks.slice(secStart, secStart + SECTION_PAGE_SIZE)
                  return (
                    <section key={section.id} className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-sm">
                      <div className="border-b border-[#E5E7EB] px-1.5 py-1">
                        <SectionHeader
                          section={section}
                          open={openSections[section.id]}
                          onToggle={() => toggleSection(section.id)}
                          count={section.count}
                        />
                      </div>
                      {openSections[section.id] ? (
                        <>
                          <div className="scrollbar-subtle overflow-x-auto">
                            <table className="cx-table cx-table--dense min-w-[960px] table-fixed">
                              <TasksTableColGroup />
                              <thead className="cx-table-sticky-head">
                                <tr>
                                  <th>Task</th>
                                  <th>Description</th>
                                  <th>Lead</th>
                                  <th className="text-center">Assignee</th>
                                  <th className="whitespace-nowrap text-left">Due date</th>
                                  <th className="whitespace-nowrap text-center">Overdue</th>
                                  <th className="whitespace-nowrap text-left">Priority</th>
                                  <th className="whitespace-nowrap text-left">Progress</th>
                                  <th className="cx-table-cell-actions w-11 text-right" aria-label="Actions" />
                                </tr>
                              </thead>
                              <tbody>
                                {section.count === 0 ? (
                                  <tr>
                                    <td colSpan={9} className="px-2 py-5 text-center text-sm text-gray-500">
                                      {listGroupBy === 'priority' ? 'No tasks with this priority.' : 'No tasks in this status.'}
                                    </td>
                                  </tr>
                                ) : (
                                  visibleTasks.map((task) => (
                                    <TaskRow
                                      key={task.id}
                                      task={task}
                                      onToggleParentComplete={onToggleParentComplete}
                                      onToggleSubtaskDone={onToggleSubtaskDone}
                                      patchingKey={patchingKey}
                                    />
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                          {section.count > SECTION_PAGE_SIZE ? (
                            <div className="flex items-center justify-between border-t border-[#E5E7EB] bg-[#FAFAFA] px-4 py-2">
                              <p className="text-xs text-gray-500">
                                {secStart + 1}–{Math.min(secStart + SECTION_PAGE_SIZE, section.count)} of {section.count}
                              </p>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={secPage <= 1}
                                  onClick={() => setSectionPage(section.id, secPage - 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50"
                                >
                                  <ChevronLeft className="h-3.5 w-3.5" />
                                </button>
                                <span className="min-w-[52px] text-center text-xs font-medium text-gray-700">
                                  {secPage} / {secPages}
                                </span>
                                <button
                                  type="button"
                                  disabled={secPage >= secPages}
                                  onClick={() => setSectionPage(section.id, secPage + 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50"
                                >
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </section>
                  )
                })
              : null}


          </div>
        ) : null}

        {activeView === 'calendar' ? (
          <CalendarWorkspace
            lockedTypes={['task']}
            filterAssignedTo={appliedFilters.assigneeId || undefined}
            filterLeadId={appliedFilters.leadId || undefined}
            className="min-h-[520px] h-[calc(100dvh-9rem)] w-full min-w-0 rounded-none border-x-0 border-b-0 border-t border-gray-200"
          />
        ) : null}
      </div>

      {/* Filter modal */}
      <FilterModal
        open={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={appliedFilters}
        onApply={(f) => { setAppliedFilters(f); setPage(1); setSectionPages({ ...DEFAULT_SECTION_PAGES }) }}
      />
    </PageShell>
  )
}
