import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ListChecks, MessageSquarePlus, Plus, Trash2 } from 'lucide-react'
import { RightDrawer } from '@/components/ui/RightDrawer'
import {
  useCreateLeadTaskCommentMutation,
  useCreateLeadTaskMutation,
  useGetLeadFormMetaQuery,
  usePatchLeadTaskMutation,
} from '@/features/leads/leadsApi'

export const LEAD_TASK_TYPE_OPTIONS = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'internal', label: 'Internal' },
  { value: 'document', label: 'Document' },
  { value: 'other', label: 'Other' },
]

function toDatetimeLocalValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function taskTypeLabel(value) {
  return LEAD_TASK_TYPE_OPTIONS.find((o) => o.value === value)?.label || 'Task'
}

export function LeadTaskDrawer({ open, onClose, leadId, task, leadTitle }) {
  const isEdit = Boolean(task?.id)
  const { data: metaRes } = useGetLeadFormMetaQuery(undefined, { skip: !open })
  const assignUsers = metaRes?.data?.users || []

  const [createTask, { isLoading: creating }] = useCreateLeadTaskMutation()
  const [patchTask, { isLoading: patching }] = usePatchLeadTaskMutation()
  const [addComment, { isLoading: commenting }] = useCreateLeadTaskCommentMutation()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [taskType, setTaskType] = useState('follow_up')
  const [priority, setPriority] = useState('medium')
  const [status, setStatus] = useState('open')
  const [dueLocal, setDueLocal] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [subtasks, setSubtasks] = useState([])
  const [commentDraft, setCommentDraft] = useState('')

  const saving = creating || patching

  useEffect(() => {
    if (!open) return
    if (task?.id) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setTaskType(task.taskType || 'follow_up')
      setPriority(task.priority || 'medium')
      setStatus(task.status || 'open')
      setDueLocal(toDatetimeLocalValue(task.dueAt))
      setAssignedTo(task.assignedTo || '')
      setSubtasks(
        (task.subtasks || []).map((s) => ({
          key: s.id,
          title: s.title,
          done: Boolean(s.done),
        })),
      )
    } else {
      setTitle('')
      setDescription('')
      setTaskType('follow_up')
      setPriority('medium')
      setStatus('open')
      setDueLocal('')
      setAssignedTo('')
      setSubtasks([])
    }
    setCommentDraft('')
  }, [open, task?.id])

  const comments = useMemo(() => (Array.isArray(task?.comments) ? task.comments : []), [task?.comments])

  const subPayload = useMemo(
    () =>
      subtasks
        .filter((s) => String(s.title || '').trim())
        .map(({ title: t, done }) => ({ title: String(t).trim(), done: Boolean(done) })),
    [subtasks],
  )

  async function handleSave() {
    if (!title.trim()) {
      toast.error('Add a task title.')
      return
    }
    const dueAt = dueLocal && !Number.isNaN(Date.parse(dueLocal)) ? new Date(dueLocal).toISOString() : null
    const base = {
      title: title.trim(),
      description: description.trim() || null,
      taskType,
      priority,
      dueAt,
      assignedTo: assignedTo || null,
      subtasks: subPayload,
    }
    try {
      if (isEdit) {
        await patchTask({ id: leadId, taskId: task.id, ...base, status }).unwrap()
        toast.success('Task updated')
      } else {
        await createTask({ id: leadId, ...base, status: 'open' }).unwrap()
        toast.success('Task created')
      }
      onClose()
    } catch {
      toast.error('Could not save the task.')
    }
  }

  async function handleAddComment() {
    const text = commentDraft.trim()
    if (!text || !task?.id) return
    try {
      await addComment({ id: leadId, taskId: task.id, body: text }).unwrap()
      setCommentDraft('')
      toast.success('Comment added')
    } catch {
      toast.error('Could not add comment.')
    }
  }

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit task' : 'New task'}
      description={leadTitle ? `Lead: ${leadTitle}` : 'Add details, checklist, and comments.'}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink hover:bg-slate-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            className="h-10 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            onClick={handleSave}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create task'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Title</label>
          <input
            className="h-11 w-full rounded-xl border border-surface-border px-3 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
            placeholder="e.g. Send proposal follow-up"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Type</label>
            <select
              className="h-11 w-full rounded-xl border border-surface-border bg-white px-3 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
            >
              {LEAD_TASK_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Priority</label>
            <select
              className="h-11 w-full rounded-xl border border-surface-border bg-white px-3 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {isEdit ? (
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Status</label>
            <select
              className="h-11 w-full rounded-xl border border-surface-border bg-white px-3 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="open">Open</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Due</label>
          <input
            type="datetime-local"
            className="h-11 w-full rounded-xl border border-surface-border px-3 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
            value={dueLocal}
            onChange={(e) => setDueLocal(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Assign to</label>
          <select
            className="h-11 w-full rounded-xl border border-surface-border bg-white px-3 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
          >
            <option value="">Unassigned</option>
            {assignUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Description</label>
          <textarea
            className="min-h-[100px] w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
            placeholder="Context, links, or instructions…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-subtle/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <ListChecks className="h-4 w-4 text-brand-600" aria-hidden />
            Subtasks
          </div>
          <div className="space-y-2">
            {subtasks.map((row, idx) => (
              <div key={row.key} className="flex items-start gap-2 rounded-xl border border-surface-border bg-white p-2">
                <input
                  type="checkbox"
                  className="mt-2 h-4 w-4 shrink-0 rounded border-surface-border text-brand-600"
                  checked={row.done}
                  onChange={(e) =>
                    setSubtasks((prev) => prev.map((s, i) => (i === idx ? { ...s, done: e.target.checked } : s)))
                  }
                />
                <input
                  className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none focus:border-brand-200"
                  placeholder="Subtask title"
                  value={row.title}
                  onChange={(e) =>
                    setSubtasks((prev) => prev.map((s, i) => (i === idx ? { ...s, title: e.target.value } : s)))
                  }
                />
                <button
                  type="button"
                  className="shrink-0 rounded-lg p-2 text-ink-muted hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove subtask"
                  onClick={() => setSubtasks((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-300 bg-brand-50/50 px-3 py-2 text-xs font-semibold text-brand-800 hover:bg-brand-50"
            onClick={() =>
              setSubtasks((prev) => [...prev, { key: crypto.randomUUID(), title: '', done: false }])
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add subtask
          </button>
        </div>

        {isEdit ? (
          <div className="rounded-2xl border border-surface-border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <MessageSquarePlus className="h-4 w-4 text-brand-600" aria-hidden />
              Comments
            </div>
            <div className="scrollbar-subtle max-h-52 space-y-3 overflow-y-auto rounded-xl border border-surface-border bg-slate-50/80 p-3">
              {comments.length === 0 ? (
                <p className="text-center text-xs text-ink-muted">No comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="rounded-lg border border-white bg-white px-3 py-2 shadow-sm">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-ink-muted">
                      <span className="font-medium text-ink">{c.author?.name || 'User'}</span>
                      <span>{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{c.body}</p>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <textarea
                className="min-h-[72px] flex-1 rounded-xl border border-surface-border px-3 py-2 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
                placeholder="Write a comment…"
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
              />
              <button
                type="button"
                disabled={commenting || !commentDraft.trim()}
                className="h-10 shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
                onClick={handleAddComment}
              >
                {commenting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-surface-border bg-slate-50/50 px-3 py-2 text-xs text-ink-muted">
            Save the task first to add comments.
          </p>
        )}
      </div>
    </RightDrawer>
  )
}

export { taskTypeLabel }
