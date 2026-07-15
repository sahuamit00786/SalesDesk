import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  Bell,
  Calendar,
  ChevronDown,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
  Flag,
  ListChecks,
  Mail,
  MessageSquarePlus,
  Paperclip,
  Plus,
  Repeat,
  Trash2,
  X,
} from '@/components/ui/icons'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { AttachmentPickerModal } from '@/features/templates/components/AttachmentPickerModal'
import { DocumentPreviewDialog } from '@/features/documents/components/DocumentPreviewDialog'
import { normalizeTaskAttachmentForPreview } from '@/features/documents/documentUtils'
import {
  useCreateLeadTaskCommentMutation,
  useCreateLeadTaskMutation,
  useGetLeadFormMetaQuery,
  useGetLeadsQuery,
  useGetLeadTaskTimelineQuery,
  usePatchLeadTaskMutation,
} from '@/features/leads/leadsApi'
import { PRIORITY_META, STATUS_META } from '@/features/tasks/taskConstants'

export const LEAD_TASK_TYPE_OPTIONS = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'demo', label: 'Demo' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'document', label: 'Document' },
  { value: 'internal', label: 'Internal' },
  { value: 'custom', label: 'Custom' },
  { value: 'other', label: 'Other' },
]

export const LEAD_TASK_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export const LEAD_TASK_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const RECURRENCE_FREQ_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
]

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function toDatetimeLocalValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toDateInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function dateInputToIso(value) {
  if (!value) return null
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function datetimeLocalToIso(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function fmtDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function taskTypeLabel(value) {
  return LEAD_TASK_TYPE_OPTIONS.find((o) => o.value === value)?.label || 'Task'
}

function StatusPill({ value }) {
  const map = {
    pending: 'border-slate-200 bg-slate-50 text-slate-700',
    in_progress: 'border-brand-200 bg-brand-50 text-brand-700',
    completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    cancelled: 'border-slate-200 bg-slate-100 text-slate-500',
  }
  const label = LEAD_TASK_STATUS_OPTIONS.find((o) => o.value === value)?.label || value
  const cls = map[value] || 'border-slate-200 bg-slate-50 text-slate-700'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  )
}

function PriorityPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {LEAD_TASK_PRIORITY_OPTIONS.map((o) => {
        const meta = PRIORITY_META[o.value] || {}
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition ${
              active
                ? `${meta.pill} ring-1`
                : 'border border-surface-border bg-white text-ink-muted hover:border-brand-300 hover:text-ink'
            }`}
          >
            <Flag className={`h-3.5 w-3.5 fill-current ${meta.flagClass}`} strokeWidth={1.5} />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function StatusPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {LEAD_TASK_STATUS_OPTIONS.map((o) => {
        const meta = STATUS_META[o.value] || {}
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition ${
              active
                ? `${meta.pill} ring-1`
                : 'border border-surface-border bg-white text-ink-muted hover:border-brand-300 hover:text-ink'
            }`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function leadInitials(label) {
  return (
    String(label || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '?'
  )
}

export function LeadTaskDrawer({ open, onClose, leadId: leadIdProp, task, leadTitle, onSaved }) {
  const isEdit = Boolean(task?.id)
  const isLeadPreset = Boolean(leadIdProp)
  const [chosenLeadId, setChosenLeadId] = useState('')
  const [chosenLeadLabel, setChosenLeadLabel] = useState('')
  const [leadSearch, setLeadSearch] = useState('')
  const effectiveLeadId = leadIdProp || chosenLeadId || task?.leadId || ''

  const { data: metaRes } = useGetLeadFormMetaQuery(undefined, { skip: !open })
  const assignUsers = metaRes?.data?.users || []

  const { data: leadsRes, isFetching: leadsFetching } = useGetLeadsQuery(
    { page: 1, limit: 20, search: leadSearch.trim() },
    { skip: !open || isLeadPreset || isEdit || leadSearch.trim().length < 1 },
  )
  const leadsList = useMemo(() => {
    const arr = Array.isArray(leadsRes?.data) ? leadsRes.data : Array.isArray(leadsRes?.data?.items) ? leadsRes.data.items : []
    return arr
  }, [leadsRes])

  const [createTask, { isLoading: creating }] = useCreateLeadTaskMutation()
  const [patchTask, { isLoading: patching }] = usePatchLeadTaskMutation()
  const [addComment, { isLoading: commenting }] = useCreateLeadTaskCommentMutation()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [taskType, setTaskType] = useState('follow_up')
  const [priority, setPriority] = useState('medium')
  const [status, setStatus] = useState('pending')
  const [startLocal, setStartLocal] = useState('')
  const [dueLocal, setDueLocal] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [subtasks, setSubtasks] = useState([])
  const [reminders, setReminders] = useState([])
  const [recurrence, setRecurrence] = useState({ freq: '', interval: 1, byweekday: [], until: '' })
  const [attachments, setAttachments] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [attachmentPreview, setAttachmentPreview] = useState(null)
  const [activityTab, setActivityTab] = useState('comments')
  const [commentDraft, setCommentDraft] = useState('')
  const [internalDraft, setInternalDraft] = useState('')

  const saving = creating || patching

  useEffect(() => {
    if (!open) return
    if (task?.id) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setTaskType(task.taskType || 'follow_up')
      setPriority(task.priority || 'medium')
      setStatus(task.status === 'open' ? 'pending' : task.status || 'pending')
      setStartLocal(toDateInputValue(task.startAt))
      setDueLocal(toDatetimeLocalValue(task.dueAt))
      setAssignedTo(task.assignedTo || '')
      setSubtasks(
        (task.subtasks || []).map((s) => ({ key: s.id, title: s.title, done: Boolean(s.done) })),
      )
      setReminders(
        Array.isArray(task.reminders)
          ? task.reminders.map((r) => ({
              key: r.id || crypto.randomUUID(),
              remindAt: toDatetimeLocalValue(r.remindAt),
              channelPush: r.channelPush !== false,
              channelEmail: r.channelEmail !== false,
            }))
          : [],
      )
      const rule = task.recurrenceRule || null
      setRecurrence({
        freq: rule?.freq || '',
        interval: rule?.interval || 1,
        byweekday: Array.isArray(rule?.byweekday) ? rule.byweekday : [],
        until: rule?.until ? toDateInputValue(rule.until) : '',
      })
      setAttachments(
        Array.isArray(task.attachments)
          ? task.attachments.map((a) => ({
              filename: a.filename || a.fileName || 'attachment',
              url: a.url || a.fileUrl || '',
              size: Number(a.size ?? a.sizeBytes ?? 0),
            }))
          : [],
      )
    } else {
      setTitle('')
      setDescription('')
      setTaskType('follow_up')
      setPriority('medium')
      setStatus('pending')
      setStartLocal('')
      setDueLocal('')
      setAssignedTo('')
      setSubtasks([])
      setReminders([])
      setRecurrence({ freq: '', interval: 1, byweekday: [], until: '' })
      setAttachments([])
      setChosenLeadId('')
      setChosenLeadLabel('')
      setLeadSearch('')
    }
    setActivityTab('comments')
    setCommentDraft('')
    setInternalDraft('')
    setAttachmentPreview(null)
  }, [open, task])

  const subPayload = useMemo(
    () =>
      subtasks
        .filter((s) => String(s.title || '').trim())
        .map(({ title: t, done }) => ({ title: String(t).trim(), done: Boolean(done) })),
    [subtasks],
  )

  const recurrencePayload = useMemo(() => {
    if (!recurrence.freq) return null
    const intervalNum = Number(recurrence.interval || 1)
    const interval = Number.isFinite(intervalNum) && intervalNum > 0 ? Math.min(Math.floor(intervalNum), 365) : 1
    const out = { freq: recurrence.freq, interval }
    if (recurrence.until) out.until = dateInputToIso(recurrence.until)
    if (recurrence.freq === 'weekly' && recurrence.byweekday?.length) out.byweekday = recurrence.byweekday
    return out
  }, [recurrence])

  const remindersPayload = useMemo(
    () =>
      reminders
        .map((r) => ({
          remindAt: datetimeLocalToIso(r.remindAt),
          channelPush: Boolean(r.channelPush),
          channelEmail: Boolean(r.channelEmail),
        }))
        .filter((r) => r.remindAt && (r.channelPush || r.channelEmail)),
    [reminders],
  )

  async function handleSave() {
    if (!effectiveLeadId) {
      toast.error('Select a lead for this task.')
      return
    }
    if (!title.trim()) {
      toast.error('Add a task title.')
      return
    }
    if (!startLocal) {
      toast.error('Start date is required.')
      return
    }
    if (!dueLocal) {
      toast.error('End date is required.')
      return
    }
    const dueAt = datetimeLocalToIso(dueLocal)
    const startAt = dateInputToIso(startLocal)
    if (new Date(dueAt) < new Date(startAt)) {
      toast.error('End date must be on or after the start date.')
      return
    }
    const base = {
      title: title.trim(),
      description: description.trim() || null,
      taskType,
      priority,
      startAt,
      dueAt,
      assignedTo: assignedTo || null,
      subtasks: subPayload,
      reminders: remindersPayload,
      recurrenceRule: recurrencePayload,
      attachments,
    }
    try {
      if (isEdit) {
        const res = await patchTask({ id: effectiveLeadId, taskId: task.id, ...base, status }).unwrap()
        toast.success('Task updated')
        onSaved?.(res?.data)
      } else {
        const res = await createTask({ id: effectiveLeadId, ...base, status }).unwrap()
        toast.success('Task created')
        onSaved?.(res?.data)
      }
      onClose()
    } catch (err) {
      const msg = err?.data?.error?.message || 'Could not save the task.'
      toast.error(msg)
    }
  }

  function applyDuePreset(days) {
    const d = new Date()
    d.setDate(d.getDate() + days)
    const pad = (n) => String(n).padStart(2, '0')
    const time = dueLocal && dueLocal.includes('T') ? dueLocal.slice(11, 16) : ''
    setDueLocal(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time || '17:00'}`)
  }

  async function handleAddComment(isInternal) {
    const text = (isInternal ? internalDraft : commentDraft).trim()
    if (!text || !task?.id || !effectiveLeadId) return
    try {
      await addComment({ id: effectiveLeadId, taskId: task.id, body: text, isInternal: Boolean(isInternal) }).unwrap()
      if (isInternal) setInternalDraft('')
      else setCommentDraft('')
      toast.success(isInternal ? 'Note added' : 'Comment added')
    } catch {
      toast.error('Could not add comment.')
    }
  }

  const description2 = isEdit
    ? leadTitle
      ? `Lead: ${leadTitle}`
      : 'Update task details and activity.'
    : isLeadPreset
      ? leadTitle ? `Lead: ${leadTitle}` : 'Create a new task on this lead.'
      : 'Pick a lead and capture a new task.'

  return (
    <>
    <RightDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit task' : 'New task'}
      description={description2}
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
            className="h-10 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-primary-dark)] disabled:opacity-60"
            onClick={handleSave}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create task'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {!isLeadPreset && !isEdit ? (
          <div className="rounded-2xl border border-surface-border bg-white p-4 shadow-sm">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Lead</label>
            {chosenLeadId ? (
              <div className="flex h-11 items-center gap-2.5 rounded-xl border border-brand-200 bg-brand-50/60 px-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[10px] font-bold text-white">
                  {leadInitials(chosenLeadLabel)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{chosenLeadLabel}</span>
                <button
                  type="button"
                  onClick={() => {
                    setChosenLeadId('')
                    setChosenLeadLabel('')
                    setLeadSearch('')
                  }}
                  className="shrink-0 rounded-lg p-1 text-ink-muted hover:bg-white hover:text-ink"
                  aria-label="Change lead"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <input
                  autoFocus
                  className="h-11 w-full rounded-xl border border-surface-border bg-white px-3 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
                  placeholder="Search lead by name or email…"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                />
                {leadSearch.trim().length >= 1 && leadsList.length > 0 ? (
                  <ul className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-surface-border bg-white shadow-md">
                    {leadsList.map((lead) => {
                      const label = lead.title || lead.contactName || lead.email || 'Untitled lead'
                      return (
                        <li key={lead.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setChosenLeadId(lead.id)
                              setChosenLeadLabel(label)
                              setLeadSearch('')
                            }}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-ink hover:bg-brand-50"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-ink-muted">
                              {leadInitials(label)}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{label}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ) : leadSearch.trim().length >= 1 && !leadsFetching ? (
                  <p className="mt-1.5 text-xs text-ink-faint">No leads found.</p>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        <SectionCard icon={ClipboardList} title="Basics">
          <div>
            <input
              autoFocus={!isEdit && isLeadPreset}
              aria-label="Task title"
              className="h-12 w-full rounded-xl border border-surface-border px-3 text-base font-semibold outline-none ring-brand-500/20 placeholder:font-normal placeholder:text-ink-faint focus:border-brand-400 focus:ring-2"
              placeholder="Task title — e.g. Send proposal follow-up"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <textarea
              aria-label="Description"
              className="min-h-[72px] w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
              placeholder="Add description, context, or links…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Priority</label>
            <PriorityPicker value={priority} onChange={setPriority} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Status</label>
            <StatusPicker value={status} onChange={setStatus} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Assign to</label>
              <select
                className="h-11 w-full rounded-xl border border-surface-border bg-white px-3 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">Unassigned</option>
                {assignUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Calendar} title="Schedule">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Start date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                required
                aria-required="true"
                className="h-11 w-full rounded-xl border border-surface-border px-3 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
                End date &amp; time <span className="text-danger">*</span>
              </label>
              <input
                type="datetime-local"
                required
                aria-required="true"
                min={startLocal ? `${startLocal}T00:00` : undefined}
                className="h-11 w-full rounded-xl border border-surface-border px-3 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
                value={dueLocal}
                onChange={(e) => setDueLocal(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-ink-muted">End date presets:</span>
            {[
              { label: 'Today', days: 0 },
              { label: 'Tomorrow', days: 1 },
              { label: 'Next week', days: 7 },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyDuePreset(p.days)}
                className="rounded-full border border-surface-border bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-muted transition hover:border-brand-300 hover:text-brand-700"
              >
                {p.label}
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          icon={Bell}
          title="Reminders"
          hint="Push and email only"
          collapsible
          defaultOpen={Boolean(task?.reminders?.length)}
          badge={reminders.length ? String(reminders.length) : null}
        >
          <div className="space-y-2">
            {reminders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-surface-border bg-slate-50/40 px-3 py-3 text-xs text-ink-muted">
                No reminders. Add one to nudge yourself or the assignee before the due time.
              </p>
            ) : (
              reminders.map((r, idx) => (
                <div key={r.key} className="flex flex-wrap items-center gap-2 rounded-xl border border-surface-border bg-white p-2">
                  <Clock className="ml-1 h-3.5 w-3.5 shrink-0 text-brand-600" />
                  <input
                    type="datetime-local"
                    className="h-9 flex-1 min-w-[180px] rounded-lg border border-surface-border bg-white px-2 text-sm outline-none focus:border-brand-400"
                    value={r.remindAt}
                    onChange={(e) =>
                      setReminders((prev) => prev.map((x, i) => (i === idx ? { ...x, remindAt: e.target.value } : x)))
                    }
                  />
                  <label className="inline-flex items-center gap-1 rounded-lg border border-surface-border bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-ink">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-brand-600"
                      checked={r.channelPush}
                      onChange={(e) =>
                        setReminders((prev) => prev.map((x, i) => (i === idx ? { ...x, channelPush: e.target.checked } : x)))
                      }
                    />
                    Push
                  </label>
                  <label className="inline-flex items-center gap-1 rounded-lg border border-surface-border bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-ink">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-brand-600"
                      checked={r.channelEmail}
                      onChange={(e) =>
                        setReminders((prev) => prev.map((x, i) => (i === idx ? { ...x, channelEmail: e.target.checked } : x)))
                      }
                    />
                    <Mail className="h-3 w-3" /> Email
                  </label>
                  <button
                    type="button"
                    aria-label="Remove reminder"
                    className="ml-auto rounded-lg p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600"
                    onClick={() => setReminders((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-brand-800 hover:bg-slate-50"
            onClick={() =>
              setReminders((prev) => [
                ...prev,
                { key: crypto.randomUUID(), remindAt: '', channelPush: true, channelEmail: true },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" /> Add reminder
          </button>
        </SectionCard>

        <SectionCard
          icon={Repeat}
          title="Recurrence"
          collapsible
          defaultOpen={Boolean(task?.recurrenceRule?.freq || task?.recurrenceRule)}
          badge={recurrence.freq ? RECURRENCE_FREQ_OPTIONS.find((o) => o.value === recurrence.freq)?.label : null}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Repeat</label>
              <select
                className="h-11 w-full rounded-xl border border-surface-border bg-white px-3 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
                value={recurrence.freq}
                onChange={(e) => setRecurrence((r) => ({ ...r, freq: e.target.value }))}
              >
                {RECURRENCE_FREQ_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {recurrence.freq ? (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Every</label>
                  <input
                    type="number"
                    min={1}
                    className="h-11 w-full rounded-xl border border-surface-border px-3 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
                    value={recurrence.interval}
                    onChange={(e) => setRecurrence((r) => ({ ...r, interval: Math.max(1, Number(e.target.value) || 1) }))}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Until (optional)</label>
                  <input
                    type="date"
                    className="h-11 w-full rounded-xl border border-surface-border px-3 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
                    value={recurrence.until}
                    onChange={(e) => setRecurrence((r) => ({ ...r, until: e.target.value }))}
                  />
                </div>
              </>
            ) : null}
          </div>
          {recurrence.freq === 'weekly' ? (
            <div className="mt-3">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Weekdays</span>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_LABELS.map((label, i) => {
                  const active = recurrence.byweekday?.includes(i)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setRecurrence((r) => {
                          const next = new Set(r.byweekday || [])
                          if (next.has(i)) next.delete(i)
                          else next.add(i)
                          return { ...r, byweekday: Array.from(next).sort((a, b) => a - b) }
                        })
                      }
                      className={`h-8 w-8 rounded-full text-xs font-semibold transition ${
                        active
                          ? 'border border-brand-500 bg-slate-100 text-brand-700'
                          : 'border border-surface-border bg-white text-ink-muted hover:border-brand-300'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
          {recurrence.freq ? (
            <p className="mt-2 text-[11px] text-ink-muted">
              The next occurrence is created automatically when this task is marked completed.
            </p>
          ) : null}
        </SectionCard>

        <SectionCard
          icon={Paperclip}
          title="Attachments"
          hint="PDFs, quotations, screenshots, recordings"
          collapsible
          defaultOpen={Boolean(task?.attachments?.length)}
          badge={attachments.length ? String(attachments.length) : null}
        >
          <div className="space-y-2">
            {attachments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-surface-border bg-slate-50/40 px-3 py-3 text-xs text-ink-muted">
                No attachments yet.
              </p>
            ) : (
              attachments.map((a, idx) => (
                <div
                  key={`${a.url}-${idx}`}
                  className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-brand-700" />
                  <button
                    type="button"
                    disabled={!a.url}
                    className="min-w-0 flex-1 truncate text-left font-medium text-brand-900 hover:text-brand-700 disabled:opacity-50"
                    onClick={() => {
                      const row = normalizeTaskAttachmentForPreview(
                        { filename: a.filename, fileUrl: a.url, url: a.url, size: a.size },
                        idx,
                      )
                      if (row) setAttachmentPreview(row)
                    }}
                  >
                    {a.filename}
                  </button>
                  {a.url ? (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-md p-1 text-brand-800/80 hover:bg-brand-100"
                      title="Open in new tab"
                      aria-label="Open in new tab"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                  <button
                    type="button"
                    aria-label="Remove attachment"
                    className="rounded-md p-1 text-brand-700/80 hover:bg-red-50 hover:text-red-600"
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-brand-800 hover:bg-slate-50"
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Add attachment
          </button>
        </SectionCard>

        <SectionCard
          icon={ListChecks}
          title="Subtasks"
          collapsible
          defaultOpen={Boolean(task?.subtasks?.length)}
          badge={subtasks.length ? `${subtasks.filter((s) => s.done).length}/${subtasks.length}` : null}
        >
          <div className="space-y-2">
            {subtasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-surface-border bg-slate-50/40 px-3 py-3 text-xs text-ink-muted">
                Break this task into steps. Press Enter to add the next one quickly.
              </p>
            ) : null}
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
                  autoFocus={!row.title && idx === subtasks.length - 1}
                  className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none focus:border-brand-200"
                  placeholder="Subtask title"
                  value={row.title}
                  onChange={(e) =>
                    setSubtasks((prev) => prev.map((s, i) => (i === idx ? { ...s, title: e.target.value } : s)))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (idx === subtasks.length - 1 && String(row.title).trim()) {
                        setSubtasks((prev) => [...prev, { key: crypto.randomUUID(), title: '', done: false }])
                      }
                    }
                  }}
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
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-brand-800 hover:bg-slate-50"
            onClick={() =>
              setSubtasks((prev) => [...prev, { key: crypto.randomUUID(), title: '', done: false }])
            }
          >
            <Plus className="h-3.5 w-3.5" /> Add subtask
          </button>
        </SectionCard>

        {isEdit ? (
          <ActivitySection
            taskId={task.id}
            leadId={effectiveLeadId}
            tab={activityTab}
            onTab={setActivityTab}
            commentDraft={commentDraft}
            onCommentDraft={setCommentDraft}
            internalDraft={internalDraft}
            onInternalDraft={setInternalDraft}
            onAddComment={handleAddComment}
            commenting={commenting}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-surface-border bg-slate-50/50 px-3 py-2 text-xs text-ink-muted">
            Save the task first to view comments, internal notes, and timeline.
          </p>
        )}
      </div>

      <AttachmentPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        existing={attachments}
        maxAttachments={10}
        leadId={effectiveLeadId || null}
        onConfirm={(items) => setAttachments((prev) => [...prev, ...items])}
      />
    </RightDrawer>
    <DocumentPreviewDialog
      document={attachmentPreview}
      onClose={() => setAttachmentPreview(null)}
      zOverlayClass="z-[160]"
      zPanelClass="z-[161]"
    />
    </>
  )
}

function SectionCard({ icon: Icon, title, hint, badge, collapsible = false, defaultOpen = true, children }) {
  const [expanded, setExpanded] = useState(collapsible ? defaultOpen : true)
  const headerInner = (
    <>
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-brand-600" aria-hidden /> : null}
      <span>{title}</span>
      {badge ? (
        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 ring-1 ring-brand-200">
          {badge}
        </span>
      ) : null}
      {hint ? <span className="hidden truncate text-[11px] font-normal text-ink-muted sm:inline">· {hint}</span> : null}
    </>
  )
  return (
    <div className="rounded-2xl border border-surface-border bg-white shadow-sm">
      {collapsible ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-ink transition hover:bg-slate-50/70"
        >
          {headerInner}
          <ChevronDown
            className={`ml-auto h-4 w-4 shrink-0 text-ink-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      ) : (
        <div className="flex items-center gap-2 px-4 pt-4 text-sm font-semibold text-ink">{headerInner}</div>
      )}
      <div className={`${expanded ? '' : 'hidden'} space-y-3 px-4 pb-4 ${collapsible ? '' : 'pt-3'}`}>{children}</div>
    </div>
  )
}

function ActivitySection({
  taskId,
  leadId,
  tab,
  onTab,
  commentDraft,
  onCommentDraft,
  internalDraft,
  onInternalDraft,
  onAddComment,
  commenting,
}) {
  const { data: timelineRes, isFetching } = useGetLeadTaskTimelineQuery(
    { id: leadId, taskId },
    { skip: !leadId || !taskId },
  )
  const items = useMemo(() => (Array.isArray(timelineRes?.data) ? timelineRes.data : []), [timelineRes])
  const comments = useMemo(() => items.filter((it) => it.kind === 'comment'), [items])
  const notes = useMemo(() => items.filter((it) => it.kind === 'note'), [items])

  return (
    <div className="rounded-2xl border border-surface-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <MessageSquarePlus className="h-4 w-4 text-brand-600" aria-hidden />
        <span>Activity</span>
      </div>
      <div className="mb-3 inline-flex rounded-xl border border-surface-border bg-slate-50 p-1">
        {[
          { id: 'comments', label: 'Comments' },
          { id: 'notes', label: 'Internal notes' },
          { id: 'timeline', label: 'Timeline' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.id ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'comments' ? (
        <ListThread
          isFetching={isFetching}
          items={comments}
          emptyText="No comments yet."
          renderBody={(it) => <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{it.body}</p>}
        />
      ) : null}
      {tab === 'notes' ? (
        <ListThread
          isFetching={isFetching}
          items={notes}
          emptyText="No internal notes yet. These are visible only to your team."
          accent="amber"
          renderBody={(it) => <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{it.body}</p>}
        />
      ) : null}
      {tab === 'timeline' ? (
        <ListThread
          isFetching={isFetching}
          items={items}
          emptyText="No activity yet."
          renderBody={(it) =>
            it.kind === 'event' ? (
              <p className="mt-1 text-sm text-ink-muted">{it.body || it.action || 'Update'}</p>
            ) : (
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                {it.body}
                {it.kind === 'note' ? <span className="ml-2 rounded bg-amber-50 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Internal</span> : null}
              </p>
            )
          }
        />
      ) : null}

      {tab !== 'timeline' ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <textarea
            className="min-h-[64px] flex-1 rounded-xl border border-surface-border px-3 py-2 text-sm outline-none ring-brand-500/20 focus:border-brand-400 focus:ring-2"
            placeholder={tab === 'notes' ? 'Add an internal note (only your team will see it)…' : 'Write a comment…'}
            value={tab === 'notes' ? internalDraft : commentDraft}
            onChange={(e) => (tab === 'notes' ? onInternalDraft(e.target.value) : onCommentDraft(e.target.value))}
          />
          <button
            type="button"
            disabled={commenting || (tab === 'notes' ? !internalDraft.trim() : !commentDraft.trim())}
            className={`h-10 shrink-0 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50 ${
              tab === 'notes' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'
            }`}
            onClick={() => onAddComment(tab === 'notes')}
          >
            {commenting ? 'Posting…' : tab === 'notes' ? 'Add note' : 'Post'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ListThread({ items, emptyText, isFetching, renderBody, accent }) {
  if (isFetching && !items.length) {
    return (
      <div className="rounded-xl border border-surface-border bg-slate-50/80 p-3 text-center text-xs text-ink-muted">
        Loading…
      </div>
    )
  }
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border bg-slate-50/40 p-4 text-center text-xs text-ink-muted">
        {emptyText}
      </div>
    )
  }
  return (
    <div className="scrollbar-subtle max-h-64 space-y-2 overflow-y-auto rounded-xl border border-surface-border bg-slate-50/60 p-3">
      {items.map((it) => (
        <div
          key={it.id}
          className={`rounded-lg border bg-white px-3 py-2 shadow-sm ${
            accent === 'amber' ? 'border-amber-100' : 'border-white'
          }`}
        >
          <div className="flex items-center justify-between gap-2 text-[11px] text-ink-muted">
            <span className="font-medium text-ink">
              {it.author?.name || it.author?.email || (it.kind === 'event' ? 'System' : 'User')}
            </span>
            <span>{fmtDateTime(it.createdAt)}</span>
          </div>
          {renderBody(it)}
        </div>
      ))}
    </div>
  )
}

export { StatusPill as TaskStatusPill }

// Re-export for usage outside (visual badges in lists).
export function TaskPriorityIcon({ priority }) {
  const map = {
    low: 'text-slate-400',
    medium: 'text-amber-500',
    high: 'text-brand-700',
    urgent: 'text-red-600',
  }
  return <Flag className={`h-3.5 w-3.5 fill-current ${map[priority] || map.medium}`} strokeWidth={1.5} />
}

export function TaskOverdueBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
      <AlertTriangle className="h-3 w-3" /> Overdue
    </span>
  )
}

export function TaskRecurrenceIcon({ rule, className = '' }) {
  if (!rule) return null
  const interval = rule.interval || 1
  const label =
    rule.freq === 'daily'
      ? interval === 1 ? 'Daily' : `Every ${interval} days`
      : rule.freq === 'weekly'
        ? interval === 1 ? 'Weekly' : `Every ${interval} weeks`
        : rule.freq === 'monthly'
          ? interval === 1 ? 'Monthly' : `Every ${interval} months`
          : 'Recurring'
  return (
    <span title={label} className={`inline-flex items-center gap-1 text-[10px] font-semibold text-brand-700 ${className}`}>
      <Repeat className="h-3 w-3" />
      {label}
    </span>
  )
}

// Internal helpers re-exported for tests / external composition.
export const __internal = { fmtDateTime, datetimeLocalToIso, dateInputToIso, toDatetimeLocalValue, toDateInputValue }
