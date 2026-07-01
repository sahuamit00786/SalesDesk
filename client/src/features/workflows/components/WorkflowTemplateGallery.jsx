import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarCheck,
  CheckSquare,
  CircleDollarSign,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  Star,
  Workflow,
  X,
  Zap,
} from 'lucide-react'
import { baseApi } from '@/features/api/baseApi'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'

const workflowTemplatesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWorkflowTemplates: build.query({
      query: () => '/workflow-templates',
    }),
    useWorkflowTemplate: build.mutation({
      query: (id) => ({ url: `/workflow-templates/${id}/use`, method: 'POST' }),
    }),
  }),
  overrideExisting: false,
})

const { useGetWorkflowTemplatesQuery, useUseWorkflowTemplateMutation } = workflowTemplatesApi

const BUILT_IN_TEMPLATES = [
  {
    id: 'welcome-lead',
    icon: Mail,
    name: 'Welcome New Lead',
    description: 'Send a welcome email 1 hour after a new lead is created.',
    trigger: 'Lead Created',
    color: 'bg-violet-100 text-violet-700',
  },
  {
    id: 'follow-up-sequence',
    icon: Bell,
    name: 'Lead Follow-Up Sequence',
    description: 'Automated Day 1, Day 3, Day 7 email sequence for new leads.',
    trigger: 'Lead Status Changed',
    color: 'bg-brand-100 text-brand-700',
  },
  {
    id: 'deal-won',
    icon: Star,
    name: 'Deal Won Celebration',
    description: 'Notify the team and create an invoice task when a deal closes.',
    trigger: 'Deal Stage Changed',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'stale-lead',
    icon: Zap,
    name: 'Stale Lead Alert',
    description: 'Assign a reminder task when there is no activity for 7 days.',
    trigger: 'No Activity (7 days)',
    color: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'meeting-followup',
    icon: CalendarCheck,
    name: 'Meeting Post Follow-Up',
    description: 'Send a follow-up email 2 hours after a meeting ends.',
    trigger: 'Meeting Ended',
    color: 'bg-sky-100 text-sky-700',
  },
  {
    id: 'lead-sms-alert',
    icon: MessageCircle,
    name: 'New Lead SMS Alert',
    description: 'Send an SMS notification to the assigned rep for each new lead.',
    trigger: 'Lead Created',
    color: 'bg-teal-100 text-teal-700',
  },
  {
    id: 'high-value-escalation',
    icon: CircleDollarSign,
    name: 'High-Value Lead Escalation',
    description: 'Notify the manager when a lead deal value exceeds a threshold.',
    trigger: 'Lead Updated',
    color: 'bg-rose-100 text-rose-700',
  },
  {
    id: 'leave-approval',
    icon: CheckSquare,
    name: 'Leave Approval Notification',
    description: 'Notify the employee when their leave request is approved.',
    trigger: 'Leave Approved',
    color: 'bg-lime-100 text-lime-700',
  },
  {
    id: 'invoice-overdue',
    icon: FileText,
    name: 'Invoice Overdue Alert',
    description: 'Send a reminder email when an invoice passes its due date.',
    trigger: 'Invoice Past Due',
    color: 'bg-orange-100 text-orange-700',
  },
  {
    id: 'campaign-qualified',
    icon: Phone,
    name: 'Campaign Lead Qualified',
    description: 'Convert a campaign lead to a deal when they move to qualified.',
    trigger: 'Campaign Lead Qualified',
    color: 'bg-indigo-100 text-indigo-700',
  },
]

/**
 * WorkflowTemplateGallery — modal/panel shown when user clicks "New Workflow".
 * @param {{ onClose: () => void, onStartBlank: () => void }} props
 */
export function WorkflowTemplateGallery({ onClose, onStartBlank }) {
  const navigate = useNavigate()
  const { data: serverTemplates } = useGetWorkflowTemplatesQuery()
  const [useTemplate, { isLoading: using }] = useUseWorkflowTemplateMutation()
  const [usingId, setUsingId] = useState(null)

  const templates = serverTemplates?.data?.length
    ? serverTemplates.data
    : BUILT_IN_TEMPLATES

  async function handleUseTemplate(template) {
    if (!template.id || using) return
    setUsingId(template.id)
    try {
      const res = await useTemplate(template.id).unwrap()
      const newId = res?.data?.id
      if (newId) {
        navigate(`/automation/${newId}`)
        onClose?.()
      } else {
        toast.error('Could not load template')
      }
    } catch (err) {
      // If server template doesn't exist, navigate to new workflow with blank canvas
      toast.error(err?.data?.error?.message || 'Template not available yet')
    } finally {
      setUsingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">New Workflow</h2>
            <p className="text-sm text-ink-muted">Choose a template or start from scratch</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-ink-faint hover:bg-surface-subtle hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Start from scratch banner */}
        <div className="px-6 pt-4">
          <button
            type="button"
            onClick={() => { onStartBlank?.(); onClose?.() }}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 px-5 py-4 text-left transition-colors hover:border-brand-400 hover:bg-brand-100"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600">
              <Workflow className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-900">Start from scratch</p>
              <p className="text-xs text-brand-700/80">Build your workflow with a blank canvas</p>
            </div>
          </button>
        </div>

        {/* Templates grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-subtle">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">Starter templates</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {templates.map((template) => {
              const Icon = template.icon || Zap
              const iconColor = template.color || 'bg-slate-100 text-slate-700'
              const isUsing = usingId === template.id
              return (
                <div
                  key={template.id}
                  className="flex flex-col rounded-xl border border-surface-border bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconColor)}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{template.name}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">{template.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="rounded-full border border-surface-border px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                      {template.trigger}
                    </span>
                    <button
                      type="button"
                      disabled={using}
                      onClick={() => handleUseTemplate(template)}
                      className="h-7 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      {isUsing ? 'Loading...' : 'Use Template'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkflowTemplateGallery
