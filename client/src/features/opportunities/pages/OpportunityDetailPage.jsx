import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { LeadScorePill } from '@/features/leads/components/LeadScorePill'
import { STATUS_STYLES } from '@/features/leads/constants'
import { useGetOpportunityQuery } from '@/features/opportunities/opportunitiesApi'
import { cn } from '@/utils/cn'

function OpportunityStageBadge({ currentStage }) {
  const stage = String(currentStage || '').trim()
  const s = stage.toLowerCase()

  let styleKey = 'new'
  if (s.includes('won')) styleKey = 'won'
  else if (s.includes('lost')) styleKey = 'lost'
  else if (s.includes('qualified')) styleKey = 'qualified'
  else if (s.includes('contact')) styleKey = 'contacted'
  else if (s.includes('proposal')) styleKey = 'proposal'

  return (
    <span className={cn('inline-flex rounded-lg border px-2.5 py-0.5 text-xs font-semibold capitalize', STATUS_STYLES[styleKey] || STATUS_STYLES.new)}>
      {stage || 'New'}
    </span>
  )
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

function formatPhone(value) {
  const str = String(value || '').trim()
  return str || '-'
}

function formatMoney(value) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '$0.00'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n)
  } catch {
    return `$${n.toFixed(2)}`
  }
}

export function OpportunityDetailPage() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('activity')
  const [profileInfoTab, setProfileInfoTab] = useState('lead')

  const { data, isLoading } = useGetOpportunityQuery(id, { skip: !id })
  const opportunity = data?.data

  const avatarLetter = String(opportunity?.fullName || 'OP').slice(0, 1).toUpperCase()
  const fullName = opportunity?.fullName || '-'

  const lastActivityAt = opportunity?.lastActivityAt || opportunity?.updatedAt || opportunity?.createdAt
  const ownerName = opportunity?.owner?.name || opportunity?.owner?.email || 'System'

  const tags = Array.isArray(opportunity?.tags) ? opportunity.tags.map((t) => String(t)) : []

  const syntheticActivities = useMemo(
    () => [
      {
        id: 'opp_created',
        type: 'system',
        body: 'Opportunity Created',
        createdAt: opportunity?.createdAt || new Date().toISOString(),
        user: { name: ownerName },
        metadata: { activityTypeKey: 'system', title: 'Opportunity Created', description: '' },
      },
    ],
    [opportunity?.createdAt, ownerName],
  )

  const tabs = [
    { id: 'activity', label: 'Activity' },
    { id: 'calls', label: 'Calls' },
    { id: 'emails', label: 'Emails' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'followups', label: 'Follow-ups' },
    { id: 'notes', label: 'Notes' },
  ]

  const ACTIVITY_STYLE = {
    system: {
      Icon: Sparkles,
      iconWrap: 'bg-slate-100 text-slate-700',
      card: 'bg-slate-50',
    },
  }
  const presentation = ACTIVITY_STYLE.system
  const Icon = presentation.Icon

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
                <p className="mt-1 text-sm text-ink-muted">{opportunity?.jobTitle || opportunity?.companyName || 'Opportunity profile'}</p>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-ink-muted">
                <button type="button" className="rounded-xl border border-surface-border px-2 py-2">
                  Log
                </button>
                <button type="button" className="rounded-xl border border-surface-border px-2 py-2">
                  Email
                </button>
                <button type="button" className="rounded-xl border border-surface-border px-2 py-2">
                  Call
                </button>
                <button type="button" className="rounded-xl border border-surface-border px-2 py-2">
                  More
                </button>
              </div>

              <button type="button" className="mt-3 h-10 w-full rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white">
                Convert to contact
              </button>

              <div className="mt-3 flex items-center justify-between">
                <OpportunityStageBadge currentStage={opportunity?.currentStage} />
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
                    <p>
                      <span className="text-ink-muted">Email</span>
                      <br />
                      <span className="text-ink">{opportunity?.email || '-'}</span>
                    </p>
                    <p>
                      <span className="text-ink-muted">Phone</span>
                      <br />
                      <span className="text-ink">{formatPhone(opportunity?.directPhone || opportunity?.phoneNumber)}</span>
                    </p>
                    <p>
                      <span className="text-ink-muted">Lead owner</span>
                      <br />
                      <span className="text-ink">{ownerName}</span>
                    </p>
                    <p>
                      <span className="text-ink-muted">Job Title</span>
                      <br />
                      <span className="text-ink">{opportunity?.jobTitle || '-'}</span>
                    </p>
                    <p>
                      <span className="text-ink-muted">Annual revenue</span>
                      <br />
                      <span className="text-ink">{formatMoney(opportunity?.dealValue || 0)}</span>
                    </p>
                    <p>
                      <span className="text-ink-muted">Lead source</span>
                      <br />
                      <span className="text-ink">Opportunity</span>
                    </p>
                    <p>
                      <span className="text-ink-muted">Open tasks</span>
                      <br />
                      <span className="text-ink">0</span>
                    </p>
                    <p>
                      <span className="text-ink-muted">Completed tasks</span>
                      <br />
                      <span className="text-ink">0</span>
                    </p>
                    <div className="pt-1">
                      <LeadScorePill score={opportunity?.leadScore || 0} showBar />
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      <span className="text-ink-muted">Street</span>
                      <br />
                      <span className="text-ink">-</span>
                    </p>
                    <p>
                      <span className="text-ink-muted">City</span>
                      <br />
                      <span className="text-ink">-</span>
                    </p>
                    <p>
                      <span className="text-ink-muted">State</span>
                      <br />
                      <span className="text-ink">-</span>
                    </p>
                    <p>
                      <span className="text-ink-muted">Country</span>
                      <br />
                      <span className="text-ink">-</span>
                    </p>
                    <p>
                      <span className="text-ink-muted">Postal code</span>
                      <br />
                      <span className="text-ink">-</span>
                    </p>
                    <p>
                      <span className="text-ink-muted">Full address</span>
                      <br />
                      <span className="text-ink">{opportunity?.location || '-'}</span>
                    </p>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-surface-border p-3.5">
            <p className="text-sm font-semibold text-ink">Tags</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {tags.length ? (
                tags.map((t, i) => (
                  <span key={`${t}-${i}`} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    {t}
                  </span>
                ))
              ) : (
                <p className="text-xs text-ink-muted">No tags</p>
              )}
            </div>
          </section>
        </aside>

        <section className="rounded-2xl border border-surface-border bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2 border-b border-surface-border pb-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-9 border-b-2 px-3 text-sm ${
                  activeTab === tab.id ? 'border-brand-600 bg-white font-semibold text-ink' : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'activity' ? (
            <div className="mt-4 space-y-2">
              {syntheticActivities.map((activity, index) => {
                const showDayMarker = index === 0
                const displayHeadline = activity.metadata?.title?.trim() || activity.body || 'Activity'
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
                      </div>
                      <p className="mt-2 text-right text-[11px] font-medium text-ink-muted">by {activity.user?.name || 'System user'}</p>
                    </div>
                  </article>
                )
              })}
              {syntheticActivities.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border p-8 text-center">
                  <p className="text-sm font-medium text-ink">No activity</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-surface-border p-3 text-sm text-ink-muted">This tab is not implemented for opportunities yet.</div>
          )}
        </section>
      </div>
    </PageShell>
  )
}

