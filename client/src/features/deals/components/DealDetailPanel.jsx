import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  BadgeDollarSign,
  Bell,
  CalendarCheck2,
  CalendarClock,
  Check,
  CheckSquare,
  ChevronDown,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  MessageSquare,
  NotebookPen,
  Phone,
  PhoneCall,
  Plus,
  Presentation,
  Search,
  Sparkles,
  Tag,
  Trash2,
  UserCircle2,
} from 'lucide-react'
import DOMPurify from 'dompurify'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'
import { shortDealId } from '@/utils/shortDealId'
import {
  useCreateLeadNoteMutation,
  useDeleteLeadNoteMutation,
  useDeleteLeadTaskMutation,
  useGetLeadActivitiesQuery,
  useGetLeadNotesQuery,
  useGetLeadQuery,
  useGetLeadTasksQuery,
  usePatchLeadTaskMutation,
} from '@/features/leads/leadsApi'
import {
  LeadTaskDrawer,
  LEAD_TASK_STATUS_OPTIONS,
  TaskOverdueBadge,
  TaskPriorityIcon,
  TaskRecurrenceIcon,
  TaskStatusPill,
  taskTypeLabel,
} from '@/features/leads/components/LeadTaskDrawer'
import { TaskAttachmentIcons } from '@/features/leads/components/TaskAttachmentIcons'
import { usePatchOpportunityStatusMutation } from '@/features/opportunities/opportunitiesApi'
import { useGetDealQuery, usePatchDealStageMutation, useGetDealActivitiesQuery, useCreateDealActivityMutation } from '@/features/deals/dealsApi'
import { formatStageLabel } from '@/features/opportunities/components/OpportunitiesKanban'
import { useGetDocumentsQuery, useUploadDocumentMutation } from '@/features/documents/documentsApi'
import { DealInvoicesPanel, DealQuotationsPanel } from '@/features/deals/components/DealSalesDocsTabs'
import { formatDealMoney, normalizeDealCurrency } from '@/features/deals/dealCurrencies'
import { DealPaymentsTab } from '@/features/deals/components/DealPaymentsTab'

const TAB_DEFS = [
  { id: 'activity', label: 'Activity' },
  { id: 'notes', label: 'Notes' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'payments', label: 'Payments' },
  { id: 'quotations', label: 'Quotations' },
  { id: 'invoices', label: 'Invoices' },
]

const NOTE_HTML = {
  ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'a', 'img'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt'],
}

function sanitizeNoteBody(html) {
  return DOMPurify.sanitize(html || '', NOTE_HTML)
}

function notePlainText(html) {
  if (typeof document === 'undefined') return String(html || '').replace(/<[^>]+>/g, ' ').trim()
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
  note: { label: 'Note', Icon: NotebookPen, iconWrap: 'bg-brand-100 text-brand-700', card: 'border-brand-200 bg-brand-50' },
  email: { label: 'Email', Icon: Mail, iconWrap: 'bg-brand-100 text-brand-700', card: 'border-brand-200 bg-brand-50' },
  call: { label: 'Call', Icon: PhoneCall, iconWrap: 'bg-emerald-100 text-emerald-700', card: 'border-emerald-200 bg-emerald-50' },
  meeting: { label: 'Meeting', Icon: CalendarCheck2, iconWrap: 'bg-slate-100 text-brand-700', card: 'border-brand-200 bg-slate-50' },
  follow_up: { label: 'Follow-up', Icon: Bell, iconWrap: 'bg-sky-100 text-sky-700', card: 'border-sky-200 bg-sky-50' },
  discovery: { label: 'Discovery', Icon: Search, iconWrap: 'bg-slate-100 text-slate-700', card: 'border-slate-200 bg-slate-50' },
  demo: { label: 'Demo', Icon: Presentation, iconWrap: 'bg-cyan-100 text-cyan-700', card: 'border-cyan-200 bg-cyan-50' },
  in_person_visit: { label: 'In-person', Icon: MapPin, iconWrap: 'bg-stone-100 text-stone-700', card: 'border-stone-200 bg-stone-50' },
  task: { label: 'Task', Icon: CheckSquare, iconWrap: 'bg-sky-100 text-sky-700', card: 'border-sky-200 bg-sky-50' },
  tag: { label: 'Tag', Icon: Tag, iconWrap: 'bg-slate-100 text-brand-700', card: 'border-brand-200 bg-slate-50' },
  system: { label: 'Activity', Icon: Sparkles, iconWrap: 'bg-slate-100 text-slate-700', card: 'border-slate-200 bg-slate-50' },
  payment: { label: 'Payment', Icon: BadgeDollarSign, iconWrap: 'bg-emerald-100 text-emerald-700', card: 'border-emerald-200 bg-emerald-50' },
}

function activityPresentation(activityType) {
  return ACTIVITY_STYLE[activityType] || ACTIVITY_STYLE.system
}

function inferStyleKeyFromSystemAction(action) {
  const a = String(action || '').toLowerCase()
  if (!a) return null
  if (a.startsWith('task_')) return 'task'
  if (a.startsWith('note_')) return 'note'
  if (a.startsWith('followup_')) return 'follow_up'
  if (a === 'payment_recorded' || a === 'deal_payment_recorded') return 'payment'
  return null
}

function detectActivityVisualKey(activity, headline = '', detail = '') {
  const md = activity?.metadata || {}
  const fromMeta = String(md.activityTypeKey || '').toLowerCase()
  if (fromMeta && fromMeta !== 'system' && ACTIVITY_STYLE[fromMeta]) return fromMeta

  const fromAction = inferStyleKeyFromSystemAction(md.action)
  if (fromAction) return fromAction

  const fromType = String(activity?.type || '').toLowerCase()
  if (fromType && fromType !== 'system' && ACTIVITY_STYLE[fromType]) return fromType

  const text = `${headline} ${detail} ${activity?.body || ''}`.toLowerCase()
  if (text.includes('follow-up') || text.includes('follow up') || text.includes('reminder')) return 'follow_up'
  if (text.includes('email') || text.includes('@')) return 'email'
  if (text.includes('task')) return 'task'
  if (text.includes('tag')) return 'tag'
  if (text.includes('call')) return 'call'
  if (text.includes('note')) return 'note'
  if (text.includes('meeting')) return 'meeting'
  if (fromMeta && ACTIVITY_STYLE[fromMeta]) return fromMeta
  if (fromType && ACTIVITY_STYLE[fromType]) return fromType
  return fromMeta || fromType || 'system'
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
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function activityTimeLabel(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
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

function initials(name) {
  return String(name || 'NA')
    .split(' ')
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatTaskDueParts(value) {
  if (!value) return { dateLine: '—', timeLine: null }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return { dateLine: '—', timeLine: null }
  const dateLine = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const timeLine = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return { dateLine, timeLine }
}

function normalizeTaskStatusForApi(status) {
  if (status === 'open') return 'pending'
  return status
}

function normalizeTaskStatusForSelect(status) {
  if (status === 'open') return 'pending'
  return status || 'pending'
}

const TASK_STATUS_VALUES = new Set(LEAD_TASK_STATUS_OPTIONS.map((o) => o.value))

function selectStatusValue(status) {
  const n = normalizeTaskStatusForSelect(status)
  return TASK_STATUS_VALUES.has(n) ? n : 'pending'
}

function timeInStage(opp) {
  const ref = opp?.stageEnteredAt || opp?.updatedAt || opp?.createdAt
  if (!ref) return '—'
  const ms = Date.now() - new Date(ref).getTime()
  if (ms < 60000) return 'just now'
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'}`
}

function stageTone(name) {
  const n = String(name || '').toLowerCase()
  if (/(won|approved|accept|close.*won|success)/.test(n)) return 'emerald'
  if (/(lost|reject|cancel|close.*lost|fail|disqualif)/.test(n)) return 'rose'
  if (/(hold|pause|stall|nurtur)/.test(n)) return 'amber'
  if (/(propos|negot|contract|quote)/.test(n)) return 'violet'
  if (/(qualif|demo|discov|meeting|present)/.test(n)) return 'sky'
  return 'indigo'
}

const TONE_CLASSES = {
  emerald: { active: 'bg-emerald-500 text-white', triggerActive: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  rose: { active: 'bg-rose-500 text-white', triggerActive: 'border-rose-300 bg-rose-50 text-rose-800' },
  amber: { active: 'bg-amber-500 text-white', triggerActive: 'border-amber-300 bg-amber-50 text-amber-800' },
  violet: { active: 'bg-slate-500 text-white', triggerActive: 'border-brand-300 bg-slate-50 text-brand-800' },
  sky: { active: 'bg-[var(--brand-primary)] text-white', triggerActive: 'border-sky-300 bg-sky-50 text-sky-800' },
  indigo: { active: 'bg-[var(--brand-primary)] text-white', triggerActive: 'border-brand-300 bg-brand-50 text-brand-800' },
}

const CONTACT_TONE = {
  sky: 'border-sky-200 bg-sky-50 text-sky-600',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-600',
  amber: 'border-amber-200 bg-amber-50 text-amber-600',
  rose: 'border-rose-200 bg-rose-50 text-rose-600',
  violet: 'border-brand-200 bg-slate-50 text-brand-600',
}

function ContactRow({ Icon, label, value, href, tone = 'violet', compact = false }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border border-neutral-200/80 bg-neutral-50/70 px-2.5 py-1.5',
        compact ? '' : 'gap-3 px-3 py-2',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex shrink-0 items-center justify-center rounded-full border',
          compact ? 'h-6 w-6' : 'h-7 w-7',
          CONTACT_TONE[tone] || CONTACT_TONE.violet,
        )}
      >
        <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            'font-medium uppercase tracking-wider text-neutral-400',
            compact ? 'text-[9px]' : 'text-[10px]',
          )}
        >
          {label}
        </p>
        {href && value ? (
          <a
            href={href}
            className={cn('block truncate text-neutral-800 hover:text-brand-700', compact ? 'text-xs' : 'text-sm')}
          >
            {value}
          </a>
        ) : (
          <p className={cn('truncate text-neutral-800', compact ? 'text-xs' : 'text-sm')}>{value || '—'}</p>
        )}
      </div>
    </div>
  )
}

export function DealDetailPanel({ open, onClose, opp, opportunityStatuses = [], defaultTab = 'activity' }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState(defaultTab)
  const [stageMenuOpen, setStageMenuOpen] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false)
  const [taskDrawerTaskId, setTaskDrawerTaskId] = useState(null)
  const stageMenuRef = useRef(null)

  const isDealEntity = opp?.entityType === 'deal'
  const dealId = isDealEntity ? opp?.id || null : null
  const leadApiId = (isDealEntity ? opp?.parentOpportunityLeadId : opp?.id) || null
  const skip = !open || !opp || (!dealId && !leadApiId)
  const skipLead = !open || !leadApiId

  const { data: dealResp } = useGetDealQuery(dealId, { skip: !open || !dealId })
  const card = useMemo(() => ({ ...opp, ...(dealResp?.data || {}) }), [opp, dealResp?.data])

  const { data: leadResp } = useGetLeadQuery(leadApiId, { skip: skipLead })
  // Deal entities use the dedicated deal_activities table; non-deal entities fall back to lead activities.
  const { data: dealActivityData, isFetching: loadingDealActivities } = useGetDealActivitiesQuery(
    { id: dealId, page: 1, limit: 100 },
    { skip: !open || !dealId },
  )
  const { data: leadActivityData, isFetching: loadingLeadActivities } = useGetLeadActivitiesQuery(
    { id: leadApiId, page: 1, limit: 100 },
    { skip: skipLead || isDealEntity },
  )
  const activityData = isDealEntity ? dealActivityData : leadActivityData
  const loadingActivities = isDealEntity ? loadingDealActivities : loadingLeadActivities
  const { data: notesData } = useGetLeadNotesQuery(leadApiId, { skip: skipLead })
  const { data: tasksData } = useGetLeadTasksQuery(leadApiId, { skip: skipLead })
  const { data: quotationsData } = useGetDocumentsQuery(
    { leadId: leadApiId, fileType: 'Proposal' },
    { skip: skipLead },
  )
  const { data: invoicesData } = useGetDocumentsQuery(
    { leadId: leadApiId, fileType: 'Invoice' },
    { skip: skipLead },
  )

  const [createNote, { isLoading: creatingNote }] = useCreateLeadNoteMutation()
  const [deleteNote] = useDeleteLeadNoteMutation()
  const [patchTask] = usePatchLeadTaskMutation()
  const [deleteTask] = useDeleteLeadTaskMutation()
  const [patchOpportunityStatus, { isLoading: changingOppStage }] = usePatchOpportunityStatusMutation()
  const [patchDealStage, { isLoading: changingDealStage }] = usePatchDealStageMutation()
  const [createDealActivity, { isLoading: loggingDealActivity }] = useCreateDealActivityMutation()
  const changingStage = changingOppStage || changingDealStage
  const [uploadDocument, { isLoading: uploadingDocument }] = useUploadDocumentMutation()

  const lead = leadResp?.data
  const activities = activityData?.data || []
  const notes = notesData?.data || []
  const tasks = tasksData?.data || []
  const quotations = quotationsData?.data || []
  const invoices = invoicesData?.data || []

  const stagesOrdered = useMemo(
    () => [...opportunityStatuses].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
    [opportunityStatuses],
  )

  const currentStage = isDealEntity
    ? (card?.currentStage || '')
    : (lead?.oppStatus?.name || card?.currentStage || '')
  const currentStageLabel = formatStageLabel(currentStage || '')

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

  useEffect(() => {
    if (!open) return
    setTab(defaultTab)
    setStageMenuOpen(false)
    setNoteTitle('')
    setNoteBody('')
  }, [open, dealId, leadApiId, defaultTab])

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!stageMenuOpen) return undefined
    const onClick = (e) => {
      if (stageMenuRef.current && !stageMenuRef.current.contains(e.target)) {
        setStageMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [stageMenuOpen])

  if (typeof document === 'undefined' || !open || !opp) return null

  const fullName = lead?.contactName || card.fullName || 'Deal'
  const company = lead?.company || card.companyName || 'Unknown company'
  const dealDisplayName = String(card?.dealName || '').trim() || String(lead?.title || '').trim() || ''
  const jobTitle = lead?.designation || card.jobTitle || ''
  const email = lead?.email || card.email || ''
  const phoneDisplay =
    [lead?.phoneCountryCode, lead?.phone].filter(Boolean).join(' ').trim() ||
    card.phoneNumber ||
    ''
  const sourceName = lead?.source?.name || lead?.source || lead?.sourceName || null
  const tags = lead?.tags || card.tags || []
  const owner =
    (Array.isArray(lead?.assignedUsers) && lead.assignedUsers[0]) ||
    lead?.assignee ||
    card.owner ||
    null
  const dealValue = Number(isDealEntity ? card.dealValue ?? 0 : lead?.value ?? card.dealValue ?? 0)
  const dealCurrency = normalizeDealCurrency(
    isDealEntity ? card?.dealCurrency : lead?.valueCurrency ?? lead?.value_currency ?? card?.dealCurrency,
  )
  const dealDescription = String(lead?.requirement || card?.dealDescription || '').trim()

  async function handleStageChange(nextStage) {
    if (!nextStage || nextStage === currentStage) {
      setStageMenuOpen(false)
      return
    }
    try {
      if (dealId) {
        await patchDealStage({ id: dealId, currentStage: nextStage }).unwrap()
      } else {
        const status = opportunityStatuses.find((s) => s.name === nextStage)
        if (!status) return
        await patchOpportunityStatus({ id: leadApiId, opportunityStatusId: status.id }).unwrap()
      }
      toast.success(`Moved to ${formatStageLabel(nextStage)}`)
      setStageMenuOpen(false)
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.error || 'Could not update stage')
    }
  }

  async function submitNote() {
    if (!notePlainText(noteBody)) {
      toast.error('Note body cannot be empty')
      return
    }
    try {
      await createNote({ id: leadApiId, title: noteTitle.trim(), body: sanitizeNoteBody(noteBody) }).unwrap()
      setNoteTitle('')
      setNoteBody('')
      toast.success('Note added')
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.error || 'Could not add note')
    }
  }

  async function handleDeleteNote(noteId) {
    try {
      await deleteNote({ id: leadApiId, noteId }).unwrap()
      toast.success('Note deleted')
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.error || 'Could not delete note')
    }
  }

  async function submitDealActivity({ type, body }) {
    if (!dealId) return
    try {
      await createDealActivity({ id: dealId, type, body }).unwrap()
      toast.success('Activity logged')
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.error || 'Could not log activity')
    }
  }

  async function handleCompleteTask(task) {
    try {
      await patchTask({ id: leadApiId, taskId: task.id, status: 'completed' }).unwrap()
      toast.success('Task completed')
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.error || 'Could not update task')
    }
  }

  async function handleDeleteTask(task) {
    try {
      await deleteTask({ id: leadApiId, taskId: task.id }).unwrap()
      toast.success('Task deleted')
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.error || 'Could not delete task')
    }
  }

  async function handleTaskStatusChange(task, status) {
    try {
      await patchTask({
        id: leadApiId,
        taskId: task.id,
        status: normalizeTaskStatusForApi(status),
      }).unwrap()
      toast.success('Status updated')
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.error || 'Could not update status')
    }
  }

  async function handleUploadDocument(file, fileType) {
    if (!file) return
    try {
      await uploadDocument({
        file,
        name: file.name,
        fileType,
        links: [{ entityType: 'lead', entityId: leadApiId }],
      }).unwrap()
      toast.success(`${fileType === 'Proposal' ? 'Quotation' : fileType} uploaded`)
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.error || 'Could not upload file')
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deal-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-neutral-900/30 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
        aria-label="Close panel"
      />
      <div className="relative flex h-full max-h-dvh w-full max-w-full overflow-hidden bg-white shadow-xl animate-in slide-in-from-right duration-200 ease-out lg:max-w-[min(1180px,92vw)]">
        {/* Sidebar — compact, single violet accent */}
        <aside className="hidden h-full w-[248px] shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-neutral-50/60 scrollbar-subtle lg:flex xl:w-[268px]">
          <div className="flex flex-col gap-3 p-3.5">
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {tags.slice(0, 6).map((t, i) => {
                  const name = (typeof t === 'string' ? t : t?.name || '').toString()
                  if (!name) return null
                  return (
                    <span
                      key={`${name}-${i}`}
                      className="rounded-md border border-brand-200/90 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-700"
                    >
                      {name}
                    </span>
                  )
                })}
              </div>
            ) : null}

            <div className="rounded-xl border border-brand-200/70 bg-white p-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-brand-700 ring-1 ring-brand-200/70">
                    <BadgeDollarSign className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-brand-600">
                      Deal · #{shortDealId(card)}
                    </p>
                    <h2 id="deal-detail-title" className="mt-0.5 truncate text-[15px] font-semibold leading-snug text-neutral-900">
                      {dealDisplayName || company}
                    </h2>
                    {dealDisplayName ? (
                      <p className="truncate text-xs text-neutral-500">{company}</p>
                    ) : jobTitle ? (
                      <p className="truncate text-xs text-neutral-500">{jobTitle}</p>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/opportunities/${leadApiId}`)}
                  className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-brand-200 bg-white px-1.5 py-1 text-[10px] font-medium text-brand-700 hover:bg-slate-50"
                  title="Open full record"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open
                </button>
              </div>
              <div className="mt-3 flex items-end justify-between gap-2 border-t border-brand-100 pt-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-brand-600">
                  {currentStageLabel || 'Stage'}
                </p>
                <p className="text-right text-base font-semibold tabular-nums tracking-tight text-neutral-900">
                  {formatDealMoney(dealValue, dealCurrency)}
                </p>
              </div>
              {dealDescription ? (
                <div className="mt-2.5 border-t border-brand-100 pt-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-brand-600">Description</p>
                  <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-neutral-700">
                    {dealDescription}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-brand-600">Contact</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 rounded-md border border-neutral-200/80 bg-neutral-50/70 px-2.5 py-1.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-slate-50 text-[9px] font-semibold text-brand-700">
                    {initials(fullName)}
                  </span>
                  <p className="truncate text-xs font-medium text-neutral-900">{fullName}</p>
                </div>
                <ContactRow
                  Icon={Mail}
                  label="Email"
                  value={email}
                  href={email ? `mailto:${email}` : undefined}
                  tone="violet"
                  compact
                />
                <ContactRow
                  Icon={Phone}
                  label="Phone"
                  value={phoneDisplay}
                  href={phoneDisplay ? `tel:${phoneDisplay.replace(/\s+/g, '')}` : undefined}
                  tone="violet"
                  compact
                />
                <ContactRow Icon={Globe} label="Source" value={sourceName || ''} tone="violet" compact />
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-brand-600">Salesperson</p>
              {owner ? (
                <div className="flex items-center gap-2 rounded-md border border-neutral-200/80 bg-neutral-50/70 px-2.5 py-1.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-slate-50 text-[9px] font-semibold text-brand-700">
                    {initials(owner.name || owner.email)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-neutral-900">{owner.name || owner.email}</p>
                    {owner.email && owner.name ? (
                      <p className="truncate text-[10px] text-neutral-500">{owner.email}</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-neutral-300 bg-neutral-50/70 px-2.5 py-1.5 text-xs text-neutral-400">
                  Unassigned
                </p>
              )}
            </div>

            <p className="px-0.5 text-[10px] text-neutral-400">Created {formatDate(opp.createdAt)}</p>
          </div>
        </aside>

        {/* Main */}
        <section className="flex h-full min-w-0 flex-1 flex-col bg-neutral-50">
          <header className="flex shrink-0 items-center justify-end gap-3 border-b border-neutral-200 bg-white px-6 py-3 shadow-sm">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-50 hover:text-neutral-900"
            >
              Close
            </button>
          </header>

          <div className="shrink-0 border-b border-neutral-200 bg-white px-6 py-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-neutral-500">
                <span
                  ref={stageMenuRef}
                  className="inline-flex items-center gap-2 rounded-md border border-brand-200 bg-slate-50 px-2 py-1"
                >
                  <span className="text-xs uppercase tracking-wide text-brand-600">Stage</span>
                  <span className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => setStageMenuOpen((v) => !v)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm transition disabled:opacity-50',
                        TONE_CLASSES[stageTone(currentStage)]?.triggerActive ||
                          'border-neutral-200 bg-white text-neutral-700',
                        'hover:brightness-95',
                      )}
                      disabled={changingStage}
                      aria-haspopup="listbox"
                      aria-expanded={stageMenuOpen}
                    >
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full',
                          TONE_CLASSES[stageTone(currentStage)]?.active.split(' ')[0] || 'bg-neutral-400',
                        )}
                        aria-hidden
                      />
                      {currentStageLabel || 'Select stage'}
                      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                    </button>
                    {stageMenuOpen ? (
                      <div
                        className="absolute left-0 z-20 mt-1 max-h-72 w-64 overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg scrollbar-subtle"
                        role="listbox"
                      >
                        {stagesOrdered.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-neutral-400">No stages configured</p>
                        ) : (
                          stagesOrdered.map((s) => {
                            const tone = TONE_CLASSES[stageTone(s.name)] || TONE_CLASSES.indigo
                            const dotClass = tone.active.split(' ')[0] || 'bg-neutral-400'
                            const selected = s.name === currentStage
                            return (
                              <button
                                key={s.id || s.name}
                                type="button"
                                onClick={() => handleStageChange(s.name)}
                                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-50"
                                role="option"
                                aria-selected={selected}
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <span className={cn('h-2 w-2 rounded-full', dotClass)} aria-hidden />
                                  <span className="truncate">{formatStageLabel(s.name)}</span>
                                </span>
                                {selected ? <Check className="h-3.5 w-3.5 text-neutral-700" /> : null}
                              </button>
                            )
                          })
                        )}
                      </div>
                    ) : null}
                  </span>
                  {changingStage ? <span className="text-xs text-neutral-400">Updating…</span> : null}
                </span>
              </div>
              <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                In this stage for <span className="font-semibold text-amber-900">{timeInStage(opp)}</span>
              </p>
            </div>
          </div>

          <div className="shrink-0 border-b border-neutral-200 bg-white px-4 py-2 shadow-sm">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {TAB_DEFS.map((t) => {
                const active = tab === t.id
                const counts = {
                  activity: visibleActivities.length,
                  notes: notes.length,
                  tasks: tasks.length,
                  quotations: quotations.length,
                  invoices: invoices.length,
                }
                const count = counts[t.id]
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition',
                      active
                        ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900',
                    )}
                  >
                    {t.label}
                    {typeof count === 'number' && count > 0 ? (
                      <span
                        className={cn(
                          'rounded-full px-1.5 text-[10px] font-semibold',
                          active ? 'bg-white/15 text-white' : 'bg-neutral-100 text-neutral-600',
                        )}
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-neutral-50">
            {tab === 'activity' ? (
              <ActivityTab
                activities={visibleActivities}
                tasks={tasks}
                loading={loadingActivities}
                isDeal={isDealEntity}
                onLogActivity={isDealEntity ? submitDealActivity : null}
                loggingActivity={loggingDealActivity}
              />
            ) : tab === 'notes' ? (
              <NotesTab
                notes={notes}
                noteTitle={noteTitle}
                onNoteTitleChange={setNoteTitle}
                noteBody={noteBody}
                onNoteBodyChange={setNoteBody}
                onSubmit={submitNote}
                submitting={creatingNote}
                onDelete={handleDeleteNote}
              />
            ) : tab === 'tasks' ? (
              <TasksTab
                tasks={tasks}
                onCreate={() => {
                  setTaskDrawerTaskId(null)
                  setTaskDrawerOpen(true)
                }}
                onEdit={(task) => {
                  setTaskDrawerTaskId(task.id)
                  setTaskDrawerOpen(true)
                }}
                onComplete={handleCompleteTask}
                onDelete={handleDeleteTask}
                onChangeStatus={handleTaskStatusChange}
              />
            ) : tab === 'payments' ? (
              <DealPaymentsTab
                dealId={dealId}
                dealValue={dealValue}
                dealCurrency={dealCurrency}
              />
            ) : tab === 'quotations' ? (
              <DealQuotationsPanel
                leadId={leadApiId}
                dealId={dealId}
                proposalDocs={quotations}
                uploadingProposal={uploadingDocument}
                onUploadProposal={(file) => handleUploadDocument(file, 'Proposal')}
              />
            ) : tab === 'invoices' ? (
              <DealInvoicesPanel
                leadId={leadApiId}
                dealId={dealId}
                invoiceFileDocs={invoices}
                uploadingInvoiceFile={uploadingDocument}
                onUploadInvoiceFile={(file) => handleUploadDocument(file, 'Invoice')}
              />
            ) : null}
          </div>
        </section>
      </div>

      <LeadTaskDrawer
        open={taskDrawerOpen}
        onClose={() => {
          setTaskDrawerOpen(false)
          setTaskDrawerTaskId(null)
        }}
        leadId={leadApiId}
        task={taskDrawerTaskId ? tasks.find((t) => t.id === taskDrawerTaskId) ?? null : null}
        leadTitle={fullName}
      />
    </div>,
    document.body,
  )
}

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'note', label: 'Note' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'task', label: 'Task' },
]

function ActivityComposer({ onSubmit, submitting }) {
  const [type, setType] = useState('note')
  const [body, setBody] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!body.trim()) return
    await onSubmit({ type, body: body.trim() })
    setBody('')
  }

  return (
    <form onSubmit={handleSubmit} className="shrink-0 border-t border-neutral-200 bg-white px-5 py-3">
      <div className="mb-2 flex items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-xs font-medium text-neutral-700 focus:outline-none"
        >
          {ACTIVITY_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Log a note, call, email or meeting…"
        rows={2}
        className="min-h-[60px] w-full resize-none rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm focus:border-neutral-400 focus:outline-none"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-900 bg-neutral-900 px-4 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {submitting ? 'Saving…' : 'Log'}
        </button>
      </div>
    </form>
  )
}

function ActivityTab({ activities, tasks, loading, isDeal = false, onLogActivity = null, loggingActivity = false }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Latest activity {activities.length > 0 ? `(${activities.length})` : ''}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-50 px-5 py-4 scrollbar-subtle">
        {loading && activities.length === 0 ? (
          <p className="text-center text-xs text-neutral-400">Loading activity…</p>
        ) : activities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-neutral-700">No activity yet</p>
            <p className="mt-1 text-xs text-neutral-400">Use the composer below to log a note, call, email, or meeting.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {activities.map((activity, index) => {
              const isNote = activity.type === 'note'
              const metadata = activity.metadata || {}
              const plainBody = activityPlainBody(activity.body || '')
              const detailRaw = (metadata.description || activity.body || '').trim()
              const headlineText = isNote
                ? metadata.title?.trim() || 'Note added'
                : plainBody || 'Activity'
              const styleKey = detectActivityVisualKey(activity, headlineText, detailRaw)
              const presentation = activityPresentation(styleKey)
              const Icon = presentation.Icon
              const isTask = styleKey === 'task' || activity.type === 'task'
              const isFollowUp =
                !isTask &&
                (styleKey === 'follow_up' || /follow[- ]?up|reminder/i.test(`${headlineText} ${detailRaw}`))
              const followUpAt = isFollowUp ? parseFollowUpTime(activity, headlineText, detailRaw) : null
              const displayHeadline =
                isFollowUp && followUpAt
                  ? headlineText.replace(
                      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/,
                      activityDateTimeLabel(followUpAt),
                    )
                  : headlineText
              const normalizedHeadline = String(displayHeadline || '').trim().toLowerCase()
              const normalizedDetail = String(detailRaw || '').trim().toLowerCase()
              const shouldShowDetail = Boolean(detailRaw) && normalizedDetail !== normalizedHeadline
              const renderNoteHtml = isNote && Boolean(detailRaw)
              const linkedTask =
                (metadata.taskId ? tasks.find((t) => t.id === metadata.taskId) : null) ||
                (metadata.title ? tasks.find((t) => String(t.title || '').trim() === String(metadata.title || '').trim()) : null) ||
                null
              const currentDayKey = activityDayKey(activity.createdAt)
              const previousDayKey = index > 0 ? activityDayKey(activities[index - 1].createdAt) : null
              const showDayMarker = index === 0 || currentDayKey !== previousDayKey

              return (
                <li key={activity.id}>
                  {showDayMarker ? (
                    <p className="mb-1.5 mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">
                      {activityDayLabel(activity.createdAt)}
                    </p>
                  ) : null}
                  <article className={cn('flex gap-2.5 rounded-lg border p-2.5 shadow-sm', presentation.card)}>
                    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', presentation.iconWrap)}>
                      <Icon className="h-3 w-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-neutral-900">{displayHeadline}</p>
                        <p className="text-[10px] text-neutral-500">{activityTimeLabel(activity.createdAt)}</p>
                      </div>
                      {isFollowUp && followUpAt ? (
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                            {countdownLabel(followUpAt)}
                          </span>
                          <span className="text-[10px] text-neutral-500">at {activityDateTimeLabel(followUpAt)}</span>
                        </div>
                      ) : null}
                      {shouldShowDetail ? (
                        renderNoteHtml ? (
                          <div
                            className="prose prose-sm mt-1 max-w-none text-[11px] leading-snug text-neutral-700 prose-p:my-0.5 prose-headings:my-0.5"
                            dangerouslySetInnerHTML={{ __html: sanitizeNoteBody(noteBodyToInitialHtml(detailRaw)) }}
                          />
                        ) : (
                          <p className="mt-1 text-[11px] leading-snug text-neutral-600">{detailRaw}</p>
                        )
                      ) : null}
                      {isTask && linkedTask ? (
                        <div className="mt-1.5 grid gap-0.5 rounded-md border border-white/60 bg-white/60 p-1.5 text-[10px] text-neutral-600 sm:grid-cols-2">
                          <p>
                            Assigned to: <span className="font-medium text-neutral-900">{linkedTask.assignee?.name || 'Unassigned'}</span>
                          </p>
                          <p>
                            Due: <span className="font-medium text-neutral-900">{linkedTask.dueAt ? activityDateTimeLabel(linkedTask.dueAt) : '—'}</span>
                          </p>
                        </div>
                      ) : null}
                      <p className="mt-1 text-right text-[9px] font-medium text-neutral-400">
                        by {activity.user?.name || 'System'}
                      </p>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {isDeal && onLogActivity ? (
        <ActivityComposer onSubmit={onLogActivity} submitting={loggingActivity} />
      ) : null}
    </section>
  )
}

function NotesTab({ notes, noteTitle, onNoteTitleChange, noteBody, onNoteBodyChange, onSubmit, submitting, onDelete }) {
  const [showComposer, setShowComposer] = useState(false)

  function handleSubmit() {
    onSubmit()
    setShowComposer(false)
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Notes</p>
        {!showComposer && (
          <button
            type="button"
            onClick={() => setShowComposer(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add note
          </button>
        )}
      </div>

      {showComposer && (
        <div className="shrink-0 border-b border-neutral-200 bg-white p-3">
          <input
            value={noteTitle}
            onChange={(e) => onNoteTitleChange(e.target.value)}
            placeholder="Note title (optional)"
            autoFocus
            className="mb-2 h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-800 shadow-sm focus:border-neutral-400 focus:outline-none"
          />
          <textarea
            value={noteBody}
            onChange={(e) => onNoteBodyChange(e.target.value)}
            placeholder="Write a note…"
            rows={3}
            className="min-h-[80px] w-full resize-none rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm focus:border-neutral-400 focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowComposer(false)}
              className="inline-flex h-9 items-center rounded-md border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !noteBody.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-900 bg-neutral-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              {submitting ? 'Saving…' : 'Add note'}
            </button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-50 px-5 py-4 scrollbar-subtle">
        {notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-neutral-700">No notes yet</p>
            <p className="mt-1 text-xs text-neutral-400">Add a note above and it will appear here.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => {
              const html = sanitizeNoteBody(noteBodyToInitialHtml(note.body || ''))
              const hasBody = Boolean(notePlainText(note.body || ''))
              return (
                <li
                  key={note.id}
                  className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">
                        {note.metadata?.title || 'Note'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-neutral-500">
                        By {note.user?.name || 'System'} · {formatDate(note.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDelete(note.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-rose-200 bg-white text-rose-600 shadow-sm hover:bg-rose-50"
                      aria-label="Delete note"
                      title="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {hasBody ? (
                    <div
                      className="prose prose-sm mt-3 max-w-none rounded-lg border border-amber-100 bg-white/90 p-3 text-xs leading-relaxed text-neutral-800 prose-p:my-1 prose-headings:my-1"
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  ) : (
                    <p className="mt-3 text-xs italic text-neutral-400">Empty note</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

function TasksTab({ tasks, onCreate, onEdit, onComplete, onDelete, onChangeStatus }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Tasks</p>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Add task
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-50 px-5 py-4 scrollbar-subtle">
        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-neutral-700">No tasks yet</p>
            <p className="mt-1 text-xs text-neutral-400">Use Add task to create one, or click a task below after they appear to manage every field.</p>
          </div>
        ) : (
          <ul className="space-y-5">
            {tasks.map((task) => {
              const subs = task.subtasks || []
              const commentCount = (task.comments || []).length
              const dueAt = task.dueAt ? new Date(task.dueAt) : null
              const dueParts = formatTaskDueParts(task.dueAt)
              const isCompleted = task.status === 'completed' || task.status === 'cancelled'
              const isOverdue = Boolean(dueAt && !isCompleted && dueAt.getTime() < Date.now())
              const statusValue = selectStatusValue(task.status)

              return (
                <li key={task.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onEdit(task)
                      }
                    }}
                    onClick={() => onEdit(task)}
                    className={cn(
                      'w-full cursor-pointer rounded-xl border-2 bg-white text-left shadow-md transition hover:border-brand-300 hover:shadow-lg',
                      isOverdue ? 'border-rose-300 border-l-4 border-l-rose-500' : 'border-neutral-300',
                    )}
                  >
                    <div
                      className="border-b-2 border-neutral-200 bg-neutral-50/80 px-3 py-2.5 sm:px-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="rounded-md bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-900">
                            {taskTypeLabel(task.taskType)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                            <TaskPriorityIcon priority={task.priority} />
                            {task.priority || '—'}
                          </span>
                          <TaskStatusPill value={task.status} />
                          {isOverdue ? <TaskOverdueBadge /> : null}
                          {task.recurrenceRule ? <TaskRecurrenceIcon rule={task.recurrenceRule} /> : null}
                          <TaskAttachmentIcons attachments={task.attachments} />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Status</span>
                            <select
                              value={statusValue}
                              onChange={(e) => onChangeStatus?.(task, e.target.value)}
                              className="h-8 min-w-[8.5rem] rounded-md border border-neutral-300 bg-white px-2 text-xs font-medium text-neutral-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-400/30"
                              aria-label="Change task status"
                            >
                              {LEAD_TASK_STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          {task.status !== 'completed' && task.status !== 'cancelled' ? (
                            <button
                              type="button"
                              className="h-8 rounded-md border border-emerald-200 bg-white px-2.5 text-xs font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50"
                              onClick={() => onComplete(task)}
                            >
                              Mark complete
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="h-8 rounded-md border border-rose-200 bg-white px-2.5 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-50"
                            onClick={() => onDelete(task)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 px-3 py-3 sm:px-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Task</p>
                        <p
                          className={cn(
                            'mt-0.5 text-base font-semibold leading-snug text-neutral-900',
                            isCompleted && 'text-neutral-400 line-through',
                          )}
                        >
                          {task.title || 'Untitled task'}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-neutral-200 bg-gradient-to-b from-white to-neutral-50/80 p-3 shadow-sm">
                          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                            <UserCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Created by
                          </p>
                          <p className="mt-2 text-sm font-semibold text-neutral-900">{task.creator?.name || 'System'}</p>
                          <p className="mt-0.5 text-[11px] text-neutral-500">Who created this task</p>
                        </div>
                        <div className="rounded-lg border border-neutral-200 bg-gradient-to-b from-white to-neutral-50/80 p-3 shadow-sm">
                          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                            <UserCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Assigned to
                          </p>
                          <p className="mt-2 text-sm font-semibold text-neutral-900">{task.assignee?.name || 'Unassigned'}</p>
                          <p className="mt-0.5 text-[11px] text-neutral-500">Responsible user</p>
                        </div>
                      </div>

                      <div
                        className={cn(
                          'flex flex-row items-start justify-between gap-3 rounded-lg border p-3 shadow-sm',
                          isOverdue
                            ? 'border-rose-200 bg-gradient-to-b from-rose-50/90 to-white'
                            : 'border-neutral-200 bg-gradient-to-b from-white to-neutral-50/80',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                            <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Due date
                          </p>
                          <p className={cn('mt-2 text-sm font-semibold', isOverdue ? 'text-rose-800' : 'text-neutral-900')}>
                            {dueParts.dateLine}
                          </p>
                          {dueParts.timeLine ? <p className="mt-0.5 text-[11px] text-neutral-500">{dueParts.timeLine}</p> : null}
                          {task.startAt ? (
                            <p className="mt-1.5 text-[11px] text-neutral-500">
                              Start: {formatDate(task.startAt)}
                            </p>
                          ) : null}
                          {isOverdue ? <p className="mt-1.5 text-[11px] font-medium text-rose-700">Overdue</p> : null}
                        </div>
                        {dueAt && !isCompleted ? (
                          <div className="flex shrink-0 flex-col items-end pt-0.5">
                            <span
                              className={cn(
                                'whitespace-nowrap rounded-full border px-2.5 py-1.5 text-center text-[11px] font-bold tabular-nums leading-tight tracking-tight',
                                isOverdue
                                  ? 'border-rose-200 bg-rose-100 text-rose-900'
                                  : 'border-sky-200 bg-sky-100 text-sky-900',
                              )}
                              title="Time until due"
                            >
                              {countdownLabel(dueAt)}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {task.description ? (
                        <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 px-3 py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Description</p>
                          <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-neutral-700">{task.description}</p>
                        </div>
                      ) : null}

                      {subs.length ? (
                        <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Checklist</p>
                          <ul className="mt-2 space-y-1.5">
                            {subs.slice(0, 6).map((subtask, index) => (
                              <li key={`${task.id}-sub-${subtask.id || index}`}>
                                <div className="flex items-start justify-between gap-2 rounded-md border border-neutral-100 bg-neutral-50/80 px-2 py-1.5 text-xs text-neutral-700">
                                  <label className="flex items-start gap-2">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(subtask.done)}
                                      readOnly
                                      className="mt-0.5 h-3.5 w-3.5 rounded border-neutral-300 text-emerald-600"
                                    />
                                    <span className={subtask.done ? 'text-neutral-400 line-through' : ''}>
                                      {subtask.title || 'Untitled'}
                                    </span>
                                  </label>
                                  <span
                                    className={cn(
                                      'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                                      subtask.done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
                                    )}
                                  >
                                    {subtask.done ? 'Done' : 'Pending'}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                          {subs.length > 6 ? (
                            <p className="mt-1.5 text-[11px] text-neutral-500">+{subs.length - 6} more in task details</p>
                          ) : null}
                        </div>
                      ) : null}

                      {commentCount > 0 ? (
                        <p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                          <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {commentCount} comment{commentCount === 1 ? '' : 's'}
                        </p>
                      ) : null}

                      <p className="text-[10px] text-neutral-400">Click anywhere on this card to open full details, subtasks, comments, and attachments.</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

export default DealDetailPanel
