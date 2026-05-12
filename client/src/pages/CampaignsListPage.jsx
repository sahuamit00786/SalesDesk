import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, ListChecks, Megaphone, MoreHorizontal, ShoppingBag, Users } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { useListCampaignsQuery, usePatchCampaignMutation } from '@/features/campaigns/campaignsApi'
import { cn } from '@/utils/cn'

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
  { Icon: Megaphone, bg: 'bg-sky-500', ring: 'ring-sky-200' },
  { Icon: ShoppingBag, bg: 'bg-violet-500', ring: 'ring-violet-200' },
]

function CampaignCard({ campaign, index, onEdit }) {
  const { Icon, bg, ring } = ACCENTS[index % ACCENTS.length]
  const metrics = Array.isArray(campaign.metrics) ? campaign.metrics : []
  const description = String(campaign.description || '').trim() || 'No description yet.'
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
  const [statusTab, setStatusTab] = useState('')
  const { data, isLoading, isFetching, refetch } = useListCampaignsQuery(statusTab ? { status: statusTab } : {})
  const [patchCampaign, { isLoading: savingCampaign }] = usePatchCampaignMutation()
  const [editingCampaign, setEditingCampaign] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLeadTarget, setEditLeadTarget] = useState('')
  const [editStatus, setEditStatus] = useState('active')
  const rows = useMemo(() => data?.data || [], [data?.data])

  const openEditDrawer = (campaign) => {
    setEditingCampaign(campaign)
    setEditName(String(campaign?.name || ''))
    setEditDescription(String(campaign?.description || ''))
    const target = Number(campaign?.leadTarget)
    setEditLeadTarget(Number.isFinite(target) && target >= 0 ? String(target) : '')
    setEditStatus(String(campaign?.status || 'active'))
  }

  const closeEditDrawer = () => {
    if (savingCampaign) return
    setEditingCampaign(null)
  }

  const onSaveCampaign = async (e) => {
    e.preventDefault()
    if (!editingCampaign?.id) return

    const payload = { id: editingCampaign.id, name: editName.trim() }
    payload.description = editDescription.trim() || null
    const rawTarget = editLeadTarget.trim()
    payload.leadTarget = rawTarget === '' ? null : Number.parseFloat(rawTarget) || 0
    payload.status = editStatus

    try {
      await patchCampaign(payload).unwrap()
      closeEditDrawer()
    } catch {
      /* toast handled in api */
    }
  }

  return (
    <PageShell fullWidth mainClassName="px-4 sm:px-6 pt-3 pb-4 sm:pb-6">
      <div className="flex w-full min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key || 'all'}
                type="button"
                onClick={() => setStatusTab(tab.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  statusTab === tab.key ? 'bg-orange-600 text-white' : 'text-neutral-700 hover:bg-neutral-100',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
          <Link
            to="/campaigns/new"
            className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-orange-700"
          >
            New campaign
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-neutral-500">Loading campaigns…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 p-8 text-center">
            <p className="text-sm font-medium text-neutral-800">No campaigns yet</p>
            <p className="mt-1 text-xs text-neutral-600">Create a campaign to assign a team and track stages.</p>
            <Link
              to="/campaigns/new"
              className="mt-4 inline-flex rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700"
            >
              Create your first campaign
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {rows.map((c, i) => (
              <li key={c.id}>
                <Link to={`/campaigns/${c.id}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 rounded-2xl">
                  <CampaignCard campaign={c} index={i} onEdit={openEditDrawer} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <RightDrawer
        open={!!editingCampaign}
        onClose={closeEditDrawer}
        title="Edit campaign"
        description="Update campaign basics from this sidebar."
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
              className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={savingCampaign || !editName.trim()}
            >
              {savingCampaign ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      >
        <form id="edit-campaign-form" onSubmit={onSaveCampaign} className="space-y-4 py-2">
          <label className="block">
            <span className="text-xs font-semibold text-neutral-700">Campaign name</span>
            <input
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              placeholder="Campaign name"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-neutral-700">Description</span>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              className="mt-1 w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              placeholder="What is this campaign for?"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-neutral-700">Campaign target (amount)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="numeric"
              value={editLeadTarget}
              onChange={(e) => setEditLeadTarget(e.target.value.replace(/[^0-9.]/g, ''))}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              placeholder="Optional amount goal"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-neutral-700">Status</span>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>
          </label>
        </form>
      </RightDrawer>
    </PageShell>
  )
}
