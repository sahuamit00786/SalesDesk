import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  CheckSquare,
  Clock3,
  ExternalLink,
  Loader2,
  User,
  Briefcase,
  ListChecks,
  Paperclip,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'
import { computeCalendarPopoverPosition } from '@/utils/calendarPopoverPosition'
import { usePatchLeadTaskMutation } from '@/features/leads/leadsApi'
import { useTeamUsersQuery } from '@/features/team/teamApi'
import { TaskAttachmentIcons } from '@/features/leads/components/TaskAttachmentIcons'

function toDatetimeLocalValue(d) {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function humanizeTaskType(v) {
  if (!v) return '—'
  return String(v).replace(/_/g, ' ')
}

function humanizeStatus(s) {
  if (!s) return '—'
  return String(s).replace(/_/g, ' ')
}

const PRIORITIES = ['low', 'medium', 'high', 'urgent']
const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled']

export function TaskEventHoverCard({ event, anchorRect, onMouseEnter, onMouseLeave, exiting = false, onExitTransitionEnd }) {
  const leadId = event?.leadId
  const taskId = event?.sourceId
  const [patchLeadTask, { isLoading }] = usePatchLeadTaskMutation()
  const { data: teamRes } = useTeamUsersQuery(undefined, { skip: !leadId || !taskId })

  const teamUsers = useMemo(() => {
    const raw = teamRes?.data
    if (Array.isArray(raw?.items)) return raw.items
    if (Array.isArray(raw)) return raw
    return []
  }, [teamRes])

  const [title, setTitle] = useState(event?.title || '')
  const [description, setDescription] = useState(event?.meta?.description || '')
  const [dueLocal, setDueLocal] = useState(() => toDatetimeLocalValue(event?.start))
  const [priority, setPriority] = useState(event?.priority || 'medium')
  const [status, setStatus] = useState(event?.status || 'pending')
  const [assignedTo, setAssignedTo] = useState(event?.ownerUserId || '')
  const [subtasks, setSubtasks] = useState(() =>
    Array.isArray(event?.meta?.subtasks) ? event.meta.subtasks.map((s) => ({ title: s.title, done: Boolean(s.done) })) : [],
  )

  useEffect(() => {
    setTitle(event?.title || '')
    setDescription(event?.meta?.description || '')
    setDueLocal(toDatetimeLocalValue(event?.start))
    setPriority(event?.priority || 'medium')
    setStatus(event?.status || 'pending')
    setAssignedTo(event?.ownerUserId || '')
    setSubtasks(
      Array.isArray(event?.meta?.subtasks) ? event.meta.subtasks.map((s) => ({ title: s.title, done: Boolean(s.done) })) : [],
    )
  }, [
    event?.sourceId,
    event?.title,
    event?.start,
    event?.priority,
    event?.status,
    event?.ownerUserId,
    event?.meta?.description,
    JSON.stringify(event?.meta?.subtasks || []),
    JSON.stringify(event?.meta?.attachments || []),
  ])

  const patch = useCallback(
    async (body, successMsg) => {
      if (!leadId || !taskId) {
        toast.error('Missing lead or task reference.')
        return false
      }
      try {
        await patchLeadTask({ id: leadId, taskId, ...body }).unwrap()
        if (successMsg) toast.success(successMsg)
        return true
      } catch {
        toast.error('Could not save changes.')
        return false
      }
    },
    [leadId, taskId, patchLeadTask],
  )

  const handleSaveTitle = async () => {
    const t = title.trim()
    if (!t) return toast.error('Title is required.')
    if (t === (event?.title || '').trim()) return
    await patch({ title: t }, 'Title updated')
  }

  const handleSaveDescription = async () => {
    const d = description.trim() || null
    const prev = (event?.meta?.description || '').trim() || null
    if (d === prev) return
    await patch({ description: d }, 'Description saved')
  }

  const handleSaveDue = async () => {
    const iso = dueLocal ? new Date(dueLocal).toISOString() : null
    const prev = event?.start ? new Date(event.start).toISOString() : null
    if (iso === prev || (!iso && !prev)) return
    await patch({ dueAt: iso }, iso ? 'Due date updated' : 'Due date cleared')
  }

  const handlePriorityChange = async (e) => {
    const prev = priority
    const next = e.target.value
    setPriority(next)
    const ok = await patch({ priority: next }, 'Priority updated')
    if (!ok) setPriority(prev)
  }

  const handleStatusChange = async (e) => {
    const prev = status
    const next = e.target.value
    setStatus(next)
    const ok = await patch({ status: next }, next === 'completed' ? 'Task completed' : 'Status updated')
    if (!ok) setStatus(prev)
  }

  const handleAssigneeChange = async (e) => {
    const prev = assignedTo
    const raw = e.target.value
    const next = raw || null
    setAssignedTo(raw)
    const ok = await patch({ assignedTo: next }, 'Assignee updated')
    if (!ok) setAssignedTo(prev)
  }

  const toggleSubtask = async (index) => {
    const next = subtasks.map((s, i) => (i === index ? { ...s, done: !s.done } : s))
    const prev = subtasks
    setSubtasks(next)
    const ok = await patch({ subtasks: next }, null)
    if (!ok) setSubtasks(prev)
  }

  const { top, left, maxCardHeight } = useMemo(
    () => computeCalendarPopoverPosition(anchorRect),
    [anchorRect?.top, anchorRect?.bottom, anchorRect?.left, anchorRect?.right, anchorRect?.width, anchorRect?.height],
  )

  if (!anchorRect || !leadId || !taskId) return null

  return (
    <div
      role="dialog"
      aria-label="Task details"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTransitionEnd={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.propertyName !== 'opacity') return
        if (exiting) onExitTransitionEnd?.()
      }}
      className={cn(
        'fixed z-[130] flex min-h-0 w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl transition-[opacity,transform] duration-200 ease-out will-change-[opacity,transform]',
        exiting ? 'pointer-events-none opacity-0 scale-[0.97] translate-y-1' : 'opacity-100 scale-100 translate-y-0',
      )}
      style={{ top, left, maxHeight: maxCardHeight }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-amber-50/60 px-3 py-2">
        <span className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
          Task
        </span>
        <div className="flex items-center gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-amber-700" aria-hidden /> : null}
          <CheckSquare className="h-4 w-4 text-amber-600" aria-hidden />
        </div>
      </div>

      <div className="scrollbar-subtle min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Title</label>
          <input
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm font-semibold text-gray-900 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              <Clock3 className="h-3 w-3" />
              Due
            </label>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-amber-400"
              value={dueLocal}
              onChange={(e) => setDueLocal(e.target.value)}
              onBlur={() => void handleSaveDue()}
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              <User className="h-3 w-3" />
              Assignee
            </label>
            <select
              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-amber-400"
              value={assignedTo || ''}
              onChange={handleAssigneeChange}
            >
              <option value="">Unassigned</option>
              {teamUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Priority</label>
            <select
              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs capitalize outline-none focus:border-amber-400"
              value={priority}
              onChange={handlePriorityChange}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Status</label>
            <select
              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs capitalize outline-none focus:border-amber-400"
              value={status}
              onChange={handleStatusChange}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanizeStatus(s)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-2 text-xs">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="text-gray-500">
              Type: <span className="font-medium capitalize text-gray-800">{humanizeTaskType(event?.meta?.taskType)}</span>
            </span>
            {event?.leadName ? (
              <Link
                to={`/leads/${leadId}`}
                className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline"
              >
                <Briefcase className="h-3 w-3 shrink-0" />
                {event.leadName}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </Link>
            ) : null}
          </div>
          {event?.ownerName ? (
            <p className="mt-1 text-[11px] text-gray-600">
              Assigned to <span className="font-semibold text-gray-800">{event.ownerName}</span>
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-gray-500">No assignee name on file</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Description</label>
          <textarea
            rows={3}
            className="w-full resize-y rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-800 outline-none focus:border-amber-400"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => void handleSaveDescription()}
            placeholder="Add details…"
          />
        </div>

        {Array.isArray(event?.meta?.attachments) && event.meta.attachments.length ? (
          <div>
            <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              <Paperclip className="h-3 w-3" aria-hidden />
              Attachments
            </label>
            <TaskAttachmentIcons attachments={event.meta.attachments} variant="compact" />
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            <ListChecks className="h-3 w-3" />
            Subtasks
          </label>
          {subtasks.length ? (
            <ul className="space-y-1.5 rounded-lg border border-gray-100 bg-white p-2">
              {subtasks.map((s, idx) => (
                <li key={`${idx}-${s.title}`} className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(s.done)}
                    onChange={() => toggleSubtask(idx)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className={cn('leading-snug', s.done && 'text-gray-400 line-through')}>{s.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-2 py-3 text-center text-[11px] text-gray-500">
              No subtasks for this task
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-2">
          {status !== 'completed' ? (
            <button
              type="button"
              onClick={async () => {
                const prev = status
                setStatus('completed')
                const ok = await patch({ status: 'completed' }, 'Marked complete')
                if (!ok) setStatus(prev)
              }}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Mark complete
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                const prev = status
                setStatus('pending')
                const ok = await patch({ status: 'pending' }, 'Reopened')
                if (!ok) setStatus(prev)
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
            >
              Reopen task
            </button>
          )}
          <Link
            to={`/leads/${leadId}`}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Open lead
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <p className="text-[10px] text-gray-400">
          Calendar: {event?.start ? format(new Date(event.start), 'MMM d, yyyy h:mm a') : '—'}
        </p>
      </div>
    </div>
  )
}
