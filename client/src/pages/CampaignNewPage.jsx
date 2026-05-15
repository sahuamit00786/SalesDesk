import { useMemo, useState, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { TablePaginationBar } from '@/components/ui/TablePaginationBar'
import { useGetLeadsQuery } from '@/features/leads/leadsApi'
import { LeadSourceTag } from '@/features/leads/components/LeadSourceTag'
import { useTeamUsersQuery } from '@/features/team/teamApi'
import { useCreateCampaignMutation } from '@/features/campaigns/campaignsApi'
import { cn } from '@/utils/cn'

export function CampaignNewPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [oppFilter, setOppFilter] = useState('') // '' | 'true' | 'false'
  const [selected, setSelected] = useState(() => new Set())

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [leadTarget, setLeadTarget] = useState('')
  const [campaignStatus, setCampaignStatus] = useState('active')
  const [teamPick, setTeamPick] = useState(() => new Set())
  const [preferExisting, setPreferExisting] = useState(true)
  const [skipLeadOwner, setSkipLeadOwner] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const listParams = useMemo(
    () => ({
      page,
      limit: 100,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(oppFilter === 'true' || oppFilter === 'false' ? { isOpportunity: oppFilter } : {}),
    }),
    [page, debouncedSearch, oppFilter],
  )

  const { data, isLoading, isFetching } = useGetLeadsQuery(listParams)
  const { data: teamData } = useTeamUsersQuery()
  const [createCampaign, { isLoading: saving }] = useCreateCampaignMutation()

  const leads = useMemo(() => data?.data || [], [data?.data])
  const total = data?.meta?.total ?? 0
  const teamUsers = useMemo(() => {
    const items = teamData?.data?.items || []
    return items.filter((u) => u.isActive !== false)
  }, [teamData?.data?.items])

  const toggleLead = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleTeam = useCallback((id) => {
    setTeamPick((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAllOnPage = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const l of leads) next.add(l.id)
      return next
    })
  }, [leads])

  const clearSelection = useCallback(() => setSelected(new Set()), [])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    if (teamPick.size < 1) return
    if (selected.size < 1) return
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        leadIds: [...selected],
        teamUserIds: [...teamPick],
        preferExistingTeamAssignee: preferExisting,
        skipUpdatingLeadAssignedTo: skipLeadOwner,
        status: campaignStatus,
      }
      const rawTarget = leadTarget.trim()
      if (rawTarget !== '') {
        const n = Number.parseFloat(rawTarget)
        if (Number.isFinite(n) && n >= 0) payload.leadTarget = n
      }
      const res = await createCampaign(payload).unwrap()
      const id = res?.data?.id
      if (id) navigate(`/campaigns/${id}`)
      else navigate('/campaigns')
    } catch {
      /* toast in api */
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / 100))

  return (
    <PageShell fullWidth flush mainClassName="px-0 sm:px-0">
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
        <section className="min-h-0 flex-1 border-b border-neutral-200 lg:border-b-0 lg:border-r">
          <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-base font-bold text-neutral-900">Select leads</h1>
                <p className="text-xs text-neutral-600">Leads and opportunities in this workspace. Up to 100 per page.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-neutral-600">{selected.size} selected</span>
                <button type="button" className="text-xs font-semibold text-orange-700 hover:underline" onClick={selectAllOnPage}>
                  Add page
                </button>
                <button type="button" className="text-xs font-semibold text-neutral-600 hover:underline" onClick={clearSelection}>
                  Clear
                </button>
              </div>
            </div>
            <div className="mt-3 flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search leads…"
                  className="w-full rounded-xl border border-neutral-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-orange-400"
                />
              </div>
              <select
                value={oppFilter}
                onChange={(e) => {
                  setOppFilter(e.target.value)
                  setPage(1)
                }}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-800 outline-none focus:border-orange-400"
              >
                <option value="">All types</option>
                <option value="false">Leads only</option>
                <option value="true">Opportunities only</option>
              </select>
            </div>
          </div>

          <div className="w-full min-w-0 px-4 py-4 sm:px-6">
            {isLoading ? (
              <p className="text-sm text-neutral-500">Loading leads…</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
                  <table className="cx-table cx-table--dense min-w-[720px] text-xs">
                    <thead className="cx-table-sticky-head">
                      <tr>
                        <th className="cx-table-cell-actions w-10" />
                        <th>Lead</th>
                        <th className="hidden sm:table-cell">Company</th>
                        <th>Source</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((l) => {
                        const checked = selected.has(l.id)
                        const email = String(l.email || '').trim()
                        const phone = String(l.phone || '').trim()
                        return (
                          <tr
                            key={l.id}
                            className={cn(checked && 'bg-orange-50/50')}
                          >
                            <td className="cx-table-cell-actions align-middle">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleLead(l.id)}
                                className="rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                              />
                            </td>
                            <td>
                              <button type="button" className="text-left font-semibold text-neutral-900 hover:text-orange-700" onClick={() => toggleLead(l.id)}>
                                {l.title || l.contactName || 'Untitled'}
                              </button>
                              <div className="text-[11px] text-neutral-500 sm:hidden">{l.company || '—'}</div>
                            </td>
                            <td className="hidden text-neutral-700 sm:table-cell">{l.company || '—'}</td>
                            <td>
                              <LeadSourceTag source={l.source} />
                            </td>
                            <td className="max-w-[11rem] truncate text-neutral-700" title={email || undefined}>
                              {email || '—'}
                            </td>
                            <td className="max-w-[9rem] truncate text-neutral-700" title={phone || undefined}>
                              {phone || '—'}
                            </td>
                            <td>
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                  l.isOpportunity ? 'bg-violet-100 text-violet-800' : 'bg-neutral-100 text-neutral-700',
                                )}
                              >
                                {l.isOpportunity ? 'Opportunity' : 'Lead'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 ? (
                  <div className="mt-3">
                    <TablePaginationBar
                      variant="neutral"
                      page={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      subLabel={<>{total.toLocaleString()} total leads</>}
                    />
                  </div>
                ) : null}
                {isFetching && !isLoading ? <p className="mt-2 text-[11px] text-neutral-400">Updating…</p> : null}
              </>
            )}
          </div>
        </section>

        <aside className="w-full shrink-0 border-t-2 border-orange-500/35 bg-white lg:w-[min(420px,40vw)] lg:border-l lg:border-t-0">
          <div className="sticky top-0 flex max-h-dvh flex-col overflow-hidden lg:max-h-none">
            <header className="border-b border-neutral-200 px-4 py-3 sm:px-5">
              <h2 className="text-sm font-bold text-neutral-900">Campaign details</h2>
              <p className="mt-0.5 text-xs text-neutral-600">Name, team assignment, and lead owner updates.</p>
            </header>
            <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="space-y-4 px-4 py-4 sm:px-5">
                <label className="block">
                  <span className="text-xs font-semibold text-neutral-700">Campaign name</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                    placeholder="e.g. Q1 nurture"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-neutral-700">Description</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
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
                    value={leadTarget}
                    onChange={(e) => setLeadTarget(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                    placeholder="Optional amount goal"
                  />
                  <span className="mt-1 block text-[11px] text-neutral-500">Used on the campaign page for amount target vs. achieved amount.</span>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-neutral-700">Status</span>
                  <select
                    value={campaignStatus}
                    onChange={(e) => setCampaignStatus(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
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
                              className="rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
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
                    className="mt-0.5 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
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
                    className="mt-0.5 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span>
                    <span className="text-xs font-semibold text-neutral-800">Do not update lead owner</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-neutral-600">
                      Only store the campaign assignee; leave each lead&apos;s CRM owner unchanged.
                    </span>
                  </span>
                </label>
              </div>

              <div className="mt-auto border-t border-neutral-200 bg-white px-4 py-3 sm:px-5">
                <button
                  type="submit"
                  disabled={saving || selected.size < 1 || teamPick.size < 1 || !name.trim()}
                  className="w-full rounded-xl bg-orange-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Creating…' : `Create campaign (${selected.size} leads)`}
                </button>
                <Link to="/campaigns" className="mt-2 block text-center text-xs font-semibold text-neutral-600 hover:text-neutral-900">
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </aside>
      </div>
    </PageShell>
  )
}
