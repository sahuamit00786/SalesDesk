import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, CalendarDays, LineChart, ListChecks, Megaphone, MoreHorizontal, RefreshCw, ShoppingBag, Users } from '@/components/ui/icons'
import { SkeletonCards } from '@/components/shared/SkeletonLoader'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageShell } from '@/components/layout/PageShell'
import { PageFilterBar } from '@/components/layout/PageFilterBar'
import { PageStack } from '@/components/layout/PageStack'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { useGetCampaignQuery, useListCampaignsQuery, usePatchCampaignMutation } from '@/features/campaigns/campaignsApi'
import { CurrencyPicker } from '@/components/shared/CurrencyPicker'
import { formatCampaignEndDate, toCampaignDateInputValue } from '@/features/campaigns/campaignDateUtils'
import { useTeamUsersQuery } from '@/features/team/teamApi'
import { cn } from '@/utils/cn'
import { usePermission } from '@/hooks/usePermission'

const STATUS_META = {
  active: { label: 'Active', tone: 'border-emerald-300 bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  inactive: { label: 'Inactive', tone: 'border-neutral-300 bg-neutral-100 text-neutral-700', dot: 'bg-neutral-500' },
  draft: { label: 'Draft', tone: 'border-amber-300 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
}

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'draft', label: 'Draft' },
]

const ACCENTS = [
  { Icon: BarChart3, bg: 'bg-amber-500', ring: 'ring-amber-200' },
  { Icon: Megaphone, bg: 'bg-[var(--brand-primary)]', ring: 'ring-brand-200' },
  { Icon: ShoppingBag, bg: 'bg-slate-500', ring: 'ring-brand-200' },
]

function CampaignCard({ campaign, index, onEdit }) {
  const { Icon, bg, ring } = ACCENTS[index % ACCENTS.length]
  const metrics = Array.isArray(campaign.metrics) ? campaign.metrics : []
  const description = String(campaign.description || '').trim() || 'No description yet.'
  const endDateLabel = formatCampaignEndDate(campaign.endDate)
  const teamCount = Number(campaign.teamCount) || 0
  const totalLeads = Number(campaign.totalLeads) || 0
  const status = String(campaign.status || 'active').toLowerCase()
  const statusMeta = STATUS_META[status] || STATUS_META.active

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-sm sm:flex-row sm:items-stretch sm:justify-between sm:gap-6 sm:p-5">
      <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-inner ring-2 ring-offset-2 ring-offset-white',
            bg,
            ring,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold tracking-tight text-neutral-900 sm:text-base">{campaign.name}</h2>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-600 sm:text-sm">{description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-700">Campaign</span>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-700">Workspace</span>
            {endDateLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand-800">
                <CalendarDays className="h-3 w-3" aria-hidden />
                Ends {endDateLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col justify-between gap-4 border-t border-neutral-100 pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <div className="flex items-center gap-3 text-neutral-500">
            <span className="flex items-center gap-1 text-xs font-medium">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {String(teamCount).padStart(2, '0')}
            </span>
            <span className="flex items-center gap-1 text-xs font-medium">
              <ListChecks className="h-3.5 w-3.5" aria-hidden />
              {String(totalLeads).padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', statusMeta.tone)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', statusMeta.dot)} aria-hidden />
              {statusMeta.label}
            </span>
            <Link
              to={`/campaigns/${campaign.id}/report`}
              title="View report"
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-brand-50 hover:text-brand-600"
              aria-label={`View report for ${campaign.name}`}
            >
              <LineChart className="h-4 w-4" />
            </Link>
            {onEdit ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onEdit(campaign)
                }}
                className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
                aria-label={`Edit ${campaign.name}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-stretch sm:gap-0 sm:divide-x sm:divide-neutral-200">
          {metrics.slice(0, 4).map((m) => (
            <div key={m.key} className="flex min-w-0 flex-col gap-0.5 sm:min-w-[5.5rem] sm:px-3 sm:first:pl-0">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold tabular-nums text-neutral-900 sm:text-xl">{m.count ?? 0}</span>
              </div>
              <span className="text-[11px] font-semibold text-neutral-800">{m.label}</span>
              <span className="text-[10px] text-neutral-400">In funnel</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

export function CampaignsListPage() {
  const canView = usePermission('automate.campaigns', 'view')
  const canCreate = usePermission('automate.campaigns', 'create')
  const canUpdate = usePermission('automate.campaigns', 'update')
  const [statusTab, setStatusTab] = useState('')
  const { data, isLoading, isFetching, refetch } = useListCampaignsQuery(statusTab ? { status: statusTab } : {}, { skip: !canView })
  const [patchCampaign, { isLoading: savingCampaign }] = usePatchCampaignMutation()
  const [editingCampaign, setEditingCampaign] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLeadTarget, setEditLeadTarget] = useState('')
  const [editCurrency, setEditCurrency] = useState('USD')
  const [editStatus, setEditStatus] = useState('active')
  const [editEndDate, setEditEndDate] = useState('')
  const [teamPick, setTeamPick] = useState(() => new Set())
  const [preferExisting, setPreferExisting] = useState(true)
  const [skipLeadOwner, setSkipLeadOwner] = useState(false)
  const rows = useMemo(() => data?.data || [], [data?.data])

  const editCampaignId = editingCampaign?.id
  const { data: campaignDetail, isLoading: loadingCampaignDetail } = useGetCampaignQuery(editCampaignId, {
    skip: !editCampaignId,
  })
  const { data: teamData } = useTeamUsersQuery(undefined, { skip: !editCampaignId })
  const teamUsers = useMemo(() => {
    const items = teamData?.data?.items || []
    return items.filter((u) => u.isActive !== false)
  }, [teamData?.data?.items])

  const toggleTeam = useCallback((id) => {
    setTeamPick((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  useEffect(() => {
    const c = campaignDetail?.data
    if (!editCampaignId || !c || c.id !== editCampaignId) return
    setEditName(String(c.name || ''))
    setEditDescription(String(c.description || ''))
    const target = Number(c.leadTarget)
    setEditLeadTarget(Number.isFinite(target) && target >= 0 ? String(target) : '')
    setEditCurrency(String(c.currency || 'USD'))
    setEditStatus(String(c.status || 'active'))
    setEditEndDate(toCampaignDateInputValue(c.endDate))
    const memberIds = (Array.isArray(c.teamMembers) ? c.teamMembers : [])
      .map((m) => m.userId || m.user?.id)
      .filter(Boolean)
    setTeamPick(new Set(memberIds))
    setPreferExisting(c.preferExistingTeamAssignee !== false)
    setSkipLeadOwner(Boolean(c.skipUpdatingLeadAssignedTo))
  }, [editCampaignId, campaignDetail?.data])

  const openEditDrawer = (campaign) => {
    if (!canUpdate) return
    setEditingCampaign(campaign)
    setEditName(String(campaign?.name || ''))
    setEditDescription(String(campaign?.description || ''))
    const target = Number(campaign?.leadTarget)
    setEditLeadTarget(Number.isFinite(target) && target >= 0 ? String(target) : '')
    setEditCurrency(String(campaign?.currency || 'USD'))
    setEditStatus(String(campaign?.status || 'active'))
    setEditEndDate(toCampaignDateInputValue(campaign?.endDate))
    setTeamPick(new Set())
    setPreferExisting(true)
    setSkipLeadOwner(false)
  }

  const closeEditDrawer = () => {
    if (savingCampaign) return
    setEditingCampaign(null)
  }

  const onSaveCampaign = async (e) => {
    e.preventDefault()
    if (!editingCampaign?.id) return

    if (teamPick.size < 1) return

    const payload = { id: editingCampaign.id, name: editName.trim() }
    payload.description = editDescription.trim() || null
    const rawTarget = editLeadTarget.trim()
    payload.leadTarget = rawTarget === '' ? null : Number.parseFloat(rawTarget) || 0
    payload.currency = editCurrency
    payload.status = editStatus
    payload.endDate = editEndDate.trim() || null
    payload.teamUserIds = [...teamPick]
    payload.preferExistingTeamAssignee = preferExisting
    payload.skipUpdatingLeadAssignedTo = skipLeadOwner

    try {
      await patchCampaign(payload).unwrap()
      closeEditDrawer()
    } catch {
      /* toast handled in api */
    }
  }

  return (
    <PageShell fullWidth mainClassName="pt-1.5 pb-3 sm:pb-4">
      <PageStack className="gap-3">
        <PageFilterBar>
          <div className="inline-flex shrink-0 rounded-xl border border-surface-border bg-white p-1 shadow-sm">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key || 'all'}
                type="button"
                onClick={() => setStatusTab(tab.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  statusTab === tab.key
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'text-ink-muted hover:bg-brand-50 hover:text-ink',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            title="Refresh"
            onClick={() => refetch()}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-white px-2.5 text-xs font-semibold text-ink shadow-sm hover:bg-brand-50/50"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          {canCreate ? (
            <Link
              to="/campaigns/new"
              className="ml-auto inline-flex h-10 shrink-0 items-center rounded-xl bg-[var(--brand-primary)] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[var(--brand-primary-dark)]"
            >
              New campaign
            </Link>
          ) : null}
        </PageFilterBar>

        {isLoading ? (
          <SkeletonCards count={4} cols="grid-cols-1" cardHeight="h-36" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Create a campaign to assign a team and track lead stages."
            action={
              <Link
                to="/campaigns/new"
                className="inline-flex rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-primary-dark)]"
              >
                Create your first campaign
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {rows.map((c, i) => (
              <li key={c.id}>
                <Link to={`/campaigns/${c.id}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded-2xl">
                  <CampaignCard campaign={c} index={i} onEdit={canUpdate ? openEditDrawer : undefined} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageStack>
      <RightDrawer
        open={!!editingCampaign}
        onClose={closeEditDrawer}
        title="Edit campaign"
        description="Name, team assignment, and lead owner preferences."
        footer={(
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeEditDrawer}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              disabled={savingCampaign}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-campaign-form"
              className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={savingCampaign || loadingCampaignDetail || !editName.trim() || teamPick.size < 1}
            >
              {savingCampaign ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      >
        {loadingCampaignDetail ? (
          <p className="py-6 text-center text-xs text-neutral-500">Loading campaign…</p>
        ) : (
          <form id="edit-campaign-form" onSubmit={onSaveCampaign} className="space-y-4 py-2">
            <label className="block">
              <span className="text-xs font-semibold text-neutral-700">Campaign name</span>
              <input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                placeholder="e.g. Q1 nurture"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-neutral-700">Description</span>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                placeholder="What is this campaign for?"
              />
            </label>
            <div className="block">
              <span className="text-xs font-semibold text-neutral-700">Currency</span>
              <div className="mt-1">
                <CurrencyPicker value={editCurrency} onChange={setEditCurrency} />
              </div>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-neutral-700">Campaign target (amount)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="numeric"
                value={editLeadTarget}
                onChange={(e) => setEditLeadTarget(e.target.value.replace(/[^0-9.]/g, ''))}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                placeholder="Optional amount goal"
              />
              <span className="mt-1 block text-[11px] text-neutral-500">
                Used on the campaign page for amount target vs. achieved amount ({editCurrency}).
              </span>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-neutral-700">Status</span>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-neutral-700">End date</span>
              <input
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <span className="mt-1 block text-[11px] text-neutral-500">Optional — when this campaign is scheduled to finish.</span>
            </label>

            <div>
              <span className="text-xs font-semibold text-neutral-700">Assign to team members</span>
              <p className="mt-0.5 text-[11px] text-neutral-500">Leads are distributed across checked members (round-robin).</p>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-neutral-100 bg-neutral-50/50 p-2">
                {teamUsers.map((u) => {
                  const id = u.id
                  const checked = teamPick.has(id)
                  return (
                    <li key={id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-white">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTeam(id)}
                          className="rounded border-neutral-300 text-brand-700 focus:ring-brand-500"
                        />
                        <span className="font-medium text-neutral-800">{u.name || u.email}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>

            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-neutral-100 bg-neutral-50/80 p-3">
              <input
                type="checkbox"
                checked={preferExisting}
                onChange={(e) => setPreferExisting(e.target.checked)}
                className="mt-0.5 rounded border-neutral-300 text-brand-700 focus:ring-brand-500"
              />
              <span>
                <span className="text-xs font-semibold text-neutral-800">Prefer existing assignee</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-neutral-600">
                  If a lead is already owned by someone on the team above, keep that person for this campaign.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-neutral-100 bg-neutral-50/80 p-3">
              <input
                type="checkbox"
                checked={skipLeadOwner}
                onChange={(e) => setSkipLeadOwner(e.target.checked)}
                className="mt-0.5 rounded border-neutral-300 text-brand-700 focus:ring-brand-500"
              />
              <span>
                <span className="text-xs font-semibold text-neutral-800">Do not update lead owner</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-neutral-600">
                  Only store the campaign assignee; leave each lead&apos;s CRM owner unchanged.
                </span>
              </span>
            </label>
          </form>
        )}
      </RightDrawer>
    </PageShell>
  )
}
