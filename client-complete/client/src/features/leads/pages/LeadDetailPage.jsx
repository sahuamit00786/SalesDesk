import { useEffect, useMemo, useState, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import toast from 'react-hot-toast'
import {
  BadgeDollarSign,
  BadgeIndianRupee,
  Bell,
  CalendarCheck2,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  Copy,
  FileText,
  Flag,
  Plus,
  PartyPopper,
  Hash,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Presentation,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  Tag,
  Trash2,
  User,
  UserCheck,
  UserCircle2,
  X,
  Zap,
} from '@/components/ui/icons'
import { PageShell } from '@/components/layout/PageShell'
import { SkeletonDetail } from '@/components/shared/SkeletonLoader'
import { Select } from '@/components/ui/Select'
import { IconInput, IconTextarea } from '@/components/ui/IconInput'
import { LeadEmailComposeModal } from '@/features/leads/components/LeadEmailComposeModal'
import { AddLeadModal } from '@/features/leads/components/AddLeadModal'
import { TaskAttachmentIcons } from '@/features/leads/components/TaskAttachmentIcons'
import { LeadFollowupsTab } from '@/features/leads/components/LeadFollowupsTab'
import { LeadTabEmptyState, LeadTabSectionHeader } from '@/features/leads/components/LeadTabSectionHeader'
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
import { AssigneeCell } from '@/features/leads/components/AssigneeCell'
import { CustomFieldsDisplay } from '@/features/leads/components/CustomFieldsDisplay'
import { mapCustomFieldValuesFromLead } from '@/features/leads/customFieldTypes'
import { getFileUrl } from '@/features/documents/documentUtils'
import { useUploadDocumentMutation, useGetDocumentsQuery } from '@/features/documents/documentsApi'
import { LeadFilesBrowser, LeadFilesPanel } from '@/features/leads/components/LeadFilesBrowser'
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
  usePatchLeadStatusMutation,
  usePatchLeadTaskMutation,
  useSyncLeadEmailsMutation,
  useUpdateLeadMutation,
  leadsApi,
} from '@/features/leads/leadsApi'
import { STATUS_OPTIONS } from '@/features/leads/constants'
import GmailThreadList from '@/features/gmail/GmailThreadList'
import GmailThreadView from '@/features/gmail/GmailThreadView'
import { parseStoredThread } from '@/features/gmail/gmailParserUtils'
import { formatStageLabel as formatPipelineStageLabel } from '@/features/opportunities/components/OpportunitiesKanban'
import { useCreateOpportunityMutation, usePatchPipelineStatusMutation, useRevertOpportunityToLeadMutation } from '@/features/opportunities/opportunitiesApi'
import { AddDealDrawer } from '@/features/deals/components/AddDealDrawer'
import { DealDetailPanel } from '@/features/deals/components/DealDetailPanel'
import { DealQuotationsPanel, DealInvoicesPanel } from '@/features/deals/components/DealSalesDocsTabs'
import { LeadPaymentsTab } from '@/features/leads/components/LeadPaymentsTab'
import { formatDealMoney } from '@/features/deals/dealCurrencies'
import { useGetDealsQuery, useDeleteDealMutation } from '@/features/deals/dealsApi'
import { useGetCallsQuery, CALL_OUTCOMES } from '@/features/calls/callsApi'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { parsePhoneNumber } from 'libphonenumber-js/min'
import { digitsOnlyE164, inferE164FromStored, mergePartsToE164 } from '@/utils/phoneNumbers'

import {
  useGetMeetingsQuery,
  useDeleteMeetingMutation,
} from '@/features/meetings/meetingsApi'
import { CreateMeetingModal } from '@/features/meetings/components/CreateMeetingModal'

const NOTE_HTML = {
  ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'a', 'img'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt'],
}

function formatStatusLabel(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function sanitizeNoteBody(html) {
  return DOMPurify.sanitize(html || '', NOTE_HTML)
}

function notePlainText(html) {
  const div = document.createElement('div')
  div.innerHTML = sanitizeNoteBody(html)
  return (div.textContent || '').trim()
}

/** True if the note has visible text or a kept image/link after sanitization */
function noteHasRenderableContent(html) {
  const sanitized = sanitizeNoteBody(html || '')
  const div = document.createElement('div')
  div.innerHTML = sanitized
  if ((div.textContent || '').trim()) return true
  if (div.querySelector('img[src]')) return true
  if (div.querySelector('a[href]')) return true
  return false
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

/** Sanitize note HTML and fix upload paths so images/links resolve in the browser. */
function sanitizeNoteHtmlForDisplay(raw) {
  const clean = sanitizeNoteBody(noteBodyToInitialHtml(raw || ''))
  const div = document.createElement('div')
  div.innerHTML = clean
  div.querySelectorAll('img[src]').forEach((img) => {
    const cur = (img.getAttribute('src') || '').trim()
    const next = getFileUrl(cur) || cur
    if (next) img.setAttribute('src', next)
  })
  div.querySelectorAll('a[href]').forEach((a) => {
    const cur = (a.getAttribute('href') || '').trim()
    const next = getFileUrl(cur) || cur
    if (next) a.setAttribute('href', next)
  })
  return div.innerHTML
}

/** Pull img / upload links from sanitized note HTML for compact attachment chips. */
function extractNoteEmbedsFromSanitizedHtml(html) {
  if (typeof document === 'undefined') return []
  const div = document.createElement('div')
  div.innerHTML = String(html || '')
  const out = []
  let i = 0
  div.querySelectorAll('img[src]').forEach((img) => {
    const src = (img.getAttribute('src') || '').trim()
    if (!src) return
    const name = (img.getAttribute('alt') || '').trim() || 'Image'
    out.push({ id: `note-embed-${i++}`, name, filePath: src })
  })
  div.querySelectorAll('a[href]').forEach((a) => {
    const href = (a.getAttribute('href') || '').trim()
    if (!href.includes('/uploads/')) return
    const name = (a.textContent || '').trim() || 'Attachment'
    out.push({ id: `note-embed-${i++}`, name, filePath: href })
  })
  return out
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
    iconWrap: 'bg-brand-100 text-brand-700',
    chip: 'border-brand-200 bg-brand-50 text-brand-800',
    card: 'bg-brand-50',
  },
  email: {
    label: 'Email',
    Icon: Mail,
    iconWrap: 'bg-brand-100 text-brand-700',
    chip: 'border-brand-200 bg-brand-50 text-brand-800',
    card: 'bg-brand-50',
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
    iconWrap: 'bg-slate-100 text-brand-700',
    chip: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800',
    card: 'bg-slate-50',
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
    iconWrap: 'bg-slate-100 text-brand-700',
    chip: 'border-brand-200 bg-slate-50 text-brand-800',
    card: 'bg-slate-50',
  },
  system: {
    label: 'Activity',
    Icon: Sparkles,
    iconWrap: 'bg-indigo-100 text-indigo-600',
    chip: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    card: 'bg-indigo-50/60',
  },
  created: {
    label: 'Created',
    Icon: PartyPopper,
    iconWrap: 'bg-emerald-100 text-emerald-600',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    card: 'bg-emerald-50/70',
  },
  converted: {
    label: 'Converted',
    Icon: Rocket,
    iconWrap: 'bg-amber-100 text-amber-600',
    chip: 'border-amber-200 bg-amber-50 text-amber-700',
    card: 'bg-amber-50/70',
  },
  assigned: {
    label: 'Assigned',
    Icon: UserCheck,
    iconWrap: 'bg-violet-100 text-violet-600',
    chip: 'border-violet-200 bg-violet-50 text-violet-700',
    card: 'bg-violet-50/70',
  },
  automation: {
    label: 'Automation',
    Icon: Zap,
    iconWrap: 'bg-fuchsia-100 text-fuchsia-600',
    chip: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
    card: 'bg-fuchsia-50/70',
  },
  updated: {
    label: 'Updated',
    Icon: RefreshCw,
    iconWrap: 'bg-blue-100 text-blue-600',
    chip: 'border-blue-200 bg-blue-50 text-blue-700',
    card: 'bg-blue-50/70',
  },
  status_change: {
    label: 'Status changed',
    Icon: RefreshCw,
    iconWrap: 'bg-amber-100 text-amber-600',
    chip: 'border-amber-200 bg-amber-50 text-amber-700',
    card: 'bg-amber-50/70',
  },
  document: {
    label: 'Document',
    Icon: FileText,
    iconWrap: 'bg-teal-100 text-teal-600',
    chip: 'border-teal-200 bg-teal-50 text-teal-700',
    card: 'bg-teal-50/70',
  },
  duplicate: {
    label: 'Import',
    Icon: Copy,
    iconWrap: 'bg-orange-100 text-orange-600',
    chip: 'border-orange-200 bg-orange-50 text-orange-700',
    card: 'bg-orange-50/70',
  },
  payment: {
    label: 'Payment',
    Icon: BadgeDollarSign,
    iconWrap: 'bg-emerald-100 text-emerald-700',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    card: 'bg-emerald-50',
  },
  web_form: {
    label: 'Form submission',
    Icon: ClipboardList,
    iconWrap: 'bg-violet-100 text-violet-700',
    chip: 'border-violet-200 bg-violet-50 text-violet-800',
    card: 'bg-violet-50',
  },
}

function activityPresentation(activityType) {
  return ACTIVITY_STYLE[activityType] || ACTIVITY_STYLE.system
}

/** Map `metadata.action` from system activities → timeline visual bucket (before loose text heuristics). */
function inferStyleKeyFromSystemAction(action) {
  const a = String(action || '').toLowerCase()
  if (!a) return null
  if (a.startsWith('task_')) return 'task'
  if (a.startsWith('note_')) return 'note'
  if (a.startsWith('followup_')) return 'follow_up'
  if (a === 'payment_recorded' || a === 'deal_payment_recorded' || a === 'campaign_payment_recorded') return 'payment'
  if (a === 'lead_created' || a === 'deal_created' || a === 'created_from_duplicate') return 'created'
  if (a === 'converted_to_opportunity') return 'converted'
  if (a === 'owner_reassigned' || a === 'workflow_assign_owner') return 'assigned'
  if (a.startsWith('workflow_triggers_') || a === 'workflow_create_task' || a === 'workflow_create_followup' || a === 'workflow_send_email') return 'automation'
  if (a === 'lead_status_changed') return 'status_change'
  if (a === 'lead_field_changed' || a === 'lead_collaborators_changed' || a === 'deal_stage_changed' || a === 'pipeline_status_changed' || a === 'opportunity_status_changed') return 'updated'
  if (a === 'quotation_created' || a === 'invoice_created') return 'document'
  if (a === 'document_uploaded' || a === 'document_moved' || a === 'document_deleted') return 'document'
  if (a === 'lead_imported_csv' || a === 'duplicate_merged') return 'duplicate'
  return null
}

function detectActivityVisualKey(activity, headline = '', detail = '') {
  const md = activity?.metadata || {}
  if (md.source === 'web_form') return 'web_form'
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

function formatTaskDueParts(value) {
  if (!value) return { dateLine: '—', timeLine: null }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return { dateLine: '—', timeLine: null }
  const dateLine = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const timeLine = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return { dateLine, timeLine }
}

/** One-line completed timestamp for task meta row (lead task cards). */
function formatTaskCompletedAtLine(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
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
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-ink-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        {href && value !== '-' ? (
          <a href={href} className="mt-0.5 block break-all text-[13px] font-medium text-ink hover:text-brand-700">
            {value}
          </a>
        ) : (
          <p className="mt-0.5 break-words text-[13px] font-medium text-ink">{value}</p>
        )}
      </div>
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

/** Relative to `nowMs` (updated on an interval) so task cards can show a live-ish countdown without calling Date.now during render. */
function taskDueTimerPhrase(dueValue, taskStatus, nowMs) {
  if (!dueValue) return null
  const s = String(taskStatus || '').toLowerCase()
  if (s === 'completed' || s === 'cancelled') return null
  const d = dueValue instanceof Date ? dueValue : new Date(dueValue)
  if (Number.isNaN(d.getTime())) return null
  const diff = d.getTime() - nowMs
  if (diff < 0) {
    const ago = Math.floor(-diff / 60000)
    const days = Math.floor(ago / (60 * 24))
    if (days >= 1) return `${days}d overdue`
    const hours = Math.floor(ago / 60)
    if (hours >= 1) return `${hours}h overdue`
    if (ago < 1) return 'Overdue now'
    return `${ago}m overdue`
  }
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

function TaskSubtasksProgressRing({ done, total, size = 42 }) {
  if (!total) return null
  const stroke = 3
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, (done / total) * 100))
  const offset = c - (pct / 100) * c
  const cx = size / 2
  const cy = size / 2
  return (
    <div
      className="relative shrink-0 text-brand-600"
      style={{ width: size, height: size }}
      title={`${done} of ${total} subtasks completed`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={cx} cy={cy} r={r} fill="none" className="stroke-slate-200" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          className="stroke-current transition-[stroke-dashoffset] duration-300"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[11px] font-bold tabular-nums text-ink">{done}</span>
        <span className="text-[9px] font-semibold text-ink-muted">/{total}</span>
      </span>
    </div>
  )
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

export function LeadDetailPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const isPipelineDealRoute = location.pathname.startsWith('/opportunities/')
  const [activeTab, setActiveTab] = useState(() => {
    const t = new URLSearchParams(location.search).get('tab')
    return t || 'activity'
  })
  const [profileInfoTab, setProfileInfoTab] = useState('lead')
  const [draft, setDraft] = useState('')
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false)
  const [taskDrawerTaskId, setTaskDrawerTaskId] = useState(null)
  const [noteTitle, setNoteTitle] = useState('')
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState(null)
  const [mailboxView, setMailboxView] = useState('inbox')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [noteEditorVersion, setNoteEditorVersion] = useState(0)
  const [lostReason, setLostReason] = useState('')
  const [convertingToOpportunity, setConvertingToOpportunity] = useState(false)
  const [editLeadOpen, setEditLeadOpen] = useState(false)
  const [selectedTags, setSelectedTags] = useState([])
  const [pipelineSaving, setPipelineSaving] = useState(false)
  const [addDealDrawerOpen, setAddDealDrawerOpen] = useState(false)
  const [dealPanelOpp, setDealPanelOpp] = useState(null)
  const [editingDeal, setEditingDeal] = useState(null)
  const [dealMenuOpenId, setDealMenuOpenId] = useState(null)
  const [deleteDealConfirm, setDeleteDealConfirm] = useState(null)
  const [deleteDeal, { isLoading: deletingDeal }] = useDeleteDealMutation()
  const [createMeetingModalOpen, setCreateMeetingModalOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState(null)
  const [callLogModalOpen, setCallLogModalOpen] = useState(false)
  const [callLogBody, setCallLogBody] = useState('')
  const [noteComposerOpen, setNoteComposerOpen] = useState(false)
  /** Refreshes meeting status badges / join affordance without calling Date.now() during render. */
  const [meetingListNow, setMeetingListNow] = useState(() => Date.now())

  const { data, isLoading } = useGetLeadQuery(id)
  const { data: formMetaData } = useGetLeadFormMetaQuery()
  const { data: activityData } = useGetLeadActivitiesQuery({ id, page: 1, limit: 100 }, { skip: !id })
  const { data: taskData } = useGetLeadTasksQuery(id, { skip: !id })
  const { data: googleEmailStatus, isFetching: fetchingGoogleStatus } = useGetGoogleEmailStatusQuery()
  const googleEmailConnected = Boolean(googleEmailStatus?.data?.connected)
  const emailsTabActive = activeTab === 'emails'
  const { data: emailThreadsData } = useGetLeadEmailThreadsQuery(id, {
    skip: !id || !googleEmailConnected || !emailsTabActive,
  })
  const { data: threadData } = useGetLeadEmailThreadQuery(
    { id, threadId: selectedThreadId },
    { skip: !id || !selectedThreadId || !googleEmailConnected || !emailsTabActive,
    },
  )
  const { data: notesData } = useGetLeadNotesQuery(id, { skip: !id })
  const { data: filesData } = useGetLeadFilesQuery(id, { skip: !id })

  const [addDocumentOpen, setAddDocumentOpen] = useState(false)
  const billingTabActive = activeTab === 'billing'
  const { data: proposalDocsData } = useGetDocumentsQuery(
    { leadId: id, fileType: 'Proposal' },
    { skip: !id || !billingTabActive },
  )
  const { data: invoiceDocsData } = useGetDocumentsQuery(
    { leadId: id, fileType: 'Invoice' },
    { skip: !id || !billingTabActive },
  )
  const proposalFileDocs = proposalDocsData?.data || []
  const invoiceFileDocs = invoiceDocsData?.data || []

  const [createActivity, { isLoading: creatingActivity }] = useCreateLeadActivityMutation()
  const [createNote, { isLoading: creatingNote }] = useCreateLeadNoteMutation()
  const [patchNote, { isLoading: patchingNote }] = usePatchLeadNoteMutation()
  const [deleteNote] = useDeleteLeadNoteMutation()
  const [uploadDocumentForNote] = useUploadDocumentMutation()
  const [syncLeadEmails, { isLoading: syncingEmails }] = useSyncLeadEmailsMutation()
  const [patchTask] = usePatchLeadTaskMutation()
  const [deleteTask] = useDeleteLeadTaskMutation()
  const [updateLead] = useUpdateLeadMutation()
  const [createLeadTag] = useCreateLeadTagMutation()
  const [createOpportunity] = useCreateOpportunityMutation()
  const [patchPipelineStatus] = usePatchPipelineStatusMutation()
  const [revertOpportunityToLead, { isLoading: revertingToLead }] = useRevertOpportunityToLeadMutation()
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false)
  const [patchLeadStatus] = usePatchLeadStatusMutation()
  const [leadStatusSaving, setLeadStatusSaving] = useState(false)

  const lead = data?.data
  const summary = data?.meta?.summary || {}
  const activities = activityData?.data || []
  const tasks = taskData?.data || []
  const tasksSortedForList = useMemo(() => {
    const list = [...tasks]
    const isTerminal = (s) => {
      const x = String(s || '').toLowerCase()
      return x === 'completed' || x === 'cancelled'
    }
    list.sort((a, b) => {
      const ta = isTerminal(a.status)
      const tb = isTerminal(b.status)
      if (ta !== tb) return ta ? 1 : -1
      const da = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY
      const db = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY
      if (da !== db) return da - db
      return String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' })
    })
    return list
  }, [tasks])
  const emailThreads = emailThreadsData?.data || []
  const selectedThread = threadData?.data || []
  const notes = notesData?.data || []
  const leadFiles = filesData?.data || []

  useEffect(() => {
    if (!googleEmailConnected) setSelectedThreadId(null)
  }, [googleEmailConnected])

  useEffect(() => {
    const t = window.setInterval(() => setMeetingListNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const { data: meetingsData } = useGetMeetingsQuery(
    { leadId: id },
    { skip: !id },
  )
  const [deleteMeeting] = useDeleteMeetingMutation()
  const meetings = meetingsData?.data || []

  const { data: callLogsData } = useGetCallsQuery({ leadId: id }, { skip: !id })
  const leadCallLogs = callLogsData?.data || []

  const tabs = useMemo(() => {
    const base = [
      { id: 'activity', label: 'Activity' },
      { id: 'calls', label: 'Calls' },
      { id: 'emails', label: 'Emails' },
      { id: 'tasks', label: 'Tasks' },
      { id: 'followups', label: 'Follow-ups' },
      { id: 'notes', label: 'Notes' },
      { id: 'meetings', label: 'Meetings' },
      { id: 'documents', label: 'Documents' },
      { id: 'billing', label: 'Billing' },
      { id: 'payments', label: 'Payments' },
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
      emailThreads.map((thread) => {
        const senderEmail = thread.lastFromEmail || ''
        const senderName = thread.lastDirection === 'outbound' ? 'You' : (senderEmail || 'Lead')
        const initials = senderName === 'You' ? 'YO' : (senderEmail ? senderEmail.slice(0, 2).toUpperCase() : 'LD')
        return {
          ...thread,
          id: thread.threadId,
          messages: [],
          participants: [],
          messageCount: thread.count || 0,
          hasAttachments: false,
          lastDateFormatted: emailTimeLabel(thread.lastMessageAt),
          snippet: thread.preview || '',
          lastMessage: { from: { name: senderName, email: senderEmail, initials } },
        }
      }),
    [emailThreads],
  )
  const inboxThreads = useMemo(() => parsedThreads.filter((t) => t.hasInbound), [parsedThreads])
  const outboxThreads = useMemo(() => parsedThreads.filter((t) => !t.hasInbound), [parsedThreads])
  const visibleThreads = mailboxView === 'inbox' ? inboxThreads : outboxThreads
  const parsedSelectedThread = useMemo(() => parseStoredThread(selectedThread), [selectedThread])
  const activeThread = selectedThreadId ? parsedSelectedThread : null
  const drawerTask = useMemo(
    () => (taskDrawerTaskId ? tasks.find((t) => t.id === taskDrawerTaskId) ?? null : null),
    [taskDrawerTaskId, tasks],
  )

  const pipelineStatuses = useMemo(() => {
    const rows = formMetaData?.data?.pipelineStatuses || []
    return [...rows].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
  }, [formMetaData])

  const availableTags = useMemo(
    () => formMetaData?.data?.tags || [],
    [formMetaData],
  )

  const customFieldDefs = useMemo(
    () => formMetaData?.data?.customFields || [],
    [formMetaData],
  )

  const customFieldValues = useMemo(
    () => (lead ? mapCustomFieldValuesFromLead(lead) : {}),
    [lead],
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
  const formattedValue = formatDealMoney(lead?.value, lead?.valueCurrency || lead?.value_currency || 'USD')
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
    setSelectedTags((lead?.tags || []).map((tag) => tag.name))
  }, [lead?.id, lead?.updatedAt, lead?.tags])

  const uploadNoteAttachment = useCallback(
    async (file) => {
      if (!id) throw new Error('Missing lead')
      const mime = String(file?.type || '').toLowerCase()
      const fileType = mime.startsWith('image/') ? 'Image' : 'Other'
      const name = String(file?.name || 'attachment').trim() || 'attachment'
      let res
      try {
        res = await uploadDocumentForNote({
          file,
          name,
          fileType,
          links: [{ entityType: 'lead', entityId: id }],
        }).unwrap()
      } catch (e) {
        toast.error(e?.data?.error?.message || e?.message || 'Could not attach file')
        throw e
      }
      const doc = res?.data
      const rawPath = String(doc?.filePath || doc?.file_path || doc?.fileUrl || doc?.file_url || '').trim()
      const url = getFileUrl(rawPath) || rawPath
      if (!url) {
        toast.error('Upload succeeded but no file URL was returned')
        throw new Error('Missing file URL')
      }
      dispatch(
        leadsApi.util.invalidateTags([
          { type: 'Lead', id: `${id}-files` },
          { type: 'Lead', id },
          { type: 'Document', id: 'LIST' },
        ]),
      )
      return { url, name: doc?.name || name, mimeType: file.type || null }
    },
    [dispatch, id, uploadDocumentForNote],
  )

  const saveLeadNoteFromEditor = useCallback(
    async ({ title, html }) => {
      const body = sanitizeNoteBody(html)
      if (!noteHasRenderableContent(html)) {
        toast.error('Add some text or an attachment to the note before saving.')
        return
      }
      try {
        if (editingNoteId) {
          await patchNote({ id, noteId: editingNoteId, title: title.trim(), body }).unwrap()
          setEditingNoteId(null)
        } else {
          await createNote({ id, title: title.trim(), body }).unwrap()
        }
        setNoteTitle('')
        setDraft('')
        setNoteComposerOpen(false)
        setNoteEditorVersion((v) => v + 1)
      } catch (e) {
        toast.error(e?.data?.error?.message || 'Could not save note')
      }
    },
    [createNote, editingNoteId, id, patchNote],
  )

  const toggleLeadTaskSubtask = useCallback(
    async (task, subIndex) => {
      const list = Array.isArray(task.subtasks) ? task.subtasks : []
      const next = list.map((s, i) => ({
        title: String(s?.title || '').trim() || 'Untitled',
        done: i === subIndex ? !Boolean(s.done) : Boolean(s.done),
      }))
      try {
        await patchTask({ id, taskId: task.id, subtasks: next }).unwrap()
      } catch (e) {
        toast.error(e?.data?.error?.message || 'Could not update subtask')
      }
    },
    [id, patchTask],
  )

  if (isLoading) return <PageShell fullWidth><div className="px-6 py-6"><SkeletonDetail /></div></PageShell>
  if (!lead) return <PageShell fullWidth><div className="px-6 py-6">Lead not found.</div></PageShell>

  async function submitCallLog() {
    if (!callLogBody.trim()) return
    try {
      await createActivity({ id, type: 'call', body: callLogBody.trim() }).unwrap()
      setCallLogBody('')
      setCallLogModalOpen(false)
      toast.success('Call logged')
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Could not log call')
    }
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

  async function handleRevertToLead() {
    try {
      await revertOpportunityToLead({ id }).unwrap()
      toast.success('Reverted to lead')
      setRevertConfirmOpen(false)
    } catch (err) {
      const code = err?.data?.error?.code
      if (code === 'HAS_DEALS') {
        toast.error(err?.data?.error?.message || 'Remove linked deals before reverting to lead.')
      } else {
        toast.error(err?.data?.error?.message || err?.error || 'Could not revert to lead')
      }
    }
  }

  async function handleLeadStatusChange(nextStatus) {
    if (!nextStatus || nextStatus === lead.status) return
    let reason
    if (nextStatus === 'lost' || nextStatus === 'junk') {
      reason = window.prompt(`Reason for marking this lead as ${formatStatusLabel(nextStatus)}:`)
      if (!reason || !reason.trim()) return
    }
    setLeadStatusSaving(true)
    try {
      await patchLeadStatus({ id, status: nextStatus, lostReason: reason }).unwrap()
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.error || 'Could not update lead status')
    } finally {
      setLeadStatusSaving(false)
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
        <aside className="space-y-2">
          <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
            <div className="p-3">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl font-semibold text-brand-700">
                  {avatarLetter}
                </div>
                <div className="mt-1.5 flex w-full min-w-0 items-center justify-center gap-2">
                  <p
                    className="min-w-0 max-w-full truncate text-lg font-semibold text-ink"
                    title={fullName}
                  >
                    {fullName}
                  </p>
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
                <p className="mt-0.5 text-xs text-ink-muted">
                  {isPipelineDealRoute ? lead.company || lead.designation || 'Opportunity' : lead.company || lead.designation || 'Lead profile'}
                </p>
              </div>

              {!lead.isOpportunity ? (
                <div className="mt-2">
                  <button
                    type="button"
                    disabled={convertingToOpportunity}
                    onClick={convertToOpportunity}
                    className="h-8 w-full rounded-lg bg-[var(--brand-primary)] px-4 text-[13px] font-semibold text-white disabled:opacity-60"
                  >
                    {convertingToOpportunity ? 'Creating…' : 'Convert to opportunity'}
                  </button>
                </div>
              ) : null}

              {lead.isOpportunity ? (
                <div className="mt-2 rounded-lg border border-surface-border bg-surface-subtle/60 p-1.5">
                  <div className="flex items-center justify-between gap-2 px-0.5">
                    <p className="text-left text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Pipeline stage</p>
                    <span className="rounded-full border border-surface-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink">
                      {lead.pipelineStatusInfo?.name || 'Not set'}
                    </span>
                  </div>
                  <Select
                    className="mt-1.5 h-8 rounded-lg bg-white text-[13px]"
                    value={lead.pipelineStatus || ''}
                    disabled={pipelineSaving}
                    onChange={async (e) => {
                      const nextId = e.target.value
                      if (!nextId || nextId === lead.pipelineStatus) return
                      setPipelineSaving(true)
                      try {
                        await patchPipelineStatus({ id, pipelineStatusId: nextId }).unwrap()
                      } catch (err) {
                        toast.error(err?.data?.error?.message || err?.error || 'Could not update pipeline stage')
                      } finally {
                        setPipelineSaving(false)
                      }
                    }}
                  >
                    {pipelineStatuses.length === 0 ? (
                      <option value="">{lead.pipelineStatusInfo?.name || '—'}</option>
                    ) : (
                      pipelineStatuses.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))
                    )}
                  </Select>
                  <button
                    type="button"
                    onClick={() => setRevertConfirmOpen(true)}
                    className="mt-1.5 h-7 w-full rounded-lg border border-surface-border bg-white text-[11px] font-semibold text-ink-muted hover:bg-surface-subtle hover:text-ink"
                  >
                    Revert to lead
                  </button>
                </div>
              ) : (
                <div className="mt-2 rounded-lg border border-surface-border bg-surface-subtle/60 p-1.5">
                  <div className="flex items-center justify-between gap-2 px-0.5">
                    <p className="text-left text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Lead status</p>
                    <span className="rounded-full border border-surface-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink">
                      {formatStatusLabel(lead.status) || 'Not set'}
                    </span>
                  </div>
                  <Select
                    className="mt-1.5 h-8 rounded-lg bg-white text-[13px]"
                    value={lead.status || ''}
                    disabled={leadStatusSaving}
                    onChange={(e) => handleLeadStatusChange(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {formatStatusLabel(status)}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

            </div>

            <div className="border-t border-surface-border">
              <div className="grid grid-cols-2 border-b border-surface-border text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setProfileInfoTab('lead')}
                  className={`px-4 py-2 transition-colors ${profileInfoTab === 'lead' ? 'border-b-2 border-ink text-ink' : 'text-ink-muted hover:text-ink'}`}
                >
                  Leads info
                </button>
                <button
                  type="button"
                  onClick={() => setProfileInfoTab('address')}
                  className={`px-4 py-2 transition-colors ${profileInfoTab === 'address' ? 'border-b-2 border-ink text-ink' : 'text-ink-muted hover:text-ink'}`}
                >
                  Address info
                </button>
              </div>
              <div className="divide-y divide-surface-border px-4 text-xs">
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
                    <LeadInfoItem Icon={User} label="Lead owner" value={<AssigneeCell lead={lead} />} />
                    <LeadInfoItem Icon={UserCircle2} label="Job title" value={lead.designation || '-'} />
                    <LeadInfoItem Icon={BadgeIndianRupee} label="Annual revenue" value={formattedValue} />
                    <div className="flex items-start gap-2.5 py-1.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-ink-muted">
                        <Tag className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Lead source</p>
                        <div className="mt-1"><LeadSourceTag source={lead.source} /></div>
                      </div>
                    </div>
                    <LeadInfoItem Icon={CheckSquare} label="Open tasks" value={String(summary.openTasks ?? 0)} />
                    <LeadInfoItem Icon={CheckSquare} label="Completed tasks" value={String(summary.completedTasks ?? 0)} />
                    <div className="py-2">
                      <LeadScorePill score={lead.score || 0} showBar />
                    </div>
                    <div className="py-2">
                      <CustomFieldsDisplay fields={customFieldDefs} values={customFieldValues} />
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
          <section className="rounded-2xl border border-surface-border bg-white p-3">
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

        <section className="flex flex-col rounded-2xl border border-surface-border bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 border-b border-surface-border pb-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="-mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id)
                    setEditingNoteId(null)
                    setDraft('')
                    setNoteTitle('')
                    setNoteComposerOpen(false)
                    setNoteEditorVersion((v) => v + 1)
                  }}
                  className={`h-9 shrink-0 border-b-2 px-3 text-sm ${
                    activeTab === tab.id
                      ? 'border-brand-600 bg-white font-semibold text-ink'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'emails' ? (
            googleEmailConnected || fetchingGoogleStatus ? (
              <div className="mt-4 flex flex-1 flex-col space-y-4 lg:min-h-0">
                <LeadTabSectionHeader
                  title="Emails"
                  description="Synced Gmail threads for this contact. Sync to pull the latest replies."
                  action={
                    <>
                      <button
                        type="button"
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-surface-border bg-white px-3 text-sm font-medium text-ink shadow-sm hover:bg-surface-subtle disabled:opacity-60"
                        disabled={syncingEmails}
                        onClick={async () => {
                          try {
                            await syncLeadEmails({ id }).unwrap()
                            toast.success('Replies synced')
                          } catch (err) {
                            const code = err?.data?.error?.code
                            if (code === 'GOOGLE_TOKEN_INVALID') {
                              toast.error('Google token expired — reconnect in Integrations.', { duration: 6000 })
                            } else {
                              toast.error(err?.data?.error?.message || 'Sync failed')
                            }
                          }
                        }}
                      >
                        {syncingEmails ? 'Syncing…' : 'Sync replies'}
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-slate-800 px-4 text-sm font-semibold cx-icon-inherit text-white shadow-sm hover:bg-slate-800"
                        onClick={() => setIsComposeOpen(true)}
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Create email
                      </button>
                    </>
                  }
                />
                <div className="grid flex-1 gap-4 lg:min-h-[420px] lg:grid-cols-[340px_1fr]">
                <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-surface-border bg-white">
                  <div className="flex shrink-0 gap-1 border-b border-surface-border p-1.5">
                    <button
                      type="button"
                      onClick={() => setMailboxView('inbox')}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                        mailboxView === 'inbox' ? 'bg-slate-800 text-white' : 'text-ink-muted hover:bg-surface-muted'
                      }`}
                    >
                      Inbox ({inboxThreads.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMailboxView('outbox')}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                        mailboxView === 'outbox' ? 'bg-slate-800 text-white' : 'text-ink-muted hover:bg-surface-muted'
                      }`}
                    >
                      Outbox ({outboxThreads.length})
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <GmailThreadList
                      threads={visibleThreads}
                      selectedId={selectedThreadId}
                      onSelect={setSelectedThreadId}
                      listTitle={mailboxView === 'inbox' ? 'Inbox' : 'Outbox'}
                      emptyHint={
                        mailboxView === 'inbox'
                          ? 'No replies yet. Sent emails without a reply show under Outbox.'
                          : 'No sent-only threads. Emails move to Inbox once the lead replies.'
                      }
                    />
                  </div>
                </section>
                <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-surface-border bg-white">
                  <GmailThreadView
                    thread={activeThread}
                    onBack={() => setSelectedThreadId(null)}
                    onCreateEmail={() => setIsComposeOpen(true)}
                  />
                </section>
              </div>
              </div>
            ) : googleEmailStatus?.data?.tokenExpired ? (
              <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center sm:p-10">
                <p className="text-base font-semibold text-rose-900">Google account token expired</p>
                <p className="mx-auto mt-2 max-w-lg text-sm text-rose-800/85">
                  Your Google OAuth token is no longer valid (invalid_grant). Please reconnect your Google account to continue sending and syncing emails.
                </p>
                <button
                  type="button"
                  className="mt-5 h-10 rounded-lg bg-rose-700 px-5 text-sm font-semibold text-white shadow-sm hover:bg-rose-800"
                  onClick={() => navigate('/integrations?tab=google')}
                >
                  Reconnect Google Account
                </button>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-amber-200/90 bg-amber-50 p-8 text-center sm:p-10">
                <p className="text-base font-semibold text-amber-950">Connect Google to view synced emails</p>
                <p className="mx-auto mt-2 max-w-lg text-sm text-amber-900/85">
                  Threads and messages are loaded only after your company connects Gmail in Google Settings. That keeps the inbox tied to the authenticated mailbox.
                </p>
                <button
                  type="button"
                  className="mt-5 h-10 rounded-lg bg-slate-800 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                  onClick={() => navigate('/integrations?tab=google')}
                >
                  Open Google Settings
                </button>
              </div>
            )
          ) : activeTab === 'tasks' ? (
            <div className="mt-4 space-y-4">
              <LeadTabSectionHeader
                title="Tasks"
                description="Open tasks first, soonest due date at the top. Completed and cancelled sink to the bottom."
                action={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold cx-icon-inherit text-white shadow-sm transition hover:bg-slate-800"
                    onClick={() => {
                      setTaskDrawerTaskId(null)
                      setTaskDrawerOpen(true)
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Add task
                  </button>
                }
              />
              <div className="space-y-3">
              {tasksSortedForList.map((task) => {
                const subs = task.subtasks || []
                const subDone = subs.filter((s) => s?.done).length
                const subTotal = subs.length
                const commentCount = (task.comments || []).length
                const dueAt = task.dueAt ? new Date(task.dueAt) : null
                const dueParts = formatTaskDueParts(task.dueAt)
                const isOverdue = Boolean(
                  dueAt && task.status !== 'completed' && task.status !== 'cancelled' && dueAt.getTime() < meetingListNow,
                )
                const dueTimer = taskDueTimerPhrase(task.dueAt, task.status, meetingListNow)
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
                    <div className="flex items-start justify-between gap-3 border-b border-surface-border px-4 py-3 sm:px-5">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        {subTotal > 0 ? <TaskSubtasksProgressRing done={subDone} total={subTotal} /> : null}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold leading-snug text-ink">{task.title || 'Untitled task'}</h3>
                          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-ink-muted">
                            <span className="font-semibold uppercase tracking-wide text-ink-muted/90">{taskTypeLabel(task.taskType)}</span>
                            <span aria-hidden>·</span>
                            <span className="inline-flex items-center gap-0.5 capitalize">
                              <TaskPriorityIcon priority={task.priority} />
                              {task.priority}
                            </span>
                            <span aria-hidden>·</span>
                            <TaskStatusPill value={task.status} />
                            {String(task.status || '').toLowerCase() === 'completed' ? (
                              (() => {
                                const at = task.completedAt || task.completed_at || task.updatedAt
                                const line = formatTaskCompletedAtLine(at)
                                if (!line) return null
                                return (
                                  <>
                                    <span aria-hidden>·</span>
                                    <span className="font-medium text-emerald-800/90 tabular-nums" title="Marked complete at">
                                      Completed {line}
                                    </span>
                                  </>
                                )
                              })()
                            ) : null}
                            {task.recurrenceRule ? (
                              <>
                                <span aria-hidden>·</span>
                                <TaskRecurrenceIcon rule={task.recurrenceRule} className="max-w-[10rem] truncate !text-[9px]" />
                              </>
                            ) : null}
                            {isOverdue ? (
                              <>
                                <span aria-hidden>·</span>
                                <TaskOverdueBadge />
                              </>
                            ) : null}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {task.status !== 'completed' && task.status !== 'cancelled' ? (
                          <button
                            type="button"
                            className="h-8 rounded-lg border border-brand-300 bg-white px-3 text-xs font-semibold text-brand-800 shadow-sm hover:bg-slate-50"
                            onClick={async () => {
                              await patchTask({ id, taskId: task.id, status: 'completed' }).unwrap()
                            }}
                          >
                            Mark complete
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                          onClick={() => {
                            setTaskDrawerTaskId(task.id)
                            setTaskDrawerOpen(true)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
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

                    <div className="space-y-3 px-4 py-4 sm:px-5">
                      {dueAt ? (
                        <div
                          className={`rounded-xl border px-3 py-2.5 ${
                            isOverdue
                              ? 'border-red-200 bg-gradient-to-br from-red-50/90 to-white'
                              : 'border-slate-200 bg-gradient-to-br from-slate-50 to-white'
                          }`}
                        >
                          <div className="flex flex-wrap items-end justify-between gap-2">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Due</p>
                              <p className={`mt-0.5 text-sm font-semibold ${isOverdue ? 'text-red-900' : 'text-ink'}`}>{dueParts.dateLine}</p>
                              {dueParts.timeLine ? (
                                <p className="mt-0.5 text-xs tabular-nums text-ink-muted">{dueParts.timeLine}</p>
                              ) : null}
                            </div>
                            {dueTimer ? (
                              <span
                                className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold tabular-nums ${
                                  isOverdue ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-brand-900'
                                }`}
                              >
                                {dueTimer}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-ink-muted">No due date set.</p>
                      )}

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Description</p>
                        {task.description ? (
                          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink line-clamp-6">{task.description}</p>
                        ) : (
                          <p className="mt-1.5 text-sm italic text-ink-muted">No description.</p>
                        )}
                      </div>

                      <TaskAttachmentIcons attachments={task.attachments} />

                      {subs.length ? (
                        <div
                          role="presentation"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Subtasks</p>
                          <ul className="mt-2 max-h-52 space-y-1.5 overflow-y-auto pr-0.5">
                            {subs.map((subtask, index) => (
                              <li
                                key={`${task.id}-sub-${subtask.id || index}`}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                <div
                                  className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs ${
                                    subtask.done
                                      ? 'border-emerald-100 bg-emerald-50/50 text-ink-muted'
                                      : 'border-slate-200 bg-white text-ink'
                                  }`}
                                >
                                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(subtask.done)}
                                      onChange={(e) => {
                                        e.stopPropagation()
                                        void toggleLeadTaskSubtask(task, index)
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-slate-300 text-emerald-600"
                                      aria-label={subtask.done ? 'Mark subtask not done' : 'Mark subtask done'}
                                    />
                                    <span className={`min-w-0 truncate font-medium ${subtask.done ? 'line-through' : ''}`}>
                                      {subtask.title || 'Untitled'}
                                    </span>
                                  </label>
                                  <span
                                    className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                      subtask.done ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-100 text-amber-900'
                                    }`}
                                  >
                                    {subtask.done ? 'Done' : 'Open'}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {commentCount > 0 ? (
                        <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                          <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {commentCount} comment{commentCount === 1 ? '' : 's'}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-surface-border pt-2.5 text-[10px] leading-tight text-ink-muted">
                        <span>
                          By <span className="font-medium text-ink/80">{task.creator?.name || 'System'}</span>
                        </span>
                        <span aria-hidden className="text-ink-faint">
                          ·
                        </span>
                        <span>
                          {task.assignee?.name ? (
                            <>
                              Assigned <span className="font-medium text-ink/80">{task.assignee.name}</span>
                            </>
                          ) : (
                            <span>Unassigned</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {tasks.length === 0 ? (
                <LeadTabEmptyState
                  icon={CheckSquare}
                  title="No tasks yet"
                  description="Create tasks to assign work, set due dates, and collaborate with your team on this lead."
                  action={
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold cx-icon-inherit text-white shadow-sm transition hover:bg-slate-800"
                      onClick={() => {
                        setTaskDrawerTaskId(null)
                        setTaskDrawerOpen(true)
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Add task
                    </button>
                  }
                />
              ) : null}
              </div>
            </div>

          ) : activeTab === 'meetings' ? (
  <div className="mt-4 space-y-4">
    <LeadTabSectionHeader
      title="Meetings"
      description="Scheduled meetings linked to this lead appear below."
      action={
        <button
          type="button"
          onClick={() => {
            setEditingMeeting(null)
            setCreateMeetingModalOpen(true)
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold cx-icon-inherit text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Create meeting
        </button>
      }
    />
    {meetings.length === 0 ? (
      <LeadTabEmptyState
        icon={CalendarCheck2}
        title="No meetings yet"
        description="Schedule a call or demo and keep Google Meet links, participants, and timing in one place."
        action={
          <button
            type="button"
            onClick={() => {
              setEditingMeeting(null)
              setCreateMeetingModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold cx-icon-inherit text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Create meeting
          </button>
        }
      />
    ) : (
      meetings.map((meeting) => {
        const start = new Date(meeting.scheduledStart)
        const end = new Date(meeting.scheduledEnd)
        const startTime = start.getTime()
        const endTime = end.getTime()
        const now = meetingListNow

        const isUpcoming = now < startTime
        const isLive = now >= startTime && now <= endTime
        const isCompleted = now > endTime && meeting.status === 'completed'
        const isExpiredForJoin = now > endTime && meeting.status !== 'completed'
        const joinDisabled = !meeting.googleMeetLink || meeting.status === 'completed' || isExpiredForJoin

        return (
          <div key={meeting.id} className="rounded-2xl border border-surface-border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-ink">{meeting.title}</h3>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      isLive
                        ? 'bg-green-100 text-green-700'
                        : isUpcoming
                          ? 'bg-brand-100 text-brand-700'
                          : isCompleted
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {isLive ? 'LIVE' : isUpcoming ? 'UPCOMING' : isCompleted ? 'COMPLETED' : 'EXPIRED'}
                  </span>
                </div>

                <p className="text-sm text-ink-muted">{meeting.meetingType}</p>

                <p className="text-sm text-ink-muted">
                  📅{' '}
                  {start.toLocaleDateString([], {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>

                <p className="text-sm text-ink-muted">
                  🕒{' '}
                  {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                  {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>

                {meeting.agenda ? (
                  <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{meeting.agenda}</div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {joinDisabled ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
                    title={
                      meeting.status === 'completed'
                        ? 'Meeting completed'
                        : isExpiredForJoin
                          ? 'Meeting expired'
                          : 'No meeting link'
                    }
                  >
                    <Presentation className="h-4 w-4" />
                    {meeting.status === 'completed' ? 'Completed' : isExpiredForJoin ? 'Expired' : 'No Link'}
                  </button>
                ) : (
                  <a
                    href={meeting.googleMeetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold cx-icon-inherit text-white hover:bg-green-700"
                  >
                    <Presentation className="h-4 w-4" />
                    Join Meeting
                  </a>
                )}

                <button
                  type="button"
                  className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                  onClick={() => {
                    setEditingMeeting(meeting)
                    setCreateMeetingModalOpen(true)
                  }}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                  onClick={async () => {
                    const ok = confirm('Delete this meeting?')
                    if (!ok) return
                    await deleteMeeting(meeting.id)
                  }}
                >
                  Delete
                </button>
              </div>
            </div>

            {!!meeting.participants?.length && (
              <div className="mt-4 border-t border-surface-border pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Participants</p>
                <div className="flex flex-wrap gap-2">
                  {meeting.participants.map((p) => (
                    <span key={p.userId} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-brand-700">
                      {p.user?.name || p.user?.email || p.userId}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })
    )}
  </div>

          ) : activeTab === 'followups' ? (
            <LeadFollowupsTab leadId={id} />
          ) : activeTab === 'notes' ? (
            <div className="mt-4 space-y-8">
              {(() => {
                const showNoteEditor = noteComposerOpen || Boolean(editingNoteId)
                const startCreateNote = () => {
                  setEditingNoteId(null)
                  setNoteTitle('')
                  setDraft('')
                  setNoteComposerOpen(true)
                  setNoteEditorVersion((v) => v + 1)
                }
                const createNoteButton = (
                  <button
                    type="button"
                    onClick={startCreateNote}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold cx-icon-inherit text-white shadow-sm transition hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Create note
                  </button>
                )
                return (
                  <>
                    <LeadTabSectionHeader
                      title="Notes"
                      description="Rich notes stay on this lead. Open the editor when you are ready to write or edit."
                      action={createNoteButton}
                    />
                    {showNoteEditor ? (
                      <LeadRichNotesEditor
                        key={`${editingNoteId || 'new'}-${noteEditorVersion}`}
                        editorKey={`${editingNoteId || 'new'}-${noteEditorVersion}`}
                        title={noteTitle}
                        onTitleChange={setNoteTitle}
                        initialHtml={draft}
                        isEditing={Boolean(editingNoteId)}
                        saving={creatingNote || patchingNote}
                        onSave={saveLeadNoteFromEditor}
                        onUploadAttachment={uploadNoteAttachment}
                      />
                    ) : null}
                    {notes.length > 0 ? (
                      <div>
                        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">Your notes</p>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {notes.map((note) => {
                            const noteHtml = sanitizeNoteHtmlForDisplay(note.body || '')
                            const hasRenderableBody = noteHasRenderableContent(note.body || '')
                            const noteEmbedAttachments = extractNoteEmbedsFromSanitizedHtml(noteHtml)
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
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-amber-100/60 pt-3">
                                  <div className="min-w-0 flex-1">
                                    {noteEmbedAttachments.length ? (
                                      <TaskAttachmentIcons attachments={noteEmbedAttachments} variant="compact" />
                                    ) : null}
                                  </div>
                                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                    <button
                                      type="button"
                                      className="h-8 rounded-lg border border-surface-border bg-white px-3 text-xs font-medium text-ink hover:bg-slate-50"
                                      onClick={() => {
                                        setEditingNoteId(note.id)
                                        setNoteTitle(note.metadata?.title || '')
                                        setDraft(noteBodyToInitialHtml(note.body || ''))
                                        setNoteComposerOpen(true)
                                        setNoteEditorVersion((v) => v + 1)
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
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}
                    {!showNoteEditor && notes.length === 0 ? (
                      <LeadTabEmptyState
                        icon={NotebookPen}
                        title="No notes yet"
                        description="Capture context, next steps, or decisions. Your team sees the same history on this lead."
                        action={createNoteButton}
                      />
                    ) : null}
                  </>
                )
              })()}
            </div>
          ) : activeTab === 'documents' ? (
            <div className="mt-4 space-y-3">
              <LeadTabSectionHeader
                title="Documents"
                description="Folders and files uploaded for this lead."
              />
              <div className="h-[560px] overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm">
                <LeadFilesPanel leadId={id} leadName={fullName} hideSidebar />
              </div>
            </div>
          ) : activeTab === 'billing' ? (
            <div className="mt-4 space-y-3">
              <LeadTabSectionHeader
                title="Billing"
                description="Quotations and invoices linked to this record."
                action={
                  <button
                    type="button"
                    onClick={() => setAddDocumentOpen(true)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-800 px-3 text-xs font-semibold cx-icon-inherit text-white shadow-sm hover:bg-slate-900"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Add document
                  </button>
                }
              />
              <DealQuotationsPanel leadId={id} hideActions sectioned proposalDocs={proposalFileDocs} />
              <DealInvoicesPanel leadId={id} hideActions sectioned invoiceFileDocs={invoiceFileDocs} />
            </div>
          ) : activeTab === 'payments' ? (
            <LeadPaymentsTab leadId={id} />
          ) : activeTab === 'deal' ? (
            <div className="mt-4 space-y-4">
              <LeadTabSectionHeader
                title="Deals"
                description={`Pipeline deals linked to this opportunity (${childDealsForOpp.length}).`}
                action={
                  <button
                    type="button"
                    onClick={() => setAddDealDrawerOpen(true)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-800 px-3 text-xs font-semibold cx-icon-inherit text-white shadow-sm hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Add deal
                  </button>
                }
              />
              {childDealsForOpp.length ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {childDealsForOpp.map((row) => {
                    const title = (row.dealName || row.fullName || 'Deal').trim()
                    const stageLabel = formatPipelineStageLabel(row.currentStage) || '—'
                    const valueLine = formatDealMoney(row.dealValue, row.dealCurrency ?? 'USD')
                    const createdRaw = row.createdAt ?? row.created_at
                    const createdLine = dealCardCreatedLabel(createdRaw)
                    const healthPct = Math.min(100, Math.max(0, Number(row.leadScore) || 0))
                    const ownerName = row.owner?.name?.trim() || row.owner?.email?.trim() || 'Unassigned'
                    const ownerInitials = dealCardInitials(ownerName)
                    const healthTone =
                      healthPct >= 70
                        ? 'from-emerald-400 to-emerald-600'
                        : healthPct >= 40
                          ? 'from-amber-400 to-amber-600'
                          : 'from-red-400 to-red-600'
                    const stageKey = String(row.currentStage || '').toLowerCase()
                    const stageTone = stageKey.includes('won')
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      : stageKey.includes('lost')
                        ? 'bg-red-50 text-red-700 ring-red-200'
                        : 'bg-amber-50 text-amber-700 ring-amber-200'
                    const stageDotTone = stageKey.includes('won')
                      ? 'fill-emerald-500 text-emerald-500'
                      : stageKey.includes('lost')
                        ? 'fill-red-500 text-red-500'
                        : 'fill-amber-500 text-amber-500'
                    const ValueIcon = String(row.dealCurrency || '').toUpperCase() === 'INR' ? BadgeIndianRupee : BadgeDollarSign
                    return (
                      <div
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setDealPanelOpp(row)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setDealPanelOpp(row)
                          }
                        }}
                        className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-surface-border bg-white text-left shadow-sm ring-1 ring-black/[0.03] transition hover:border-brand-300 hover:shadow-md"
                        aria-label={`Open deal: ${title}`}
                      >
                        <div className="flex items-start justify-between gap-2 px-4 pb-2.5 pt-3.5">
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-700 text-[11px] font-bold cx-icon-inherit text-white ring-2 ring-white"
                              aria-hidden
                            >
                              {dealCardInitials(title)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold leading-tight tracking-tight text-ink">{title}</p>
                              <span
                                className={`mt-1 inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${stageTone}`}
                              >
                                <Flag className={`h-2.5 w-2.5 shrink-0 ${stageDotTone}`} strokeWidth={1.75} aria-hidden />
                                <span className="truncate">{stageLabel}</span>
                              </span>
                            </div>
                          </div>
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDealMenuOpenId((cur) => (cur === row.id ? null : row.id))
                              }}
                              className="rounded-lg p-1 text-ink-muted opacity-60 transition hover:bg-slate-100 hover:opacity-100 group-hover:opacity-100"
                              aria-label="Deal options"
                            >
                              <MoreHorizontal className="h-4 w-4" aria-hidden />
                            </button>
                            {dealMenuOpenId === row.id ? (
                              <>
                                <button
                                  type="button"
                                  className="fixed inset-0 z-10 cursor-default"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDealMenuOpenId(null)
                                  }}
                                  aria-label="Close menu"
                                  tabIndex={-1}
                                />
                                <div
                                  className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-surface-border bg-white shadow-lg"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDealMenuOpenId(null)
                                      setEditingDeal(row)
                                      setAddDealDrawerOpen(true)
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-ink hover:bg-slate-50"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDealMenuOpenId(null)
                                      setDeleteDealConfirm(row)
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </button>
                                </div>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="space-y-2 border-t border-surface-border px-4 py-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1 font-medium text-ink-muted">
                              <ValueIcon className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden />
                              Value
                            </span>
                            <span className="text-sm font-bold tabular-nums text-ink">{valueLine}</span>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-ink-muted">Health</span>
                              <span className="font-semibold tabular-nums text-ink">{healthPct}%</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${healthTone}`}
                                style={{ width: `${healthPct}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-ink-muted">Created</span>
                            <span className="font-semibold text-ink">{createdLine}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-surface-border bg-slate-50/70 px-4 py-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <div
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-700 ring-2 ring-white"
                              aria-hidden
                            >
                              {ownerInitials}
                            </div>
                            <span className="truncate text-xs font-medium text-ink">{ownerName}</span>
                          </div>
                          <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-ink-muted transition group-hover:text-brand-600">
                            View
                            <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <LeadTabEmptyState
                  icon={ClipboardList}
                  title="No deals yet"
                  description="Add a deal to track value and stage on the Deals board, all linked to this opportunity."
                  action={
                    <button
                      type="button"
                      onClick={() => setAddDealDrawerOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold cx-icon-inherit text-white shadow-sm transition hover:bg-slate-800"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Add deal
                    </button>
                  }
                />
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {activeTab === 'calls' ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setCallLogBody('')
                      setCallLogModalOpen(true)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold cx-icon-inherit text-white shadow-sm transition hover:bg-slate-800"
                  >
                    <PhoneCall className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Log call
                  </button>
                </div>
              ) : null}
              {activeTab === 'calls' && leadCallLogs.length > 0 ? (
                <div className="space-y-2">
                  {leadCallLogs.map((call) => {
                    const missed = call.callType === 'inbound' && call.outcome === 'no_answer'
                    const CallIcon = missed ? PhoneMissed : call.callType === 'outbound' ? PhoneOutgoing : PhoneIncoming
                    const iconTone = missed
                      ? 'bg-rose-100 text-rose-600'
                      : call.callType === 'outbound'
                        ? 'bg-sky-100 text-sky-600'
                        : 'bg-emerald-100 text-emerald-600'
                    const outcomeLabel = CALL_OUTCOMES.find((o) => o.value === call.outcome)?.label || null
                    const durationLabel = call.duration
                      ? call.duration >= 60
                        ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
                        : `${call.duration}s`
                      : null
                    return (
                      <div key={call.id} className="flex items-start gap-2.5 rounded-xl border border-surface-border bg-white p-2.5">
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconTone}`}>
                          <CallIcon size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <p className="text-sm font-semibold text-ink">
                              {missed ? 'Missed call' : call.callType === 'outbound' ? 'Outgoing call' : 'Incoming call'}
                            </p>
                            {call.source === 'device_sync' ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Device sync</span>
                            ) : null}
                            {outcomeLabel ? (
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">{outcomeLabel}</span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {[call.phoneNumber, durationLabel].filter(Boolean).join(' · ') || '—'}
                          </p>
                          {call.notes ? <p className="mt-1 text-xs leading-relaxed text-ink-muted">{call.notes}</p> : null}
                        </div>
                        <span className="shrink-0 pt-0.5 text-[11px] text-ink-muted">{activityDateTimeLabel(call.createdAt)}</span>
                      </div>
                    )
                  })}
                </div>
              ) : null}
              <div className="space-y-2">
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
                const isFollowUp =
                  !isTask &&
                  (styleKey === 'follow_up' ||
                    followText.includes('follow-up') ||
                    followText.includes('follow up') ||
                    followText.includes('reminder'))
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
                            dangerouslySetInnerHTML={{ __html: sanitizeNoteHtmlForDisplay(detailRaw) }}
                          />
                        ) : (
                          <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{detailRaw}</p>
                        )
                      ) : null}
                      {isNote && !detailRaw ? (
                        <div
                          className="prose prose-sm mt-1.5 max-w-none text-xs leading-relaxed text-ink prose-p:my-1 prose-headings:my-1"
                          dangerouslySetInnerHTML={{ __html: sanitizeNoteHtmlForDisplay(activity.body || '') }}
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
                      {styleKey === 'web_form' && Array.isArray(metadata.fields) && metadata.fields.length > 0 ? (
                        <div className="mt-2 divide-y divide-violet-100 rounded-lg bg-white/70 overflow-hidden">
                          {metadata.fields.map((f, fi) => (
                            <div key={fi} className="grid grid-cols-[40%_60%] gap-2 px-2.5 py-1.5">
                              <p className="text-[11px] font-medium text-ink-muted truncate" title={f.label}>{f.label}</p>
                              <p className="text-[11px] font-semibold text-ink break-words">{f.value}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {!isTask ? <p className="mt-2 text-right text-[11px] font-medium text-ink-muted">by {activity.user?.name || 'System user'}</p> : null}
                    </div>
                  </article>
                )
              })}
              {filteredActivities.length === 0 && !(activeTab === 'calls' && leadCallLogs.length > 0) ? (
                <LeadTabEmptyState
                  icon={Sparkles}
                  title={activeTab === 'calls' ? 'No calls logged yet' : 'No activity yet'}
                  description={
                    activeTab === 'calls'
                      ? 'Log outbound or inbound conversations so your team sees the same story on this timeline.'
                      : 'Notes, calls, meetings, and system events will show up here as they happen.'
                  }
                  action={
                    activeTab === 'calls' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCallLogBody('')
                          setCallLogModalOpen(true)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold cx-icon-inherit text-white shadow-sm transition hover:bg-slate-800"
                      >
                        <PhoneCall className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Log call
                      </button>
                    ) : null
                  }
                />
              ) : null}
              </div>
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
          {callLogModalOpen ? (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setCallLogModalOpen(false)
              }}
            >
              <div
                className="w-full max-w-lg overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl ring-1 ring-black/5"
                role="dialog"
                aria-modal="true"
                aria-labelledby="call-log-title"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="border-b border-surface-border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p id="call-log-title" className="text-base font-semibold tracking-tight">
                        Log a call
                      </p>
                      <p className="mt-0.5 text-xs text-white/75">
                        Summarize who you spoke with, outcome, and next steps. This appears on the lead timeline.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                      aria-label="Close"
                      onClick={() => setCallLogModalOpen(false)}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  <IconTextarea
                    icon={PhoneCall}
                    className="min-h-[140px] rounded-xl border-slate-300 text-sm"
                    placeholder="e.g. Spoke with Jane — interested in enterprise tier, follow-up demo next Tuesday…"
                    value={callLogBody}
                    onChange={(e) => setCallLogBody(e.target.value)}
                  />
                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-surface-border pt-4">
                    <button
                      type="button"
                      className="h-9 rounded-lg border border-surface-border bg-white px-4 text-sm font-medium text-ink hover:bg-slate-50"
                      onClick={() => setCallLogModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!callLogBody.trim() || creatingActivity}
                      className="h-9 rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
                      onClick={() => void submitCallLog()}
                    >
                      {creatingActivity ? 'Saving…' : 'Save call'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <CreateMeetingModal
            open={createMeetingModalOpen}
            onClose={() => {
              setCreateMeetingModalOpen(false)
              setEditingMeeting(null)
            }}
            leadId={id}
            users={formMetaData?.data?.users || []}
            initialData={editingMeeting}
          />
          <LeadEmailComposeModal
            open={isComposeOpen}
            onClose={() => setIsComposeOpen(false)}
            leadId={id}
            lead={lead}
            leadEmail={lead?.email || ''}
            googleEmailConnected={googleEmailConnected}
          />
          {dealPanelOpp ? (
            <DealDetailPanel
              open
              opp={dealPanelOpp}
              pipelineStatuses={pipelineStatuses}
              onClose={() => setDealPanelOpp(null)}
            />
          ) : null}
          <AddDealDrawer
            open={addDealDrawerOpen}
            onClose={() => {
              setAddDealDrawerOpen(false)
              setEditingDeal(null)
            }}
            users={formMetaData?.data?.users || []}
            fixedOpportunityLeadId={id}
            editingDeal={editingDeal}
            onCreated={() => {
              refetchChildDeals()
            }}
          />
          <ConfirmDialog
            open={revertConfirmOpen}
            onClose={() => setRevertConfirmOpen(false)}
            onConfirm={handleRevertToLead}
            loading={revertingToLead}
            variant="danger"
            title="Revert to lead?"
            description="This opportunity moves back to Leads and its pipeline stage is cleared. Blocked if it has linked deals."
          />
          <ConfirmDialog
            open={Boolean(deleteDealConfirm)}
            onClose={() => setDeleteDealConfirm(null)}
            onConfirm={async () => {
              try {
                await deleteDeal(deleteDealConfirm.id).unwrap()
                toast.success('Deal deleted')
                refetchChildDeals()
              } catch (e) {
                toast.error(e?.data?.error?.message || 'Could not delete deal')
              } finally {
                setDeleteDealConfirm(null)
              }
            }}
            loading={deletingDeal}
            variant="danger"
            title="Delete this deal?"
            description="This cannot be undone."
            confirmLabel="Delete"
          />
          <AddLeadModal
            open={editLeadOpen}
            onClose={() => setEditLeadOpen(false)}
            initialLead={lead}
            onSubmit={submitLeadEdit}
          />
          {addDocumentOpen ? (
            <LeadFilesBrowser
              open
              onClose={() => setAddDocumentOpen(false)}
              leadId={id}
              leadName={fullName}
            />
          ) : null}
        </section>
      </div>
    </PageShell>
  )
}
