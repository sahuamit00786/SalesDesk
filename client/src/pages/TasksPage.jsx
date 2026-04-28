import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Check, CheckSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { useGetTasksQuery } from '@/features/tasks/tasksApi'
import { usePatchLeadTaskMutation } from '@/features/leads/leadsApi'

const TABS = [
  { id: 'all', label: 'All Tasks' },
  { id: 'urgent', label: 'Urgent' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
]

const PRIORITY_STYLE = {
  urgent: {
    chip: 'bg-rose-50 text-rose-700 border-rose-100',
    edge: 'before:bg-rose-500',
    badge: 'URGENT',
  },
  high: {
    chip: 'bg-blue-50 text-blue-700 border-blue-100',
    edge: 'before:bg-blue-500',
    badge: 'HIGH',
  },
  default: {
    chip: 'bg-slate-50 text-slate-700 border-slate-100',
    edge: 'before:bg-slate-400',
    badge: 'TASK',
  },
}

function TaskCard({ task, onToggleSubtask, onRequestComplete }) {
  const style = PRIORITY_STYLE[task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'urgent' : 'default'] || PRIORITY_STYLE.default
  const dueAt = task.dueAt ? new Date(task.dueAt) : null
  const dueLabel = dueAt && !Number.isNaN(dueAt.getTime())
    ? `Due ${dueAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${dueAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
    : 'No due date'
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
  const initials = (value) => String(value || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const statusLabel = task.status === 'completed' ? 'Completed' : task.status === 'cancelled' ? 'Cancelled' : 'Open'
  return (
    <article className={`relative overflow-hidden rounded-xl border border-surface-border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] before:absolute before:inset-y-0 before:left-0 before:w-[3px] ${style.edge}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide border ${style.chip}`}>{style.badge}</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted">
              <CalendarClock size={13} />
              {dueLabel}
            </span>
          </div>
          <h3 className="text-base leading-tight font-semibold text-ink md:text-lg">{task.title || 'Untitled task'}</h3>
          <p className="mt-1.5 max-w-4xl text-sm text-ink-muted">{task.description || 'No description'}</p>
          {task.lead?.id ? (
            <Link className="mt-1.5 inline-block text-xs font-medium text-brand-600 hover:underline" to={`/leads/${task.lead.id}`}>
              {task.lead?.title || task.lead?.contactName || task.lead?.email || 'Open lead'} →
            </Link>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${task.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : task.status === 'cancelled' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{statusLabel}</span>
          <button
            type="button"
            onClick={() => onRequestComplete(task)}
            className="rounded-lg border border-surface-border p-1.5 text-ink-muted hover:bg-slate-100"
            title="Mark as completed"
          >
            <Check size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-surface-border pt-4">
        <div className="grid gap-4 md:grid-cols-[1.5fr_0.9fr_0.9fr_auto] md:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Subtasks</p>
            <div className="space-y-1.5">
              {subtasks.map((sub, idx) => (
                <label key={`${task.id}-sub-${idx}`} className="flex items-center gap-2.5 text-sm text-ink-muted">
                  <input
                    type="checkbox"
                    checked={Boolean(sub.done)}
                    onChange={() => onToggleSubtask(task, idx)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600"
                  />
                  <span className={sub.done ? 'text-slate-400 line-through decoration-1' : ''}>{sub.title}</span>
                </label>
              ))}
              {!subtasks.length ? <p className="text-xs text-ink-muted">No subtasks</p> : null}
            </div>
          </div>

          <div className="md:justify-self-end md:text-right">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Assignee</p>
            <div className="flex items-center gap-2 md:justify-end">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[9px] font-semibold text-white">
                {initials(task.assignee?.name || task.assignedTo || '?')}
              </span>
              <span className="text-xs font-semibold text-ink">{task.assignee?.name || 'Unassigned'}</span>
            </div>
          </div>

          <div className="md:justify-self-end md:text-right">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Creator</p>
            <div className="flex items-center gap-2 md:justify-end">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[9px] font-semibold text-slate-700">
                {initials(task.creator?.name || '?')}
              </span>
              <span className="text-xs font-semibold text-ink">{task.creator?.name || 'System'}</span>
            </div>
          </div>

          <div className="pb-0.5 md:text-right">
            {task.actionLabel ? (
              <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                {task.actionLabel} <span aria-hidden>→</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}

export function TasksPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [dueFrom, setDueFrom] = useState('')
  const [dueTo, setDueTo] = useState('')
  const [subtaskOverrides, setSubtaskOverrides] = useState({})
  const [completeModalTask, setCompleteModalTask] = useState(null)
  const [confirmingComplete, setConfirmingComplete] = useState(false)
  const [patchLeadTask] = usePatchLeadTaskMutation()
  const queryParams = useMemo(() => {
    const out = {}
    if (search.trim()) out.search = search.trim()
    if (createdFrom) out.createdFrom = new Date(`${createdFrom}T00:00:00`).toISOString()
    if (createdTo) out.createdTo = new Date(`${createdTo}T23:59:59`).toISOString()
    if (dueFrom) out.dueFrom = new Date(`${dueFrom}T00:00:00`).toISOString()
    if (dueTo) out.dueTo = new Date(`${dueTo}T23:59:59`).toISOString()
    if (activeTab === 'completed') out.status = 'completed'
    if (activeTab === 'urgent') out.priority = 'medium'
    if (activeTab === 'today') out.horizon = 'today'
    if (activeTab === 'upcoming') out.horizon = 'upcoming'
    return out
  }, [activeTab, search, createdFrom, createdTo, dueFrom, dueTo])
  const { data, isFetching } = useGetTasksQuery(queryParams)
  const tasks = Array.isArray(data?.data) ? data.data : []

  const filteredTasks = useMemo(() => {
    // Server already filters by tab/search params; keep client-side as stable fallback.
    if (activeTab === 'all') return tasks
    if (activeTab === 'urgent') return tasks.filter((t) => ['high', 'medium'].includes(String(t.priority || '').toLowerCase()))
    if (activeTab === 'completed') return tasks.filter((t) => String(t.status || '').toLowerCase() === 'completed')
    if (activeTab === 'today') {
      const endOfToday = new Date()
      endOfToday.setHours(23, 59, 59, 999)
      return tasks.filter((t) => {
        const d = new Date(t.dueAt)
        return !Number.isNaN(d.getTime()) && d.getTime() <= endOfToday.getTime()
      })
    }
    if (activeTab === 'upcoming') {
      const endOfTomorrow = new Date()
      endOfTomorrow.setDate(endOfTomorrow.getDate() + 1)
      endOfTomorrow.setHours(23, 59, 59, 999)
      return tasks.filter((t) => {
        const d = new Date(t.dueAt)
        return !Number.isNaN(d.getTime()) && d.getTime() > endOfTomorrow.getTime()
      })
    }
    return tasks
  }, [activeTab, tasks])

  async function handleToggleSubtask(task, subtaskIndex) {
    const current = Array.isArray(subtaskOverrides[task.id]) ? subtaskOverrides[task.id] : Array.isArray(task.subtasks) ? task.subtasks : []
    const updatedSubtasks = current.map((sub, idx) => (
      idx === subtaskIndex ? { ...sub, done: !Boolean(sub.done) } : sub
    ))
    setSubtaskOverrides((prev) => ({ ...prev, [task.id]: updatedSubtasks }))
    const payload = updatedSubtasks.map((sub) => ({ title: String(sub.title || ''), done: Boolean(sub.done) }))
    try {
      await patchLeadTask({
        id: task.leadId,
        taskId: task.id,
        subtasks: payload,
      }).unwrap()
      toast.success('Subtask updated')
    } catch {
      setSubtaskOverrides((prev) => ({ ...prev, [task.id]: current }))
      toast.error('Could not update subtask.')
    }
  }

  function handleRequestComplete(task) {
    if (String(task.status || '').toLowerCase() === 'completed') {
      toast.success('Task already completed.')
      return
    }
    const subtasks = Array.isArray(subtaskOverrides[task.id]) ? subtaskOverrides[task.id] : Array.isArray(task.subtasks) ? task.subtasks : []
    const hasPending = subtasks.some((sub) => !sub.done)
    if (hasPending) {
      toast.error('All subtasks are not completed.')
      return
    }
    setCompleteModalTask(task)
  }

  async function handleConfirmComplete() {
    if (!completeModalTask) return
    setConfirmingComplete(true)
    try {
      await patchLeadTask({
        id: completeModalTask.leadId,
        taskId: completeModalTask.id,
        status: 'completed',
      }).unwrap()
      toast.success('Task marked as completed.')
      setCompleteModalTask(null)
    } catch {
      toast.error('Could not complete task.')
    } finally {
      setConfirmingComplete(false)
    }
  }

  return (
    <PageShell fullWidth>
      <div className="px-3 py-2.5 lg:px-4">
        <section className="rounded-2xl border border-surface-border bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-6 border-b border-surface-border pb-2">
            {TABS.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative pb-2 text-sm font-semibold transition-colors ${
                    active ? 'text-brand-700' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                  {active ? <span className="absolute inset-x-0 -bottom-[9px] h-[2px] rounded-full bg-brand-600" /> : null}
                </button>
              )
            })}
            <div className="ml-auto w-full sm:w-[280px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks, assignee, lead..."
                className="h-9 w-full rounded-lg border border-surface-border bg-white px-3 text-xs outline-none focus:border-brand-400"
              />
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-surface-border bg-slate-50 p-2">
              <p className="mb-1 text-[11px] font-semibold text-ink-muted">Created Between</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={createdFrom}
                  onChange={(e) => setCreatedFrom(e.target.value)}
                  className="h-8 rounded-md border border-surface-border bg-white px-2 text-xs"
                />
                <input
                  type="date"
                  value={createdTo}
                  onChange={(e) => setCreatedTo(e.target.value)}
                  className="h-8 rounded-md border border-surface-border bg-white px-2 text-xs"
                />
              </div>
            </div>
            <div className="rounded-lg border border-surface-border bg-slate-50 p-2">
              <p className="mb-1 text-[11px] font-semibold text-ink-muted">Expiry (Due) Between</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dueFrom}
                  onChange={(e) => setDueFrom(e.target.value)}
                  className="h-8 rounded-md border border-surface-border bg-white px-2 text-xs"
                />
                <input
                  type="date"
                  value={dueTo}
                  onChange={(e) => setDueTo(e.target.value)}
                  className="h-8 rounded-md border border-surface-border bg-white px-2 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {isFetching ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl border border-surface-border bg-slate-50" />)}
              </div>
            ) : null}
            {!isFetching && filteredTasks.map((task) => {
              const merged = subtaskOverrides[task.id] ? { ...task, subtasks: subtaskOverrides[task.id] } : task
              return <TaskCard key={task.id} task={merged} onToggleSubtask={handleToggleSubtask} onRequestComplete={handleRequestComplete} />
            })}
            {!isFetching && !filteredTasks.length ? (
              <div className="rounded-xl border border-dashed border-surface-border p-10 text-center text-sm text-ink-muted">
                <CheckSquare className="mx-auto mb-2 h-5 w-5" />
                No tasks in this tab.
              </div>
            ) : null}
          </div>
        </section>
      </div>
      {completeModalTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-white p-4 shadow-lg">
            <p className="text-base font-semibold text-ink">Approve Task Completion</p>
            <p className="mt-2 text-sm text-ink-muted">
              Is this task fully completed?
            </p>
            <p className="mt-1 text-sm font-medium text-ink">{completeModalTask.title || 'Untitled task'}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="h-9 rounded-lg border border-surface-border px-3 text-xs text-ink-muted hover:bg-surface-subtle"
                onClick={() => setCompleteModalTask(null)}
                disabled={confirmingComplete}
              >
                Cancel
              </button>
              <button
                type="button"
                className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                onClick={handleConfirmComplete}
                disabled={confirmingComplete}
              >
                {confirmingComplete ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  )
}
