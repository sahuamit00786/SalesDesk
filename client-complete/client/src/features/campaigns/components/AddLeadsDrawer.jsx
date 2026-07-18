import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserPlus } from '@/components/ui/icons'
import toast from 'react-hot-toast'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { Button } from '@/components/ui/Button'
import { useGetLeadsQuery } from '@/features/leads/leadsApi'
import { useAddCampaignLeadsMutation } from '@/features/campaigns/campaignsApi'
import { cn } from '@/utils/cn'

function initials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || '?'
}

export function AddLeadsDrawer({ open, onClose, campaignId, existingLeadIds = [] }) {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [preferExisting, setPreferExisting] = useState(false)
  const [skipOwner, setSkipOwner] = useState(false)

  const existingSet = useMemo(() => new Set(existingLeadIds.map(String)), [existingLeadIds])

  // debounce
  const onSearchChange = (v) => {
    setQ(v)
    clearTimeout(window.__addLeadsDbTimer)
    window.__addLeadsDbTimer = setTimeout(() => setDebouncedQ(v.trim()), 300)
  }

  const { data: leadsRes, isLoading } = useGetLeadsQuery(
    { search: debouncedQ || undefined, limit: 80, page: 1 },
    { skip: !open },
  )
  const allLeads = leadsRes?.data?.items || leadsRes?.data || []

  const rows = useMemo(
    () => allLeads.filter((l) => !existingSet.has(String(l.id))),
    [allLeads, existingSet],
  )

  const [addLeads, { isLoading: adding }] = useAddCampaignLeadsMutation()

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === rows.length && rows.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(rows.map((r) => r.id)))
    }
  }

  const handleClose = () => {
    setQ('')
    setDebouncedQ('')
    setSelected(new Set())
    onClose()
  }

  const handleAdd = async () => {
    if (!selected.size) return
    try {
      const res = await addLeads({
        campaignId,
        leadIds: [...selected],
        preferExistingTeamAssignee: preferExisting,
        skipUpdatingLeadAssignedTo: skipOwner,
      }).unwrap()
      const added = res?.data?.added ?? selected.size
      const skipped = res?.data?.skipped ?? 0
      toast.success(`${added} lead${added !== 1 ? 's' : ''} added${skipped ? ` (${skipped} already in campaign)` : ''}`)
      handleClose()
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Could not add leads')
    }
  }

  const allChecked = rows.length > 0 && selected.size === rows.length

  return (
    <RightDrawer
      open={open}
      onClose={handleClose}
      title="Add leads to campaign"
      description="Pick leads to add. They'll be distributed to your team round-robin."
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">
            {selected.size > 0 ? <span className="font-semibold text-ink">{selected.size} selected</span> : 'None selected'}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" disabled={!selected.size || adding} onClick={handleAdd}>
              <UserPlus className="h-4 w-4" />
              {adding ? 'Adding…' : `Add ${selected.size || ''} lead${selected.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            className="h-10 w-full rounded-xl border border-surface-border bg-white pl-9 pr-4 text-sm outline-none focus:border-brand-400"
            placeholder="Search by name, email, company…"
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Distribution options */}
        <div className="space-y-2 rounded-xl border border-surface-border bg-surface-subtle/50 px-3 py-2.5">
          <p className="text-xs font-semibold text-ink">Distribution options</p>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
            <input
              type="checkbox"
              className="rounded border-neutral-300 text-brand-700"
              checked={preferExisting}
              onChange={(e) => setPreferExisting(e.target.checked)}
            />
            Prefer lead's current owner if they're on the team
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
            <input
              type="checkbox"
              className="rounded border-neutral-300 text-brand-700"
              checked={skipOwner}
              onChange={(e) => setSkipOwner(e.target.checked)}
            />
            Don't update lead's owner (campaign assignment only)
          </label>
        </div>

        {/* Lead list */}
        <div className="overflow-hidden rounded-xl border border-surface-border">
          <div className="flex items-center gap-3 border-b border-surface-border bg-surface-subtle/60 px-3 py-2">
            <input
              type="checkbox"
              className="rounded border-neutral-300 text-brand-700"
              checked={allChecked}
              onChange={toggleAll}
              disabled={rows.length === 0}
            />
            <span className="text-xs font-semibold text-ink-muted">
              {isLoading ? 'Loading…' : `${rows.length} lead${rows.length !== 1 ? 's' : ''} available`}
            </span>
          </div>

          <div className="max-h-[min(52vh,480px)] divide-y divide-surface-border overflow-y-auto">
            {rows.length === 0 && !isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">
                {existingSet.size > 0 && allLeads.length === existingSet.size
                  ? 'All matching leads are already in this campaign.'
                  : 'No leads found.'}
              </p>
            ) : null}

            {rows.map((lead) => {
              const name = (lead.contactName || lead.title || 'Untitled').trim()
              const isSelected = selected.has(lead.id)
              return (
                <label
                  key={lead.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors',
                    isSelected ? 'bg-brand-50' : 'hover:bg-surface-subtle/50',
                  )}
                >
                  <input
                    type="checkbox"
                    className="shrink-0 rounded border-neutral-300 text-brand-700"
                    checked={isSelected}
                    onChange={() => toggle(lead.id)}
                  />
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-50 text-xs font-bold text-brand-800">
                    {initials(name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{name}</p>
                    <p className="truncate text-xs text-ink-muted">{lead.email || lead.company || '—'}</p>
                  </div>
                  <Link
                    to={`/leads/${lead.id}`}
                    target="_blank"
                    className="shrink-0 text-xs text-brand-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                  </Link>
                </label>
              )
            })}
          </div>
        </div>
      </div>
    </RightDrawer>
  )
}
