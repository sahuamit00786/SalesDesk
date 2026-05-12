import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, isValid, parseISO } from 'date-fns'
import {
  AlertTriangle,
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Filter,
  Flag,
  GripVertical,
  LayoutGrid,
  List,
  MoreVertical,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { Loader } from '@/components/shared/Loader'
import { CalendarWorkspace } from '@/features/calendar/components/CalendarWorkspace'
import { usePatchLeadTaskMutation } from '@/features/leads/leadsApi'
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

/** Matches server `isOverdueTask`: open statuses, has due date, due in the past. */
function isTaskOverdueRow(task) {
  if (!task || !isOpenTaskStatus(task.status)) return false
  if (typeof task.isOverdue === 'boolean') return task.isOverdue
  if (!task.dueAt) return false
  const t = new Date(task.dueAt).getTime()
  if (Number.isNaN(t)) return false
  return t < Date.now()
}

/** Subtasks have no due field; inherit parent deadline when item is still open. */
function isSubtaskOverdueRow(parent, subtask) {
  if (!parent || !subtask || subtask.done) return false
  return isTaskOverdueRow(parent)
}

/** Progress ring reflects checklist completion; completed task is always 100%. */
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
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={ACCENT}
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}

function AvatarStack({ people }) {
  if (!people?.length) {
    return <span className="text-xs text-gray-400">—</span>
  }
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

/** Shared by every tasks table so columns line up vertically across sections. */
function TasksTableColGroup() {
  return (
    <colgroup>
      <col style={{ width: '25%' }} />
      <col style={{ width: '25%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '44px' }} />
    </colgroup>
  )
}

function TaskRow({
  task,
  subtask,
  depth = 0,
  isLastChild = false,
  onToggleParentComplete,
  onToggleSubtaskDone,
  patchingKey,
}) {
  const isChild = Boolean(subtask)
  const parent = isChild ? task : null
  const rowTask = isChild ? parent : task
  const title = isChild ? subtask.title : task.title
  const description = isChild ? '' : (task.description || '').trim()
  const priKey = (isChild ? parent?.priority : task?.priority) || 'medium'
  const pri = PRIORITY[priKey] || PRIORITY.medium
  const padLeft = depth > 0 ? 32 + (depth - 1) * 22 : 0

  const assigneeUser = isChild ? parent?.assignee : task?.assignee
  const assignees =
    assigneeUser?.name || assigneeUser?.email
      ? [{ initials: initialsFromName(assigneeUser.name || assigneeUser.email), name: assigneeUser.name || assigneeUser.email }]
      : []

  const dueLabel = isChild ? (parent?.dueAt ? formatDueLabel(parent.dueAt) : '—') : formatDueLabel(task?.dueAt)
  const overdue = isChild ? isSubtaskOverdueRow(parent, subtask) : isTaskOverdueRow(task)

  const { pct, label } = isChild
    ? { pct: subtask.done ? 100 : 0, label: subtask.done ? 'Done' : 'Open' }
    : computeTaskProgress(task)

  const parentComplete = rowTask?.status === 'completed'
  const parentCancelled = rowTask?.status === 'cancelled'
  const rowPatchKey = isChild ? `${parent.leadId}:${parent.id}:sub` : `${task.leadId}:${task.id}`
  const isPatching = patchingKey === rowPatchKey

  const handleParentCheck = () => {
    if (!task?.leadId || parentCancelled) return
    onToggleParentComplete?.(task)
  }

  const handleSubCheck = () => {
    if (!parent?.leadId) return
    onToggleSubtaskDone?.(parent, subtask)
  }

  return (
    <>
      <tr
        className={cn(
          'group border-b border-[#E5E7EB] bg-white transition-colors hover:bg-[#F9FAFB]',
          parentCancelled && 'opacity-70',
        )}
      >
        <td className="max-w-0 overflow-hidden px-2 py-1.5 align-middle" style={{ paddingLeft: `${8 + padLeft}px` }}>
          <div className="relative flex min-w-0 items-center gap-1">
            {depth > 0 ? (
              <>
                <span
                  className={cn(
                    'pointer-events-none absolute -left-5 w-px bg-violet-200',
                    isLastChild ? 'top-[-4px] h-[calc(50%+4px)]' : 'top-[-4px] h-[calc(100%+20px)]',
                  )}
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute -left-5 top-1/2 h-px w-4 -translate-y-1/2 bg-violet-300"
                  aria-hidden
                />
              </>
            ) : null}
            <button type="button" className="cursor-grab text-gray-400 opacity-0 transition group-hover:opacity-100" aria-label="Reorder" tabIndex={-1}>
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <input
              type="checkbox"
              className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-[#7c3aed] focus:ring-[#7c3aed]"
              checked={isChild ? Boolean(subtask.done) : parentComplete}
              disabled={isPatching || (!isChild && parentCancelled)}
              onChange={isChild ? handleSubCheck : handleParentCheck}
              aria-label={isChild ? `Toggle subtask: ${title}` : `Mark task complete: ${title}`}
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
              {!isChild && task.lead?.title ? (
                <p className="truncate text-[10px] text-gray-400">Lead: {task.lead.title}</p>
              ) : null}
            </div>
          </div>
        </td>
        <td className="max-w-0 overflow-hidden px-2 py-1.5 align-middle">
          {description ? <p className="line-clamp-2 break-words text-xs text-gray-500">{description}</p> : <span className="text-xs text-gray-400">—</span>}
        </td>
        <td className="px-2 py-1.5 align-middle text-center">
          <div className="flex justify-center">
            <AvatarStack people={assignees} />
          </div>
        </td>
        <td className="whitespace-nowrap px-2 py-1.5 align-middle text-left text-xs text-gray-700">{dueLabel}</td>
        <td className="whitespace-nowrap px-2 py-1.5 align-middle text-center">
          {overdue ? (
            <span className="inline-flex items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600">
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
              Overdue
            </span>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>
        <td className="whitespace-nowrap px-2 py-1.5 align-middle text-left">
          <span className="inline-flex items-center gap-1 text-xs">
            <Flag className={cn('h-3.5 w-3.5 fill-current', pri.flagClass)} strokeWidth={1.5} />
            <span className={cn('font-medium', pri.textClass)}>{pri.label}</span>
          </span>
        </td>
        <td className="max-w-0 overflow-hidden px-2 py-1.5 align-middle text-left">
          <div className="flex min-w-0 items-center gap-1">
            <ProgressRing value={pct} size={22} />
            <span className="min-w-0 truncate text-xs text-gray-600">{label}</span>
          </div>
        </td>
        <td className="w-11 shrink-0 px-1 py-1.5 align-middle text-right">
          {!isChild && task.leadId ? (
            <Link
              to={`/leads/${task.leadId}`}
              className="inline-flex rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-[#7c3aed]"
              aria-label="Open lead"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="inline-block w-8" />
          )}
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
          <div
            key={c.id}
            className={cn('inline-flex min-w-[6.25rem] items-center justify-between gap-2 rounded-md px-2 py-1 ring-1', c.ring, c.bg)}
          >
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
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-gray-500" />
        )}
        <span className="text-xs font-semibold text-gray-900">{section.title}</span>
        <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-500 shadow-sm ring-1 ring-[#E5E7EB]">
          {count === 1 ? 'Task' : 'Tasks'} {count}
        </span>
      </button>
    </div>
  )
}

const ALL_SECTION_IDS = [...STATUS_SECTIONS.map((s) => s.id), ...PRIORITY_SECTIONS.map((s) => s.id)]
const DEFAULT_OPEN = ALL_SECTION_IDS.reduce((acc, id) => ({ ...acc, [id]: true }), {})

function buildTaskSections(tasksRes, groupBy) {
  const rows = Array.isArray(tasksRes?.data) ? tasksRes.data : []
  if (groupBy === 'priority') {
    const byPri = { urgent: [], high: [], medium: [], low: [] }
    for (const t of rows) {
      const p = String(t.priority || 'medium').toLowerCase()
      const key = byPri[p] != null ? p : 'medium'
      byPri[key].push(t)
    }
    return PRIORITY_SECTIONS.map((meta) => ({
      ...meta,
      tasks: byPri[meta.id] || [],
      count: (byPri[meta.id] || []).length,
    }))
  }
  const byStatus = { pending: [], in_progress: [], completed: [], cancelled: [] }
  for (const t of rows) {
    const key = t.status && byStatus[t.status] != null ? t.status : 'pending'
    byStatus[key].push(t)
  }
  return STATUS_SECTIONS.map((meta) => ({
    ...meta,
    tasks: byStatus[meta.id] || [],
    count: (byStatus[meta.id] || []).length,
  }))
}

export function TasksPage() {
  const [activeView, setActiveView] = useState('list')
  const [listGroupBy, setListGroupBy] = useState('status')
  const [openSections, setOpenSections] = useState(() => ({ ...DEFAULT_OPEN }))
  const [patchingKey, setPatchingKey] = useState(null)

  const { data: tasksRes, isLoading, isError, error, refetch } = useGetTasksQuery({})
  const [patchLeadTask] = usePatchLeadTaskMutation()

  const statusCounts = useMemo(() => {
    const rows = Array.isArray(tasksRes?.data) ? tasksRes.data : []
    const c = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 }
    for (const t of rows) {
      const k = t.status && c[t.status] != null ? t.status : 'pending'
      c[k] += 1
    }
    return c
  }, [tasksRes])

  const overdueOpenCount = useMemo(() => {
    const rows = Array.isArray(tasksRes?.data) ? tasksRes.data : []
    let n = 0
    for (const t of rows) {
      if (isTaskOverdueRow(t)) n += 1
    }
    return n
  }, [tasksRes])

  const taskRows = useMemo(() => buildTaskSections(tasksRes, listGroupBy), [tasksRes, listGroupBy])

  const toggleSection = useCallback((id) => {
    setOpenSections((s) => ({ ...s, [id]: !s[id] }))
  }, [])

  const onToggleParentComplete = useCallback(
    async (task) => {
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
    },
    [patchLeadTask],
  )

  const onToggleSubtaskDone = useCallback(
    async (parentTask, sub) => {
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
    },
    [patchLeadTask],
  )

  return (
    <PageShell fullWidth>
      <div className="bg-white">
        <div className="mb-3 flex flex-col gap-2 px-2 pt-2 sm:px-3 lg:flex-row lg:items-center lg:justify-between lg:px-4">
          <div className="flex flex-wrap gap-1.5">
            {VIEWS.map(({ id, label, icon: Icon }) => {
              const active = activeView === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveView(id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                    active
                      ? 'border-[#7c3aed] bg-violet-50 text-[#7c3aed]'
                      : 'border-[#E5E7EB] bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 lg:ml-auto">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Filter className="h-3.5 w-3.5 text-gray-500" />
              Filter
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-gray-500" />
              Sort By
            </button>
          </div>
        </div>

        {activeView === 'list' ? (
          <div className="space-y-3 px-2 pb-3 sm:px-3 lg:px-4">
            <div className="flex flex-wrap gap-1.5">
              {LIST_GROUP_TABS.map(({ id, label }) => {
                const active = listGroupBy === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setListGroupBy(id)}
                    className={cn(
                      'inline-flex items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                      active
                        ? 'border-[#7c3aed] bg-violet-50 text-[#7c3aed]'
                        : 'border-[#E5E7EB] bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {listGroupBy === 'status' && !isLoading && !isError ? (
              <StatusSummaryBar
                counts={statusCounts}
                overdueOpen={overdueOpenCount}
                showAllClear={Boolean(Array.isArray(tasksRes?.data) && tasksRes.data.length > 0 && overdueOpenCount === 0)}
              />
            ) : null}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader label="Loading tasks" />
              </div>
            ) : null}
            {isError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-sm text-red-800">
                Could not load tasks.{error?.data?.error?.message ? ` ${error.data.error.message}` : ''}{' '}
                <button type="button" className="font-medium underline" onClick={() => refetch()}>
                  Retry
                </button>
              </div>
            ) : null}
            {!isLoading && !isError
              ? taskRows.map((section) => (
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
                      <div className="scrollbar-subtle overflow-x-auto">
                        <table className="w-full min-w-[960px] table-fixed border-collapse text-left">
                          <TasksTableColGroup />
                          <thead>
                            <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                              <th className="px-2 py-1.5 text-left">Task</th>
                              <th className="px-2 py-1.5 text-left">Description</th>
                              <th className="px-2 py-1.5 text-center">Assignee</th>
                              <th className="whitespace-nowrap px-2 py-1.5 text-left">Due date</th>
                              <th className="whitespace-nowrap px-2 py-1.5 text-center">Overdue</th>
                              <th className="whitespace-nowrap px-2 py-1.5 text-left">Priority</th>
                              <th className="whitespace-nowrap px-2 py-1.5 text-left">Progress</th>
                              <th className="w-11 px-1 py-1.5 text-right" aria-label="Actions" />
                            </tr>
                          </thead>
                          <tbody>
                            {section.tasks.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="px-2 py-5 text-center text-sm text-gray-500">
                                  {listGroupBy === 'priority' ? 'No tasks with this priority.' : 'No tasks in this status.'}
                                </td>
                              </tr>
                            ) : (
                              section.tasks.map((task) => (
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
                    ) : null}
                  </section>
                ))
              : null}
          </div>
        ) : null}

        {activeView === 'calendar' ? (
          <CalendarWorkspace
            lockedTypes={['task']}
            className="min-h-[520px] h-[calc(100dvh-9rem)] w-full min-w-0 rounded-none border-x-0 border-b-0 border-t border-gray-200"
          />
        ) : null}
      </div>
    </PageShell>
  )
}
