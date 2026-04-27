import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import {
  Bold,
  CalendarCheck2,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  Italic,
  Link2,
  Mail,
  MessageSquare,
  NotebookPen,
  Paperclip,
  PhoneCall,
  Smile,
  Sparkles,
  UserCircle2,
} from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { LeadFollowupsTab } from '@/features/leads/components/LeadFollowupsTab'
import { LeadRichNotesEditor } from '@/features/leads/components/LeadRichNotesEditor'
import { LeadTaskDrawer, taskTypeLabel } from '@/features/leads/components/LeadTaskDrawer'
import { LeadStatusBadge } from '@/features/leads/components/LeadStatusBadge'
import { LeadScorePill } from '@/features/leads/components/LeadScorePill'
import { LeadSourceTag } from '@/features/leads/components/LeadSourceTag'
import { LeadTagsInput } from '@/features/leads/components/LeadTagsInput'
import {
  useCreateLeadActivityMutation,
  useCreateLeadNoteMutation,
  useDeleteLeadNoteMutation,
  useDeleteLeadTaskMutation,
  useGetGoogleEmailStatusQuery,
  useGetLeadActivitiesQuery,
  useGetLeadEmailThreadQuery,
  useGetLeadEmailThreadsQuery,
  useGetLeadFilesQuery,
  useGetLeadNotesQuery,
  useGetLeadQuery,
  useGetLeadTasksQuery,
  usePatchLeadNoteMutation,
  usePatchLeadStatusMutation,
  usePatchLeadTaskMutation,
  useSendLeadEmailMutation,
  useSyncLeadEmailsMutation,
  useUpdateLeadMutation,
} from '@/features/leads/leadsApi'
import { STATUS_OPTIONS } from '@/features/leads/constants'
import GmailThreadList from '@/features/gmail/GmailThreadList'
import GmailThreadView from '@/features/gmail/GmailThreadView'
import { parseStoredThread } from '@/features/gmail/gmailParserUtils'

const NOTE_HTML = {
  ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'a', 'img'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt'],
}

function sanitizeNoteBody(html) {
  return DOMPurify.sanitize(html || '', NOTE_HTML)
}

function notePlainText(html) {
  const div = document.createElement('div')
  div.innerHTML = sanitizeNoteBody(html)
  return (div.textContent || '').trim()
}

function noteBodyToInitialHtml(body) {
  const raw = (body || '').trim()
  if (!raw) return ''
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw
  return raw
    .split('\n')
    .map((line) => {
      const esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return `<p>${esc || '<br>'}</p>`
    })
    .join('')
}

function activityPlainBody(value) {
  if (!value) return ''
  const text = notePlainText(String(value))
  return text || String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function isSystemNoteActivity(activity) {
  const action = activity?.metadata?.action
  return action === 'note_added' || action === 'note_updated' || action === 'note_deleted'
}

const ACTIVITY_STYLE = {
  note: {
    label: 'Note',
    Icon: NotebookPen,
    iconWrap: 'bg-amber-100 text-amber-700',
    chip: 'border-amber-200 bg-amber-50 text-amber-800',
    card: 'border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-white',
  },
  email: {
    label: 'Email',
    Icon: Mail,
    iconWrap: 'bg-blue-100 text-blue-700',
    chip: 'border-blue-200 bg-blue-50 text-blue-800',
    card: 'border-blue-200/70 bg-gradient-to-b from-blue-50/80 to-white',
  },
  call: {
    label: 'Call',
    Icon: PhoneCall,
    iconWrap: 'bg-emerald-100 text-emerald-700',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    card: 'border-emerald-200/70 bg-gradient-to-b from-emerald-50/80 to-white',
  },
  meeting: {
    label: 'Meeting',
    Icon: CalendarCheck2,
    iconWrap: 'bg-fuchsia-100 text-fuchsia-700',
    chip: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800',
    card: 'border-fuchsia-200/70 bg-gradient-to-b from-fuchsia-50/80 to-white',
  },
  task: {
    label: 'Task',
    Icon: CheckSquare,
    iconWrap: 'bg-violet-100 text-violet-700',
    chip: 'border-violet-200 bg-violet-50 text-violet-800',
    card: 'border-violet-200/70 bg-gradient-to-b from-violet-50/80 to-white',
  },
  system: {
    label: 'Activity',
    Icon: Sparkles,
    iconWrap: 'bg-slate-100 text-slate-700',
    chip: 'border-slate-200 bg-slate-50 text-slate-700',
    card: 'border-surface-border bg-white',
  },
}

function activityPresentation(activityType) {
  return ACTIVITY_STYLE[activityType] || ACTIVITY_STYLE.system
}

function formatTaskDueParts(value) {
  if (!value) return { dateLine: '—', timeLine: null }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return { dateLine: '—', timeLine: null }
  const dateLine = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const timeLine = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return { dateLine, timeLine }
}

function activityDayKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function activityDayLabel(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

function activityTimeLabel(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const parts = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).formatToParts(date)
  const piece = (type) => parts.find((part) => part.type === type)?.value || ''
  const hour = piece('hour')
  const minute = piece('minute')
  const second = piece('second')
  const dayPeriod = (piece('dayPeriod') || '').toLowerCase()
  const tz = piece('timeZoneName')
  return `${hour}:${minute}:${second}${dayPeriod} ${tz}`.trim()
}

function activityDateTimeLabel(value) {
  return `${activityDayLabel(value)}, ${activityTimeLabel(value)}`
}

export function LeadDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('activity')
  const [profileInfoTab, setProfileInfoTab] = useState('lead')
  const [draft, setDraft] = useState('')
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false)
  const [taskDrawerTaskId, setTaskDrawerTaskId] = useState(null)
  const [noteTitle, setNoteTitle] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailTo, setEmailTo] = useState('')
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState(null)
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState([])
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [noteEditorVersion, setNoteEditorVersion] = useState(0)
  const [lostReason, setLostReason] = useState('')

  const { data, isLoading } = useGetLeadQuery(id)
  const { data: activityData } = useGetLeadActivitiesQuery({ id, page: 1, limit: 100 }, { skip: !id })
  const { data: taskData } = useGetLeadTasksQuery(id, { skip: !id })
  const { data: emailThreadsData } = useGetLeadEmailThreadsQuery(id, { skip: !id })
  const { data: threadData } = useGetLeadEmailThreadQuery({ id, threadId: selectedThreadId }, { skip: !id || !selectedThreadId })
  const { data: notesData } = useGetLeadNotesQuery(id, { skip: !id })
  const { data: filesData } = useGetLeadFilesQuery(id, { skip: !id })
  const { data: googleEmailStatus } = useGetGoogleEmailStatusQuery()

  const [createActivity, { isLoading: creatingActivity }] = useCreateLeadActivityMutation()
  const [createNote, { isLoading: creatingNote }] = useCreateLeadNoteMutation()
  const [patchNote, { isLoading: patchingNote }] = usePatchLeadNoteMutation()
  const [deleteNote] = useDeleteLeadNoteMutation()
  const [sendLeadEmail, { isLoading: sendingEmail }] = useSendLeadEmailMutation()
  const [syncLeadEmails, { isLoading: syncingEmails }] = useSyncLeadEmailsMutation()
  const [patchTask] = usePatchLeadTaskMutation()
  const [deleteTask] = useDeleteLeadTaskMutation()
  const [patchStatus] = usePatchLeadStatusMutation()
  const [updateLead] = useUpdateLeadMutation()

  const lead = data?.data
  const summary = data?.meta?.summary || {}
  const activities = activityData?.data || []
  const tasks = taskData?.data || []
  const emailThreads = emailThreadsData?.data || []
  const selectedThread = threadData?.data || []
  const notes = notesData?.data || []
  const leadFiles = filesData?.data || []
  const tabs = [
    { id: 'activity', label: 'Activity' },
    { id: 'calls', label: 'Calls' },
    { id: 'emails', label: 'Emails' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'followups', label: 'Follow-ups' },
    { id: 'notes', label: 'Notes' },
  ]
  const emailTimeLabel = (value) => {
    if (!value) return '-'
    const date = new Date(value)
    return date.toLocaleString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const parsedThreads = useMemo(
    () =>
      emailThreads.map((thread) => ({
        ...thread,
        id: thread.threadId,
        messages: [],
        participants: [],
        messageCount: thread.count || 0,
        hasAttachments: false,
        lastDateFormatted: emailTimeLabel(thread.lastMessageAt),
        snippet: thread.preview || '',
        lastMessage: { from: { name: 'Unknown', email: '', initials: '??' } },
      })),
    [emailThreads],
  )
  const parsedSelectedThread = useMemo(() => parseStoredThread(selectedThread), [selectedThread])
  const activeThread = selectedThreadId ? parsedSelectedThread : null
  const drawerTask = useMemo(
    () => (taskDrawerTaskId ? tasks.find((t) => t.id === taskDrawerTaskId) ?? null : null),
    [taskDrawerTaskId, tasks],
  )


  const visibleActivities = useMemo(() => activities.filter((activity) => !isSystemNoteActivity(activity)), [activities])

  const filteredActivities = useMemo(() => {
    if (activeTab === 'activity') return visibleActivities
    if (activeTab === 'calls') return visibleActivities.filter((x) => x.type === 'call')
    if (activeTab === 'emails') return visibleActivities.filter((x) => x.type === 'email')
    if (activeTab === 'notes') return visibleActivities.filter((x) => x.type === 'note')
    return visibleActivities
  }, [activeTab, visibleActivities])

  const fullName = lead?.contactName || lead?.title || 'Lead'
  const avatarLetter = String(fullName).charAt(0).toUpperCase()
  const firstMeaningfulActivity = activities.find((activity) => ['note', 'call', 'email', 'meeting'].includes(activity.type))
  const lastActivityAt = summary.lastContactAt || firstMeaningfulActivity?.createdAt || lead?.updatedAt || lead?.createdAt
  const formattedPhone = `${lead?.phoneCountryCode || ''} ${lead?.phone || ''}`.trim() || '-'
  const formattedValue = `₹${Number(lead?.value || 0).toLocaleString('en-IN')}`
  const leadOwnerName =
    (lead?.assignedUsers || []).map((user) => user?.name).filter(Boolean).join(', ') || lead?.assignee?.name || lead?.owner?.name || '-'
  const addressLine = [lead?.street, lead?.city, lead?.state, lead?.country, lead?.postalCode].filter(Boolean).join(', ') || '-'

  useEffect(() => {
    if (lead?.email) setEmailTo((prev) => prev || lead.email)
  }, [lead?.email])

  const saveLeadNoteFromEditor = useCallback(
    async ({ title, html }) => {
      const body = sanitizeNoteBody(html)
      if (!notePlainText(html)) return
      if (editingNoteId) {
        await patchNote({ id, noteId: editingNoteId, title: title.trim(), body }).unwrap()
        setEditingNoteId(null)
      } else {
        await createNote({ id, title: title.trim(), body }).unwrap()
      }
      setNoteTitle('')
      setDraft('')
      setNoteEditorVersion((v) => v + 1)
    },
    [createNote, editingNoteId, id, patchNote],
  )

  if (isLoading) return <PageShell fullWidth><div className="px-6 py-6">Loading lead...</div></PageShell>
  if (!lead) return <PageShell fullWidth><div className="px-6 py-6">Lead not found.</div></PageShell>

  async function submitActivity(type) {
    if (!draft.trim()) return
    if (type === 'note') {
      await createNote({ id, title: noteTitle.trim(), body: draft.trim() }).unwrap()
      setNoteTitle('')
    } else {
      await createActivity({ id, type, body: draft.trim() }).unwrap()
    }
    setDraft('')
  }

  async function submitEmail() {
    if (!emailTo.trim() || !emailBody.trim()) return
    const selectedAttachments = leadFiles.filter((file) => selectedAttachmentIds.includes(file.id)).map((file) => ({
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      mimeType: file.mimeType || null,
      sizeBytes: file.sizeBytes || null,
    }))
    await sendLeadEmail({
      id,
      to: emailTo.trim().split(',').map((x) => x.trim()).filter(Boolean),
      subject: emailSubject.trim(),
      bodyHtml: emailBody.trim(),
      attachments: selectedAttachments,
    }).unwrap()
    setEmailSubject('')
    setEmailBody('')
    setSelectedAttachmentIds([])
    setIsComposeOpen(false)
    if (!lead.email) setEmailTo('')
  }

  function appendToBody(text) {
    setEmailBody((prev) => `${prev || ''}${text}`)
  }

  return (
    <PageShell fullWidth>
      <div className="grid gap-2 px-2 py-2 lg:grid-cols-[320px_1fr] lg:px-3 lg:py-2.5">
        <aside className="space-y-3">
          <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
            <div className="p-3.5">
           
              <div className="mt-3.5 flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 text-2xl font-semibold text-violet-700">
                  {avatarLetter}
                </div>
                <p className="mt-2 text-2xl font-semibold text-ink">{fullName}</p>
                <p className="mt-1 text-sm text-ink-muted">{lead.company || lead.designation || 'Lead profile'}</p>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-ink-muted">
                <button type="button" className="rounded-xl border border-surface-border px-2 py-2">Log</button>
                <a href={lead.email ? `mailto:${lead.email}` : undefined} className="rounded-xl border border-surface-border px-2 py-2">Email</a>
                <a href={lead.phone ? `tel:${lead.phone}` : undefined} className="rounded-xl border border-surface-border px-2 py-2">Call</a>
                <button type="button" className="rounded-xl border border-surface-border px-2 py-2">More</button>
              </div>

              <button type="button" className="mt-3 h-10 w-full rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white">
                Convert to contact
              </button>

              <div className="mt-3 flex items-center justify-between">
                <LeadStatusBadge status={lead.status} />
                <p className="text-xs text-ink-muted">
                  Last activity : {lastActivityAt ? new Date(lastActivityAt).toLocaleString() : '-'}
                </p>
              </div>

            </div>

            <div className="border-t border-surface-border">
              <div className="grid grid-cols-2 border-b border-surface-border text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setProfileInfoTab('lead')}
                  className={`px-4 py-3 ${profileInfoTab === 'lead' ? 'border-b-2 border-ink text-ink' : 'text-ink-muted'}`}
                >
                  Leads info
                </button>
                <button
                  type="button"
                  onClick={() => setProfileInfoTab('address')}
                  className={`px-4 py-3 ${profileInfoTab === 'address' ? 'border-b-2 border-ink text-ink' : 'text-ink-muted'}`}
                >
                  Address info
                </button>
              </div>
              <div className="space-y-3 p-4 text-xs">
                {profileInfoTab === 'lead' ? (
                  <>
                    <p><span className="text-ink-muted">Email</span><br /><span className="text-ink">{lead.email || '-'}</span></p>
                    <p><span className="text-ink-muted">Phone</span><br /><span className="text-ink">{formattedPhone}</span></p>
                    <p><span className="text-ink-muted">Lead owner</span><br /><span className="text-ink">{leadOwnerName}</span></p>
                    <p><span className="text-ink-muted">Job Title</span><br /><span className="text-ink">{lead.designation || '-'}</span></p>
                    <p><span className="text-ink-muted">Annual revenue</span><br /><span className="text-ink">{formattedValue}</span></p>
                    <p className="flex items-center gap-2"><span className="text-ink-muted">Lead source</span> <LeadSourceTag source={lead.source} /></p>
                    <p><span className="text-ink-muted">Open tasks</span><br /><span className="text-ink">{summary.openTasks ?? 0}</span></p>
                    <p><span className="text-ink-muted">Completed tasks</span><br /><span className="text-ink">{summary.completedTasks ?? 0}</span></p>
                    <div className="pt-1">
                      <LeadScorePill score={lead.score || 0} showBar />
                    </div>
                  </>
                ) : (
                  <>
                    <p><span className="text-ink-muted">Street</span><br /><span className="text-ink">{lead.street || '-'}</span></p>
                    <p><span className="text-ink-muted">City</span><br /><span className="text-ink">{lead.city || '-'}</span></p>
                    <p><span className="text-ink-muted">State</span><br /><span className="text-ink">{lead.state || '-'}</span></p>
                    <p><span className="text-ink-muted">Country</span><br /><span className="text-ink">{lead.country || '-'}</span></p>
                    <p><span className="text-ink-muted">Postal code</span><br /><span className="text-ink">{lead.postalCode || '-'}</span></p>
                    <p><span className="text-ink-muted">Full address</span><br /><span className="text-ink">{addressLine}</span></p>
                  </>
                )}
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-surface-border p-3.5">
            <p className="text-sm font-semibold text-ink">Tags</p>
            <div className="mt-1.5">
              <LeadTagsInput value={(lead.tags || []).map((tag) => tag.name)} onChange={(tags) => updateLead({ id, tags })} />
            </div>
          </section>
        </aside>

        <section className="rounded-2xl border border-surface-border bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2 border-b border-surface-border pb-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id)
                  setEditingNoteId(null)
                  setDraft('')
                  setNoteTitle('')
                  setNoteEditorVersion((v) => v + 1)
                }}
                className={`h-9 border-b-2 px-3 text-sm ${
                  activeTab === tab.id
                    ? 'border-brand-600 bg-white font-semibold text-ink'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'emails' ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr]">
              <section className="overflow-hidden rounded-xl border border-surface-border bg-white lg:h-[660px]">
                <div className="h-full overflow-y-auto">
                  <GmailThreadList
                    threads={parsedThreads}
                    selectedId={selectedThreadId}
                    onSelect={setSelectedThreadId}
                  />
                </div>
              </section>
              <section className="overflow-hidden rounded-xl border border-surface-border bg-white">
                <GmailThreadView
                  thread={activeThread}
                  onBack={() => setSelectedThreadId(null)}
                  onSync={() => syncLeadEmails({ id })}
                  onCreateEmail={() => setIsComposeOpen(true)}
                />
              </section>
            </div>
          ) : activeTab === 'tasks' ? (
            <div className="mt-4 space-y-3">
              {tasks.map((task) => {
                const subs = task.subtasks || []
                const commentCount = (task.comments || []).length
                const dueAt = task.dueAt ? new Date(task.dueAt) : null
                const dueParts = formatTaskDueParts(task.dueAt)
                const isOverdue = Boolean(dueAt && task.status !== 'completed' && dueAt.getTime() < Date.now())
                return (
                  <div
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setTaskDrawerTaskId(task.id)
                        setTaskDrawerOpen(true)
                      }
                    }}
                    onClick={() => {
                      setTaskDrawerTaskId(task.id)
                      setTaskDrawerOpen(true)
                    }}
                    className="w-full cursor-pointer rounded-2xl border border-surface-border bg-white text-left shadow-sm ring-1 ring-slate-100/80 transition hover:border-brand-200 hover:shadow-md"
                  >
                    <div className="border-b border-surface-border bg-slate-50/60 px-4 py-2.5 sm:px-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-900">
                            {taskTypeLabel(task.taskType)}
                          </span>
                          <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            {task.priority}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              task.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-900'
                                : task.status === 'open'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {task.status !== 'completed' ? (
                            <button
                              type="button"
                              className="h-8 rounded-lg border border-brand-300 bg-white px-3 text-xs font-semibold text-brand-800 shadow-sm hover:bg-brand-50"
                              onClick={async () => {
                                await patchTask({ id, taskId: task.id, status: 'completed' }).unwrap()
                              }}
                            >
                              Mark complete
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                            onClick={async () => {
                              await deleteTask({ id, taskId: task.id }).unwrap()
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 px-4 py-4 sm:px-5">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Task</p>
                        <p className="mt-0.5 text-base font-semibold leading-snug text-ink">{task.title}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-3 shadow-sm">
                          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                            <UserCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Assigned to
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{task.assignee?.name || 'Unassigned'}</p>
                          <p className="mt-0.5 text-[11px] text-ink-muted">Owner responsible for this task</p>
                        </div>
                        <div
                          className={`rounded-xl border p-3 shadow-sm ${
                            isOverdue
                              ? 'border-red-200 bg-gradient-to-b from-red-50/90 to-white'
                              : 'border-slate-200 bg-gradient-to-b from-white to-slate-50/80'
                          }`}
                        >
                          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                            <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Due date
                          </p>
                          <p className={`mt-2 text-sm font-semibold ${isOverdue ? 'text-red-800' : 'text-slate-900'}`}>{dueParts.dateLine}</p>
                          {dueParts.timeLine ? <p className="mt-0.5 text-[11px] text-ink-muted">{dueParts.timeLine}</p> : null}
                          {isOverdue ? <p className="mt-1.5 text-[11px] font-medium text-red-700">Overdue</p> : null}
                        </div>
                      </div>
                      {task.description ? (
                        <div className="rounded-xl border border-surface-border bg-slate-50/40 px-3 py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Description</p>
                          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-700">{task.description}</p>
                        </div>
                      ) : null}
                      {subs.length ? (
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Checklist</p>
                          <ul className="mt-2 space-y-1.5">
                            {subs.slice(0, 5).map((subtask, index) => (
                              <li key={`${task.id}-sub-${index}`}>
                                <label className="flex cursor-pointer items-start gap-2 rounded-lg py-0.5 text-xs text-slate-700">
                                  <input type="checkbox" checked={Boolean(subtask.done)} readOnly className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300" />
                                  <span className={subtask.done ? 'text-ink-muted line-through' : ''}>{subtask.title || 'Untitled'}</span>
                                </label>
                              </li>
                            ))}
                          </ul>
                          {subs.length > 5 ? <p className="mt-1.5 text-[11px] text-ink-muted">+{subs.length - 5} more in task details</p> : null}
                        </div>
                      ) : null}
                      {commentCount > 0 ? (
                        <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                          {commentCount} comment{commentCount === 1 ? '' : 's'}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )
              })}
              {tasks.length === 0 ? <p className="text-sm text-ink-muted">No tasks yet. Use Add task to create one.</p> : null}
            </div>
          ) : activeTab === 'followups' ? (
            <LeadFollowupsTab leadId={id} />
          ) : activeTab === 'notes' ? (
            <div className="mt-4 space-y-8">
              <LeadRichNotesEditor
                key={`${editingNoteId || 'new'}-${noteEditorVersion}`}
                editorKey={`${editingNoteId || 'new'}-${noteEditorVersion}`}
                title={noteTitle}
                onTitleChange={setNoteTitle}
                initialHtml={draft}
                isEditing={Boolean(editingNoteId)}
                saving={creatingNote || patchingNote}
                onSave={saveLeadNoteFromEditor}
              />
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">Your notes</p>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {notes.map((note) => {
                    const noteHtml = sanitizeNoteBody(noteBodyToInitialHtml(note.body || ''))
                    const hasRenderableBody = Boolean(notePlainText(note.body || '').trim())
                    return (
                      <div
                        key={note.id}
                        className="flex flex-col overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-b from-amber-50/90 to-white p-4 shadow-sm ring-1 ring-amber-100/40 transition hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 text-sm font-semibold text-ink line-clamp-1">{note.metadata?.title || 'Note'}</p>
                          <p className="shrink-0 text-[11px] text-ink-muted">{new Date(note.createdAt).toLocaleDateString()}</p>
                        </div>
                        <p className="mt-0.5 text-[11px] text-ink-muted">By {note.user?.name || 'System'}</p>
                        <div className="note-card-preview prose prose-sm mt-3 max-h-[200px] w-full overflow-hidden rounded-xl border border-amber-100/80 bg-white/90 p-3 text-xs leading-relaxed text-ink prose-p:my-1 prose-headings:my-1">
                          {hasRenderableBody ? (
                            <div dangerouslySetInnerHTML={{ __html: noteHtml }} />
                          ) : (
                            <span className="italic text-ink-muted">Empty note</span>
                          )}
                        </div>
                        <div className="mt-3 flex justify-end gap-2 border-t border-amber-100/60 pt-3">
                          <button
                            type="button"
                            className="h-8 rounded-lg border border-surface-border bg-white px-3 text-xs font-medium text-ink hover:bg-slate-50"
                            onClick={() => {
                              setEditingNoteId(note.id)
                              setNoteTitle(note.metadata?.title || '')
                              setDraft(noteBodyToInitialHtml(note.body || ''))
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="h-8 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700 hover:bg-red-100"
                            onClick={async () => {
                              await deleteNote({ id, noteId: note.id }).unwrap()
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {notes.length === 0 ? (
                  <p className="text-sm text-ink-muted">No notes yet. Use the editor above and click Add note.</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-1">
              {filteredActivities.map((activity, index) => {
                const presentation = activityPresentation(activity.type)
                const Icon = presentation.Icon
                const metadata = activity.metadata || {}
                const subtasks = Array.isArray(metadata.subtasks) ? metadata.subtasks : []
                const assignee = metadata.assigneeName || metadata.assignedTo || metadata.assignee || ''
                const isNote = activity.type === 'note'
                const isEmail = activity.type === 'email'
                const isTask = activity.type === 'task'
                const label = presentation.label
                const plainBody = activityPlainBody(activity.body || '')
                const headlineText =
                  isNote
                    ? activity.metadata?.title?.trim() || 'Note added'
                    : isTask
                      ? plainBody || 'Task activity'
                      : plainBody || label
                const currentDayKey = activityDayKey(activity.createdAt)
                const previousDayKey = index > 0 ? activityDayKey(filteredActivities[index - 1].createdAt) : null
                const showDayMarker = index === 0 || currentDayKey !== previousDayKey
                return (
                  <article key={activity.id} className="relative grid grid-cols-[110px_26px_minmax(0,1fr)] gap-2.5 pb-4">
                    <span className="pt-1 text-sm font-semibold text-slate-800">{showDayMarker ? activityDayLabel(activity.createdAt) : ''}</span>
                    <div className="relative flex justify-center">
                      <span className="absolute top-0 bottom-0 w-px bg-slate-200" aria-hidden="true" />
                      <span className={`relative z-10 mt-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-white shadow-sm ${presentation.iconWrap}`}>
                        <Icon size={12} />
                      </span>
                    </div>
                    <div className="pt-1">
                      <p className="text-sm leading-6 text-ink">
                        {headlineText}{' '}
                        <span className="font-semibold text-slate-700">by {activity.user?.name || 'System user'}</span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-muted">{activityDateTimeLabel(activity.createdAt)}</p>
                      {isTask && assignee ? (
                        <div className="mt-2 inline-flex min-w-[220px] items-center rounded-md border border-violet-200 bg-violet-50 px-2 py-1.5 text-[11px] text-violet-900">
                          Assigned to: {assignee}
                        </div>
                      ) : null}
                      {isTask && subtasks.length ? (
                        <div className="mt-2 space-y-1 rounded-md border border-violet-200/80 bg-white p-2">
                          {subtasks.map((subtask, subIndex) => (
                            <label key={`${activity.id}-subtask-${subIndex}`} className="flex items-start gap-2 text-[11px] text-ink-muted">
                              <input type="checkbox" checked={Boolean(subtask.done)} readOnly className="mt-0.5 h-3.5 w-3.5 rounded border-surface-border" />
                              <span className={subtask.done ? 'line-through' : ''}>{subtask.title || 'Untitled subtask'}</span>
                            </label>
                          ))}
                        </div>
                      ) : null}
                      {isNote ? (
                        <div
                          className="prose prose-sm mt-2 max-w-none rounded-md border border-amber-300 bg-amber-50/40 p-2.5 text-xs text-ink prose-p:my-1"
                          dangerouslySetInnerHTML={{ __html: sanitizeNoteBody(noteBodyToInitialHtml(activity.body || '')) }}
                        />
                      ) : null}
                      {isEmail ? (
                        <div className="mt-2 rounded-md border border-blue-200 bg-blue-50/50 p-2 text-[11px] text-blue-900">
                          Professional email activity
                        </div>
                      ) : null}
                    </div>
                  </article>
                )
              })}
              {filteredActivities.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border p-8 text-center">
                  <ClipboardList className="mx-auto h-6 w-6 text-ink-muted" />
                  <p className="mt-2 text-sm font-medium text-ink">No activity yet</p>
                  <p className="text-xs text-ink-muted">Start logging calls, notes, emails, and tasks to build a clean timeline.</p>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'notes' || activeTab === 'activity' || activeTab === 'followups' ? null : (
          <div className="mt-4 rounded-xl border border-surface-border p-3">
            {activeTab === 'tasks' ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-muted">Open the panel to set type, checklist, assignee, and comments.</p>
                <button
                  type="button"
                  className="h-10 shrink-0 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                  onClick={() => {
                    setTaskDrawerTaskId(null)
                    setTaskDrawerOpen(true)
                  }}
                >
                  Add task
                </button>
              </div>
            ) : activeTab === 'emails' ? (
              <div className="space-y-2">
                {!googleEmailStatus?.data?.connected ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm text-amber-900">Google is not connected for this company.</p>
                    <button type="button" className="mt-2 h-9 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white" onClick={() => navigate('/integrations')}>
                      Open Google Settings
                    </button>
                  </div>
                ) : (
                  <div className="mb-1 flex items-center justify-between text-xs text-ink-muted">
                    <p>Connected as {googleEmailStatus?.data?.email || 'Google account'}</p>
                    <div className="flex items-center gap-2">
                      <button type="button" className="rounded border border-surface-border px-2 py-1" disabled={syncingEmails} onClick={() => syncLeadEmails({ id })}>
                        {syncingEmails ? 'Syncing...' : 'Sync replies'}
                      </button>
                      <button type="button" className="rounded border border-brand-200 bg-brand-50 px-2 py-1 text-brand-700" onClick={() => setIsComposeOpen(true)}>
                        Create email
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-xs text-ink-muted">Use "Create email" for compose modal with attachments.</p>
              </div>
            ) : (
              <div className="flex gap-2">
                {activeTab === 'activity' ? (
                  <input
                    className="h-10 w-[200px] rounded-lg border border-surface-border px-3 text-sm"
                    placeholder="Note title"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                  />
                ) : null}
                <input
                  className="h-10 flex-1 rounded-lg border border-surface-border px-3 text-sm"
                  placeholder={activeTab === 'calls' ? 'Log call details' : activeTab === 'emails' ? 'Log email details' : 'Add note'}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button
                  type="button"
                  className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={creatingActivity || creatingNote}
                  onClick={() => submitActivity(activeTab === 'calls' ? 'call' : activeTab === 'emails' ? 'email' : 'note')}
                >
                  Add
                </button>
              </div>
            )}
          </div>
          )}
          <LeadTaskDrawer
            open={taskDrawerOpen}
            onClose={() => {
              setTaskDrawerOpen(false)
              setTaskDrawerTaskId(null)
            }}
            leadId={id}
            task={drawerTask}
            leadTitle={fullName}
          />
          {isComposeOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl">
                <div className="flex items-center justify-between bg-slate-900 px-4 py-2.5 text-white">
                  <p className="text-sm font-semibold">New Message</p>
                  <button type="button" className="rounded border border-white/20 px-2 py-1 text-xs" onClick={() => setIsComposeOpen(false)}>Close</button>
                </div>
                <div className="space-y-0 p-0">
                  <div className="border-b border-surface-border px-4 py-2">
                    <input className="h-9 w-full border-0 px-0 text-sm outline-none" placeholder="To (comma separated emails)" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} />
                  </div>
                  <div className="border-b border-surface-border px-4 py-2">
                    <input className="h-9 w-full border-0 px-0 text-sm outline-none" placeholder="Subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                  </div>
                  <textarea className="min-h-[220px] w-full border-0 px-4 py-3 text-sm outline-none" placeholder="Write email..." value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
                  <div className="flex items-center gap-1 border-t border-surface-border px-3 py-2">
                    <button type="button" className="rounded p-1.5 text-ink-muted hover:bg-surface-subtle hover:text-ink" onClick={() => appendToBody('**bold**')}><Bold size={16} /></button>
                    <button type="button" className="rounded p-1.5 text-ink-muted hover:bg-surface-subtle hover:text-ink" onClick={() => appendToBody('_italic_')}><Italic size={16} /></button>
                    <button type="button" className="rounded p-1.5 text-ink-muted hover:bg-surface-subtle hover:text-ink" onClick={() => appendToBody(' https://')}><Link2 size={16} /></button>
                    <button type="button" className="rounded p-1.5 text-ink-muted hover:bg-surface-subtle hover:text-ink" onClick={() => appendToBody(' 🙂')}><Smile size={16} /></button>
                    <button type="button" className="rounded p-1.5 text-ink-muted hover:bg-surface-subtle hover:text-ink"><Paperclip size={16} /></button>
                  </div>
                  <div className="rounded-lg border border-surface-border p-3">
                    <p className="text-xs font-semibold text-ink">Attachments from lead files</p>
                    <div className="mt-2 max-h-28 space-y-1 overflow-auto text-xs">
                      {leadFiles.map((file) => (
                        <label key={file.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedAttachmentIds.includes(file.id)}
                            onChange={(e) =>
                              setSelectedAttachmentIds((prev) =>
                                e.target.checked ? [...prev, file.id] : prev.filter((id) => id !== file.id),
                              )
                            }
                          />
                          <span>{file.fileName}</span>
                        </label>
                      ))}
                      {leadFiles.length === 0 ? <p className="text-ink-muted">No files uploaded for this lead.</p> : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-surface-border px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-ink-muted">
                    <button type="button" className="rounded border border-surface-border px-2 py-1" onClick={() => appendToBody(' 😀')}>Emoji</button>
                    <button type="button" className="rounded border border-surface-border px-2 py-1" onClick={() => appendToBody('\n\nThanks,\n')}>Signature</button>
                  </div>
                  <div className="flex items-center gap-2">
                  <button type="button" className="h-10 rounded-lg border border-surface-border px-4 text-sm" onClick={() => setIsComposeOpen(false)}>Cancel</button>
                  <button type="button" className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={sendingEmail || !googleEmailStatus?.data?.connected} onClick={submitEmail}>
                    {sendingEmail ? 'Sending...' : 'Send'}
                  </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </PageShell>
  )
}
