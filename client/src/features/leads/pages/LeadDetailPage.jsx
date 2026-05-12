import { useEffect, useMemo, useState, useCallback } from 'react'
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom'
import DOMPurify from 'dompurify'
import toast from 'react-hot-toast'
import {
  BadgeIndianRupee,
  Bell,
  Bold,
  CalendarCheck2,
  CalendarClock,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  Flag,
  Plus,
  Hash,
  Home,
  Italic,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  NotebookPen,
  Paperclip,
  Pencil,
  Phone,
  PhoneCall,
  Presentation,
  Search,
  Smile,
  Sparkles,
  Tag,
  User,
  UserCircle2,
} from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { AddLeadModal } from '@/features/leads/components/AddLeadModal'
import { LeadFollowupsTab } from '@/features/leads/components/LeadFollowupsTab'
import { LeadRichNotesEditor } from '@/features/leads/components/LeadRichNotesEditor'
import {
  LeadTaskDrawer,
  TaskOverdueBadge,
  TaskPriorityIcon,
  TaskRecurrenceIcon,
  TaskStatusPill,
  taskTypeLabel,
} from '@/features/leads/components/LeadTaskDrawer'
import { LeadScorePill } from '@/features/leads/components/LeadScorePill'
import { LeadSourceTag } from '@/features/leads/components/LeadSourceTag'
import { LeadTagsInput } from '@/features/leads/components/LeadTagsInput'
import { LeadDocumentsWorkspace } from '@/features/documents/components/LeadDocumentsWorkspace'
import {
  useCreateLeadActivityMutation,
  useCreateLeadTagMutation,
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
  useGetLeadsQuery,
  useGetLeadTasksQuery,
  useGetLeadFormMetaQuery,
  usePatchLeadNoteMutation,
  usePatchLeadTaskMutation,
  useSendLeadEmailMutation,
  useSyncLeadEmailsMutation,
  useUpdateLeadMutation,
} from '@/features/leads/leadsApi'
import GmailThreadList from '@/features/gmail/GmailThreadList'
import GmailThreadView from '@/features/gmail/GmailThreadView'
import { parseStoredThread } from '@/features/gmail/gmailParserUtils'
import { formatStageLabel as formatPipelineStageLabel } from '@/features/opportunities/components/OpportunitiesKanban'
import { useCreateOpportunityMutation } from '@/features/opportunities/opportunitiesApi'
import { AddDealDrawer } from '@/features/deals/components/AddDealDrawer'
import { DealDetailPanel } from '@/features/deals/components/DealDetailPanel'
import { formatDealMoney } from '@/features/deals/dealCurrencies'
import { useGetDealsQuery } from '@/features/deals/dealsApi'
import { parsePhoneNumber } from 'libphonenumber-js/min'
import { digitsOnlyE164, inferE164FromStored, mergePartsToE164 } from '@/utils/phoneNumbers'

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
    iconWrap: 'bg-orange-100 text-orange-600',
    chip: 'border-orange-200 bg-orange-50 text-orange-800',
    card: 'bg-orange-50',
  },
  email: {
    label: 'Email',
    Icon: Mail,
    iconWrap: 'bg-blue-100 text-blue-700',
    chip: 'border-blue-200 bg-blue-50 text-blue-800',
    card: 'bg-blue-50',
  },
  call: {
    label: 'Call',
    Icon: PhoneCall,
    iconWrap: 'bg-emerald-100 text-emerald-700',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    card: 'bg-emerald-50',
  },
  meeting: {
    label: 'Meeting',
    Icon: CalendarCheck2,
    iconWrap: 'bg-violet-100 text-violet-700',
    chip: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800',
    card: 'bg-violet-50',
  },
  follow_up: {
    label: 'Follow-up',
    Icon: Bell,
    iconWrap: 'bg-sky-100 text-sky-700',
    chip: 'border-sky-200 bg-sky-50 text-sky-800',
    card: 'bg-sky-50',
  },
  discovery: {
    label: 'Discovery',
    Icon: Search,
    iconWrap: 'bg-slate-100 text-slate-700',
    chip: 'border-slate-200 bg-slate-50 text-slate-800',
    card: 'bg-slate-50',
  },
  demo: {
    label: 'Demo',
    Icon: Presentation,
    iconWrap: 'bg-cyan-100 text-cyan-700',
    chip: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    card: 'bg-cyan-50',
  },
  in_person_visit: {
    label: 'In-person visit',
    Icon: MapPin,
    iconWrap: 'bg-stone-100 text-stone-700',
    chip: 'border-stone-200 bg-stone-50 text-stone-800',
    card: 'bg-stone-50',
  },
  task: {
    label: 'Task',
    Icon: Bell,
    iconWrap: 'bg-sky-100 text-sky-700',
    chip: 'border-sky-200 bg-sky-50 text-sky-800',
    card: 'bg-sky-50',
  },
  tag: {
    label: 'Tag',
    Icon: Tag,
    iconWrap: 'bg-violet-100 text-violet-700',
    chip: 'border-violet-200 bg-violet-50 text-violet-800',
    card: 'bg-violet-50',
  },
  system: {
    label: 'Activity',
    Icon: Sparkles,
    iconWrap: 'bg-slate-100 text-slate-700',
    chip: 'border-slate-200 bg-slate-50 text-slate-700',
    card: 'bg-slate-50',
  },
}

function activityPresentation(activityType) {
  return ACTIVITY_STYLE[activityType] || ACTIVITY_STYLE.system
}

function detectActivityVisualKey(activity, headline = '', detail = '') {
  const fromMeta = String(activity?.metadata?.activityTypeKey || '').toLowerCase()
  if (fromMeta && fromMeta !== 'system' && ACTIVITY_STYLE[fromMeta]) return fromMeta
  const fromType = String(activity?.type || '').toLowerCase()
  const text = `${headline} ${detail} ${activity?.body || ''}`.toLowerCase()
  if (text.includes('follow-up') || text.includes('follow up') || text.includes('reminder')) return 'follow_up'
  if (text.includes('email') || text.includes('@')) return 'email'
  if (text.includes('task')) return 'task'
  if (text.includes('tag')) return 'tag'
  if (text.includes('call')) return 'call'
  if (text.includes('note')) return 'note'
  if (text.includes('meeting')) return 'meeting'
  if (fromType && fromType !== 'system' && ACTIVITY_STYLE[fromType]) return fromType
  if (fromMeta && ACTIVITY_STYLE[fromMeta]) return fromMeta
  if (fromType && ACTIVITY_STYLE[fromType]) return fromType
  return fromMeta || fromType || 'system'
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
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function activityTimeLabel(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function activityDateTimeLabel(value) {
  return `${activityDayLabel(value)}, ${activityTimeLabel(value)}`
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

function LeadInfoItem({ Icon, label, value, href }) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </p>
      {href && value !== '-' ? (
        <a href={href} className="block break-all text-sm font-medium text-ink hover:text-brand-700">
          {value}
        </a>
      ) : (
        <p className="break-words text-sm font-medium text-ink">{value}</p>
      )}
    </div>
  )
}

function countdownLabel(targetDate) {
  if (!targetDate) return ''
  const diff = targetDate.getTime() - Date.now()
  if (diff < 0) return 'Time over'
  const mins = Math.floor(diff / 60000)
  const days = Math.floor(mins / (60 * 24))
  const hours = Math.floor((mins % (60 * 24)) / 60)
  const minutes = mins % 60
  const pieces = []
  if (days) pieces.push(`${days}d`)
  if (hours) pieces.push(`${hours}h`)
  pieces.push(`${minutes}m`)
  return `in ${pieces.join(' ')}`
}

function dealCardInitials(title) {
  const t = String(title || '').trim()
  if (!t) return '?'
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase()
  return t.slice(0, 2).toUpperCase()
}

function dealCardCreatedLabel(value) {
  if (value == null || value === '') return '—'
  let normalized = value
  if (typeof normalized === 'number') normalized = new Date(normalized).toISOString()
  else if (typeof normalized === 'string') {
    const s = normalized.trim()
    // MySQL often returns "YYYY-MM-DD HH:mm:ss" which is not reliably parsed as local time in all engines
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) normalized = s.replace(' ', 'T')
    else normalized = s
  }
  const d = normalized instanceof Date ? normalized : new Date(normalized)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Small ring for “health” / score (uses opportunity leadScore on deal card). */
function DealHealthRing({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0))
  const size = 20
  const stroke = 2.5
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="none" className="stroke-slate-200" strokeWidth={stroke} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        className="stroke-emerald-500"
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function LeadDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isPipelineDealRoute = location.pathname.startsWith('/opportunities/')
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
  const [convertingToOpportunity, setConvertingToOpportunity] = useState(false)
  const [editLeadOpen, setEditLeadOpen] = useState(false)
  const [selectedTags, setSelectedTags] = useState([])
  const [pipelineSaving, setPipelineSaving] = useState(false)
  const [addDealDrawerOpen, setAddDealDrawerOpen] = useState(false)
  const [dealPanelOpp, setDealPanelOpp] = useState(null)

  const { data, isLoading } = useGetLeadQuery(id)
  const { data: formMetaData } = useGetLeadFormMetaQuery()
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
  const [updateLead] = useUpdateLeadMutation()
  const [createLeadTag] = useCreateLeadTagMutation()
  const [createOpportunity] = useCreateOpportunityMutation()

  const lead = data?.data
  const summary = data?.meta?.summary || {}
  const activities = activityData?.data || []
  const tasks = taskData?.data || []
  const emailThreads = emailThreadsData?.data || []
  const selectedThread = threadData?.data || []
  const notes = notesData?.data || []
  const leadFiles = filesData?.data || []

  const tabs = useMemo(() => {
    const base = [
      { id: 'activity', label: 'Activity' },
      { id: 'calls', label: 'Calls' },
      { id: 'emails', label: 'Emails' },
      { id: 'tasks', label: 'Tasks' },
      { id: 'followups', label: 'Follow-ups' },
      { id: 'notes', label: 'Notes' },
      { id: 'documents', label: 'Documents' },
    ]
    if (lead?.isOpportunity) {
      return [...base, { id: 'deal', label: 'Deal' }]
    }
    return base
  }, [lead?.isOpportunity])

  const parentOppIdForChildren = lead?.isOpportunity ? id : null
  const { data: childDealsForOppRes, refetch: refetchChildDeals } = useGetDealsQuery(
    {
      page: 1,
      limit: 100,
      parentOpportunityLeadId: parentOppIdForChildren || undefined,
    },
    { skip: !parentOppIdForChildren },
  )
  const childDealsForOpp = childDealsForOppRes?.data || []
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

  const opportunityStages = useMemo(() => {
    const rows = formMetaData?.data?.opportunityStages || []
    return [...rows].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
  }, [formMetaData])

  const availableTags = useMemo(
    () => formMetaData?.data?.tags || [],
    [formMetaData],
  )

  const visibleActivities = useMemo(() => {
    const base = activities.filter((activity) => !isSystemNoteActivity(activity))
    const seenTaskCreate = new Set()
    return base.filter((activity) => {
      const action = String(activity?.metadata?.action || '').toLowerCase()
      const taskId = activity?.metadata?.taskId
      if (action === 'task_created' && taskId) {
        if (seenTaskCreate.has(taskId)) return false
        seenTaskCreate.add(taskId)
      }
      return true
    })
  }, [activities])

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
  const leadCountryIso = useMemo(() => {
    const c = String(lead?.country || '')
      .trim()
      .toUpperCase()
    return c.length === 2 ? c : 'IN'
  }, [lead?.country])

  const primaryE164 = useMemo(() => mergePartsToE164(lead?.phoneCountryCode, lead?.phone), [lead?.phoneCountryCode, lead?.phone])

  const formattedPhone = useMemo(() => {
    if (!primaryE164) {
      const fb = `${lead?.phoneCountryCode || ''} ${lead?.phone || ''}`.trim()
      return fb || '-'
    }
    try {
      return parsePhoneNumber(primaryE164).formatInternational()
    } catch {
      return `${lead?.phoneCountryCode || ''} ${lead?.phone || ''}`.trim() || '-'
    }
  }, [primaryE164, lead?.phoneCountryCode, lead?.phone])

  const phoneTelHref = useMemo(() => {
    if (!primaryE164) return undefined
    try {
      return `tel:${parsePhoneNumber(primaryE164).format('E.164')}`
    } catch {
      return undefined
    }
  }, [primaryE164])

  const whatsappRaw = String(lead?.profileMeta?.whatsappNumber || '').trim()
  const whatsappE164 = useMemo(
    () => inferE164FromStored(lead?.profileMeta?.whatsappNumber, leadCountryIso),
    [lead?.profileMeta?.whatsappNumber, leadCountryIso],
  )
  const formattedWhatsApp = useMemo(() => {
    if (!whatsappRaw) return '-'
    if (whatsappE164) {
      try {
        return parsePhoneNumber(whatsappE164).formatInternational()
      } catch {
        return whatsappRaw
      }
    }
    return whatsappRaw
  }, [whatsappRaw, whatsappE164])

  const whatsappDigits = useMemo(() => {
    if (whatsappE164) return digitsOnlyE164(whatsappE164)
    return whatsappRaw.replace(/\D/g, '')
  }, [whatsappE164, whatsappRaw])
  const formattedValue = `₹${Number(lead?.value || 0).toLocaleString('en-IN')}`
  const leadOwnerName =
    (lead?.assignedUsers || []).map((user) => user?.name).filter(Boolean).join(', ') || lead?.assignee?.name || lead?.owner?.name || '-'
  const addressLine = [lead?.street, lead?.city, lead?.state, lead?.country, lead?.postalCode].filter(Boolean).join(', ') || '-'

  useEffect(() => {
    if (!isPipelineDealRoute || !id || isLoading || !lead) return
    if (!lead.isOpportunity) {
      navigate(`/leads/${id}`, { replace: true })
    }
  }, [isPipelineDealRoute, id, isLoading, lead, navigate])

  useEffect(() => {
    if (activeTab === 'deal' && lead && !lead.isOpportunity) {
      setActiveTab('activity')
    }
  }, [activeTab, lead])

  useEffect(() => {
    setDealPanelOpp(null)
  }, [id])

  useEffect(() => {
    if (lead?.email) setEmailTo((prev) => prev || lead.email)
  }, [lead?.email])

  useEffect(() => {
    setSelectedTags((lead?.tags || []).map((tag) => tag.name))
  }, [lead?.id, lead?.updatedAt, lead?.tags])

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

  async function convertToOpportunity() {
    if (!lead) return
    setConvertingToOpportunity(true)
    try {
      const phoneNumber = mergePartsToE164(lead.phoneCountryCode, lead.phone) || null
      const res = await createOpportunity({
        leadId: lead.id,
        fullName: (lead.contactName || lead.title || '').trim() || 'Lead',
        companyName: (lead.company || '').trim() || 'Unknown company',
        email: lead.email || null,
        phoneNumber,
        jobTitle: lead.designation || null,
        dealValue: Number(lead.value || 0),
        leadScore: Number(lead.score ?? 0),
        tags: (lead.tags || []).map((t) => t.name).filter(Boolean),
        ownerUserId: lead.assignedTo || lead.ownerUserId || null,
      }).unwrap()
      const newId = res?.data?.id
      if (newId) {
        toast.success('Added to pipeline')
        navigate(`/opportunities/${newId}`)
      }
    } catch (e) {
      toast.error(e?.data?.error?.message || e?.error || 'Could not create opportunity')
    } finally {
      setConvertingToOpportunity(false)
    }
  }

  async function submitLeadEdit(payload) {
    try {
      await updateLead({ id, ...payload }).unwrap()
      toast.success('Lead updated')
      setEditLeadOpen(false)
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.error || 'Could not update lead')
    }
  }

  async function handleLeadTagsChange(nextTags) {
    const prev = selectedTags
    setSelectedTags(nextTags)
    try {
      await updateLead({ id, tags: nextTags }).unwrap()
    } catch (err) {
      setSelectedTags(prev)
      toast.error(err?.data?.error?.message || err?.error || 'Could not update tags')
    }
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
                <div className="mt-2 flex items-center justify-center gap-2">
                  <p className="text-2xl font-semibold text-ink">{fullName}</p>
                  <button
                    type="button"
                    onClick={() => setEditLeadOpen(true)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-white text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
                    aria-label="Edit lead"
                    title="Edit lead"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {isPipelineDealRoute ? lead.company || lead.designation || 'Opportunity' : lead.company || lead.designation || 'Lead profile'}
                </p>
              </div>

              {!lead.isOpportunity ? (
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={convertingToOpportunity}
                    onClick={convertToOpportunity}
                    className="h-10 w-full rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {convertingToOpportunity ? 'Creating…' : 'Convert to opportunity'}
                  </button>
                </div>
              ) : null}

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-left text-xs font-medium text-ink-muted">Lead status (pipeline)</p>
                  <span className="rounded-full border border-surface-border bg-surface-subtle px-2 py-0.5 text-[11px] font-medium text-ink">
                    {formatPipelineStageLabel(lead.opportunityStage) || 'Not set'}
                  </span>
                </div>
                <select
                  className="h-10 w-full rounded-xl border border-surface-border bg-white px-3 text-sm text-ink"
                  value={lead.opportunityStage || ''}
                  disabled={pipelineSaving}
                  onChange={async (e) => {
                    const next = e.target.value
                    if (!next || next === lead.opportunityStage) return
                    setPipelineSaving(true)
                    try {
                      await updateLead({ id, opportunityStage: next }).unwrap()
                    } catch (err) {
                      toast.error(err?.data?.error?.message || err?.error || 'Could not update lead status')
                    } finally {
                      setPipelineSaving(false)
                    }
                  }}
                >
                  {lead.opportunityStage && !opportunityStages.some((s) => s.name === lead.opportunityStage) ? (
                    <option value={lead.opportunityStage}>{formatPipelineStageLabel(lead.opportunityStage)}</option>
                  ) : null}
                  {opportunityStages.length === 0 ? (
                    <option value={lead.opportunityStage || ''}>
                      {formatPipelineStageLabel(lead.opportunityStage) || '—'}
                    </option>
                  ) : (
                    opportunityStages.map((s) => (
                      <option key={s.id} value={s.name}>
                        {formatPipelineStageLabel(s.name)}
                      </option>
                    ))
                  )}
                </select>
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
                    <LeadInfoItem Icon={Mail} label="Email" value={lead.email || '-'} href={lead.email ? `mailto:${lead.email}` : undefined} />
                    <LeadInfoItem Icon={Phone} label="Phone" value={formattedPhone} href={phoneTelHref} />
                    <LeadInfoItem
                      Icon={MessageCircle}
                      label="WhatsApp"
                      value={formattedWhatsApp}
                      href={whatsappDigits ? `https://wa.me/${whatsappDigits}` : undefined}
                    />
                    <LeadInfoItem Icon={User} label="Lead owner" value={leadOwnerName} />
                    <LeadInfoItem Icon={UserCircle2} label="Job title" value={lead.designation || '-'} />
                    <LeadInfoItem Icon={BadgeIndianRupee} label="Annual revenue" value={formattedValue} />
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-ink-muted">Lead source</p>
                      <div><LeadSourceTag source={lead.source} /></div>
                    </div>
                    <LeadInfoItem Icon={CheckSquare} label="Open tasks" value={String(summary.openTasks ?? 0)} />
                    <LeadInfoItem Icon={CheckSquare} label="Completed tasks" value={String(summary.completedTasks ?? 0)} />
                    <div className="pt-1">
                      <LeadScorePill score={lead.score || 0} showBar />
                    </div>
                  </>
                ) : (
                  <>
                    <LeadInfoItem Icon={Home} label="Street" value={lead.street || '-'} />
                    <LeadInfoItem Icon={MapPin} label="City" value={lead.city || '-'} />
                    <LeadInfoItem Icon={MapPin} label="State" value={lead.state || '-'} />
                    <LeadInfoItem Icon={Flag} label="Country" value={lead.country || '-'} />
                    <LeadInfoItem Icon={Hash} label="Postal code" value={lead.postalCode || '-'} />
                    <LeadInfoItem Icon={MapPin} label="Full address" value={addressLine} />
                  </>
                )}
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-surface-border bg-white p-3.5">
            <p className="text-sm font-semibold text-ink">Tags</p>
            <div className="mt-1.5">
              <LeadTagsInput
                value={selectedTags}
                availableTags={availableTags}
                onChange={handleLeadTagsChange}
                onCreateTag={({ name, color }) => createLeadTag({ name, color }).unwrap()}
              />
            </div>
            <div className="mt-3 border-t border-surface-border pt-3">
              <p className="text-xs text-ink-muted">
                Last activity: {lastActivityAt ? new Date(lastActivityAt).toLocaleString() : '-'}
              </p>
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
                const isOverdue = Boolean(
                  dueAt && task.status !== 'completed' && task.status !== 'cancelled' && dueAt.getTime() < Date.now(),
                )
                const attachmentsCount = Array.isArray(task.attachments) ? task.attachments.length : task.attachmentsCount || 0
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
                    className={`w-full cursor-pointer rounded-2xl border bg-white text-left shadow-sm ring-1 ring-slate-100/80 transition hover:border-brand-200 hover:shadow-md ${
                      isOverdue ? 'border-red-200 border-l-4 border-l-red-500' : 'border-surface-border'
                    }`}
                  >
                    <div className="border-b border-surface-border bg-slate-50/60 px-4 py-2.5 sm:px-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-900">
                            {taskTypeLabel(task.taskType)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            <TaskPriorityIcon priority={task.priority} />
                            {task.priority}
                          </span>
                          <TaskStatusPill value={task.status} />
                          {isOverdue ? <TaskOverdueBadge /> : null}
                          {task.recurrenceRule ? <TaskRecurrenceIcon rule={task.recurrenceRule} /> : null}
                          {attachmentsCount ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
                              📎 {attachmentsCount}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {task.status !== 'completed' && task.status !== 'cancelled' ? (
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
                            Created by
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{task.creator?.name || 'System'}</p>
                          <p className="mt-0.5 text-[11px] text-ink-muted">Task owner</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-3 shadow-sm">
                          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                            <UserCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Assigned to
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{task.assignee?.name || 'Unassigned'}</p>
                          <p className="mt-0.5 text-[11px] text-ink-muted">Owner responsible for this task</p>
                        </div>
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
                                <div className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 bg-white px-2 py-1.5 text-xs text-slate-700">
                                  <label className="flex items-start gap-2">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(subtask.done)}
                                      readOnly
                                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-emerald-600"
                                    />
                                    <span className={subtask.done ? 'text-ink-muted line-through' : ''}>{subtask.title || 'Untitled'}</span>
                                  </label>
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                      subtask.done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {subtask.done ? 'Done' : 'Pending'}
                                  </span>
                                </div>
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
          ) : activeTab === 'documents' ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-ink-muted">Upload, preview, and edit workspace files linked to this record.</p>
                <Link
                  to={`/documents?leadId=${encodeURIComponent(id)}`}
                  className="text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                >
                  Open in Documents
                </Link>
              </div>
              <LeadDocumentsWorkspace leadId={id} showUpload />
            </div>
          ) : activeTab === 'deal' ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-ink-muted">
                  Deals linked to this opportunity ({childDealsForOpp.length})
                </p>
                <button
                  type="button"
                  onClick={() => setAddDealDrawerOpen(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add deal
                </button>
              </div>
              {childDealsForOpp.length ? (
                <div className="w-full max-w-full md:max-w-[32.5%]">
                  <ul className="space-y-4">
                  {childDealsForOpp.map((row) => {
                    const title = (row.dealName || row.fullName || 'Deal').trim()
                    const stageLabel = formatPipelineStageLabel(row.currentStage) || '—'
                    const valueLine = formatDealMoney(row.dealValue, row.dealCurrency ?? 'USD')
                    const createdRaw = row.createdAt ?? row.created_at
                    const createdLine = dealCardCreatedLabel(createdRaw)
                    const healthPct = Math.min(100, Math.max(0, Number(row.leadScore) || 0))
                    const ownerName = row.owner?.name?.trim() || row.owner?.email?.trim() || 'Unassigned'
                    const ownerInitials = dealCardInitials(ownerName)
                    return (
                      <li key={row.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setDealPanelOpp(row)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setDealPanelOpp(row)
                            }
                          }}
                          className="group block w-full cursor-pointer overflow-hidden rounded-2xl border border-surface-border bg-white text-left shadow-sm ring-1 ring-black/[0.03] transition hover:border-slate-300 hover:shadow-md"
                          aria-label={`Open deal: ${title}`}
                        >
                          <div className="border-b border-surface-border px-5 pb-3 pt-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div
                                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-[13px] font-bold text-white shadow-md ring-2 ring-white"
                                  aria-hidden
                                >
                                  {dealCardInitials(title)}
                                </div>
                                <p className="truncate text-lg font-bold leading-tight tracking-tight text-ink">{title}</p>
                              </div>
                              <MoreHorizontal className="h-5 w-5 shrink-0 text-ink-muted opacity-70 transition group-hover:opacity-100" aria-hidden />
                            </div>
                          </div>

                          <div className="space-y-3 px-5 py-4">
                            <div className="flex items-center justify-between gap-4 text-sm">
                              <span className="text-ink-muted">Stage</span>
                              <span className="flex max-w-[58%] items-center gap-2 font-semibold text-amber-600">
                                <Flag className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500" strokeWidth={1.75} aria-hidden />
                                <span className="truncate text-right">{stageLabel}</span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-sm">
                              <span className="text-ink-muted">Created</span>
                              <span className="font-medium text-ink">{createdLine}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-sm">
                              <span className="text-ink-muted">Value</span>
                              <span className="text-base font-bold tabular-nums text-ink">{valueLine}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-sm">
                              <span className="text-ink-muted">Status</span>
                              <span className="flex items-center gap-2 font-semibold text-ink">
                                <DealHealthRing score={healthPct} />
                                <span className="tabular-nums">{healthPct}%</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-surface-border bg-slate-50/70 px-5 py-3.5">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700 ring-2 ring-white"
                                aria-hidden
                              >
                                {ownerInitials}
                              </div>
                              <span className="truncate text-sm font-bold text-ink">{ownerName}</span>
                            </div>
                            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-ink-muted transition group-hover:text-brand-600">
                              See details
                              <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                            </span>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-ink-muted">No deals yet. Add one to track it on the Deals board.</p>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {filteredActivities.map((activity, index) => {
                const isNote = activity.type === 'note'
                const metadata = activity.metadata || {}
                const plainBody = activityPlainBody(activity.body || '')
                const detailRaw = (activity.metadata?.description || activity.body || '').trim()
                const renderNoteHtml = isNote && Boolean(detailRaw)
                const headlineText =
                  isNote
                    ? activity.metadata?.title?.trim() || 'Note added'
                    : plainBody || 'Activity'
                const styleKey = detectActivityVisualKey(activity, headlineText, detailRaw)
                const presentation = activityPresentation(styleKey)
                const Icon = presentation.Icon
                const isTask = styleKey === 'task' || activity.type === 'task'
                const linkedTask =
                  (metadata.taskId ? tasks.find((t) => t.id === metadata.taskId) : null) ||
                  (metadata.title ? tasks.find((t) => String(t.title || '').trim() === String(metadata.title || '').trim()) : null) ||
                  null
                const assigneeName =
                  linkedTask?.assignee?.name ||
                  metadata.assigneeName ||
                  metadata.assignedTo ||
                  metadata.assignee ||
                  'Unassigned'
                const subtasks = Array.isArray(linkedTask?.subtasks)
                  ? linkedTask.subtasks
                  : Array.isArray(metadata.subtasks)
                    ? metadata.subtasks
                    : []
                const taskDescription = linkedTask?.description || metadata.description || ''
                const taskDueAt = linkedTask?.dueAt || metadata.dueAt || null
                const taskDueLabel = taskDueAt ? activityDateTimeLabel(taskDueAt) : '-'
                const followText = `${headlineText} ${detailRaw}`.toLowerCase()
                const isFollowUp = styleKey === 'follow_up' || styleKey === 'task' || followText.includes('follow-up') || followText.includes('follow up') || followText.includes('reminder')
                const followUpAt = isFollowUp ? parseFollowUpTime(activity, headlineText, detailRaw) : null
                const displayHeadline = isFollowUp && followUpAt
                  ? headlineText.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/, activityDateTimeLabel(followUpAt))
                  : headlineText
                const normalizedHeadline = String(displayHeadline || '').trim().toLowerCase()
                const normalizedDetail = String(detailRaw || '').trim().toLowerCase()
                const shouldShowDetail = Boolean(detailRaw) && normalizedDetail !== normalizedHeadline
                const currentDayKey = activityDayKey(activity.createdAt)
                const previousDayKey = index > 0 ? activityDayKey(filteredActivities[index - 1].createdAt) : null
                const showDayMarker = index === 0 || currentDayKey !== previousDayKey
                return (
                  <article key={activity.id} className="grid grid-cols-[160px_36px_minmax(0,1fr)] gap-2 py-1.5">
                    <span className="pt-1 text-xs text-ink-muted">
                      {showDayMarker ? activityDateTimeLabel(activity.createdAt) : activityTimeLabel(activity.createdAt)}
                    </span>
                    <div className="relative flex justify-center">
                      <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-surface-border" aria-hidden="true" />
                      <span className={`relative z-10 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full ${presentation.iconWrap}`}>
                        <Icon size={14} />
                      </span>
                    </div>
                    <div className={`rounded-xl p-2.5 ${presentation.card}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{displayHeadline}</p>
                        {isFollowUp && followUpAt ? (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700">{countdownLabel(followUpAt)}</span>
                        ) : null}
                      </div>
                      {isFollowUp && followUpAt ? <p className="mt-1 text-xs text-ink-muted">Call time: {activityDateTimeLabel(followUpAt)}</p> : null}
                      {shouldShowDetail ? (
                        renderNoteHtml ? (
                          <div
                            className="prose prose-sm mt-1.5 max-w-none text-xs leading-relaxed text-ink prose-p:my-1 prose-headings:my-1"
                            dangerouslySetInnerHTML={{ __html: sanitizeNoteBody(noteBodyToInitialHtml(detailRaw)) }}
                          />
                        ) : (
                          <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{detailRaw}</p>
                        )
                      ) : null}
                      {isNote && !detailRaw ? (
                        <div
                          className="prose prose-sm mt-1.5 max-w-none text-xs leading-relaxed text-ink prose-p:my-1 prose-headings:my-1"
                          dangerouslySetInnerHTML={{ __html: sanitizeNoteBody(noteBodyToInitialHtml(activity.body || '')) }}
                        />
                      ) : null}
                      {isTask ? (
                        <div className="mt-2 space-y-2 rounded-lg bg-white/70 p-2">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <p className="text-[11px] text-ink-muted">
                              Created by: <span className="font-medium text-ink">{linkedTask?.creator?.name || activity.user?.name || 'System'}</span>
                            </p>
                            <p className="text-[11px] text-ink-muted">
                              Assigned to: <span className="font-medium text-ink">{assigneeName}</span>
                            </p>
                          </div>
                          {linkedTask?.title ? (
                            <p className="text-[11px] text-ink-muted">
                              Task: <span className="font-medium text-ink">{linkedTask.title}</span>
                            </p>
                          ) : null}
                          <p className="text-[11px] text-ink-muted">
                            Due date: <span className="font-medium text-ink">{taskDueLabel}</span>
                          </p>
                          <p className="text-[11px] text-ink-muted">
                            Description: <span className="font-medium text-ink">{taskDescription || '-'}</span>
                          </p>
                          {subtasks.length ? (
                            <div className="space-y-1">
                              {subtasks.map((subtask, subIndex) => (
                                <div key={`${activity.id}-timeline-sub-${subIndex}`} className="flex items-start justify-between gap-2 rounded-md border border-slate-100 bg-white px-2 py-1.5">
                                  <label className="flex items-start gap-2 text-[11px] text-ink-muted">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(subtask.done)}
                                      readOnly
                                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-emerald-600"
                                    />
                                    <span className={subtask.done ? 'line-through' : ''}>{subtask.title || 'Untitled subtask'}</span>
                                  </label>
                                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${subtask.done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {subtask.done ? 'Done' : 'Pending'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {!isTask ? <p className="mt-2 text-right text-[11px] font-medium text-ink-muted">by {activity.user?.name || 'System user'}</p> : null}
                    </div>
                  </article>
                )
              })}
              {filteredActivities.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border p-8 text-center">
                  <p className="text-sm font-medium text-ink">No activity</p>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'notes' || activeTab === 'activity' || activeTab === 'followups' || activeTab === 'deal' || activeTab === 'documents' ? null : (
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
              <div className="w-full min-w-0 max-w-none overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl">
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
          {dealPanelOpp ? (
            <DealDetailPanel
              open
              opp={dealPanelOpp}
              opportunityStages={opportunityStages}
              onClose={() => setDealPanelOpp(null)}
            />
          ) : null}
          <AddDealDrawer
            open={addDealDrawerOpen}
            onClose={() => setAddDealDrawerOpen(false)}
            users={formMetaData?.data?.users || []}
            fixedOpportunityLeadId={id}
            onCreated={() => {
              refetchChildDeals()
            }}
          />
          <AddLeadModal
            open={editLeadOpen}
            onClose={() => setEditLeadOpen(false)}
            initialLead={lead}
            onSubmit={submitLeadEdit}
          />
        </section>
      </div>
    </PageShell>
  )
}
