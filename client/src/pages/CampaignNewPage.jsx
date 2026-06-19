import { useMemo, useState, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '@/components/layout/PageShell'
import { DataGrid } from '@/components/shared/DataGrid'
import { TablePaginationBar } from '@/components/ui/TablePaginationBar'
import { useGetLeadsQuery, useGetLeadFormMetaQuery } from '@/features/leads/leadsApi'
import { LeadSourceTag } from '@/features/leads/components/LeadSourceTag'
import { FilterBuilder } from '@/features/leads/components/FilterBuilder'
import { useTeamUsersQuery } from '@/features/team/teamApi'
import { useCreateCampaignMutation } from '@/features/campaigns/campaignsApi'
import {
  CAMPAIGN_TEAM_FILTER_INITIAL,
  CampaignTeamFilterPanel,
  countCampaignTeamFilters,
  filterCampaignTeamUsers,
} from '@/features/campaigns/components/CampaignTeamFilterPanel'
import { selectWorkspaceList } from '@/features/workspace/workspaceSlice'
import { ListSearchToolbar, buildLeadsListQueryParams, countActiveRules } from '@/features/filters'
import { cn } from '@/utils/cn'
import { CurrencyPicker } from '@/components/shared/CurrencyPicker'
import { useEffectiveCurrency } from '@/hooks/useEffectiveCurrency'

const LEAD_PICKER_FILTERS_INITIAL = {
  search: '',
  status: [],
  source: [],
  assignedTo: [],
  scoreMin: null,
  scoreMax: null,
  valueMin: null,
  valueMax: null,
  tags: [],
  savedViewId: null,
  workspaceId: '',
  filterTree: null,
  stage: [],
  unassignedOnly: false,
}

export function CampaignNewPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [oppFilter, setOppFilter] = useState('') // '' | 'true' | 'false'
  const [leadFilters, setLeadFilters] = useState(LEAD_PICKER_FILTERS_INITIAL)
  const [leadFilterOpen, setLeadFilterOpen] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [teamSearch, setTeamSearch] = useState('')
  const [teamFilters, setTeamFilters] = useState(CAMPAIGN_TEAM_FILTER_INITIAL)
  const [teamFilterOpen, setTeamFilterOpen] = useState(false)
  const [teamFiltersDraft, setTeamFiltersDraft] = useState(CAMPAIGN_TEAM_FILTER_INITIAL)

  const user = useSelector((s) => s.auth.user)
  const workspaceList = useSelector(selectWorkspaceList)
  const isCompanyAdmin = Boolean(user?.isCompanyAdmin)
  const userRoleKind = user?.companyRole?.userRoleKind
  const canSwitchWorkspace =
    isCompanyAdmin || userRoleKind === 'workspace_admin' || userRoleKind === 'manager'

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [leadTarget, setLeadTarget] = useState('')
  const [campaignCurrency, setCampaignCurrency] = useState('USD')
  const effectiveCurrency = useEffectiveCurrency()
  const [campaignStatus, setCampaignStatus] = useState('active')
  const [endDate, setEndDate] = useState('')
  const [teamPick, setTeamPick] = useState(() => new Set())
  const [preferExisting, setPreferExisting] = useState(true)
  const [skipLeadOwner, setSkipLeadOwner] = useState(false)

  const listParams = useMemo(() => {
    const params = buildLeadsListQueryParams({
      filters: leadFilters,
      sort: { field: 'createdAt', order: 'desc' },
      pagination: { page, limit: 100 },
      isOpportunity: oppFilter === 'true',
    })
    if (oppFilter === 'true') params.isOpportunity = true
    else if (oppFilter === 'false') params.isOpportunity = false
    else delete params.isOpportunity
    return params
  }, [leadFilters, page, oppFilter])

  const { data, isLoading, isFetching } = useGetLeadsQuery(listParams)
  const { data: formMetaData } = useGetLeadFormMetaQuery()
  const { data: teamData } = useTeamUsersQuery()
  const [createCampaign, { isLoading: saving }] = useCreateCampaignMutation()

  useEffect(() => {
    setCampaignCurrency(effectiveCurrency)
  }, [effectiveCurrency])

  const leads = useMemo(() => data?.data || [], [data?.data])
  const total = data?.meta?.total ?? 0
  const formUsers = formMetaData?.data?.users || []
  const opportunityStages = formMetaData?.data?.opportunityStages || []
  const stageOptions = opportunityStages.map((s) => ({
    value: s.name || s.key || s.id,
    label: s.name || s.key || 'Stage',
  }))
  const isOpportunitiesPicker = oppFilter === 'true'
  const advancedRuleCount = countActiveRules(leadFilters.filterTree)
  const leadFilterCount =
    advancedRuleCount +
    (leadFilters.status?.length || 0) +
    (leadFilters.assignedTo?.length || 0) +
    (leadFilters.source?.length || 0) +
    (leadFilters.stage?.length || 0) +
    (leadFilters.workspaceId ? 1 : 0) +
    (leadFilters.valueMin != null ? 1 : 0) +
    (leadFilters.valueMax != null ? 1 : 0) +
    (leadFilters.unassignedOnly ? 1 : 0)

  const allTeamUsers = useMemo(() => teamData?.data?.items || [], [teamData?.data?.items])
  const teamFilterCount = countCampaignTeamFilters(teamFilters)
  const teamUsers = useMemo(
    () => filterCampaignTeamUsers(allTeamUsers, { ...teamFilters, search: teamSearch }),
    [allTeamUsers, teamFilters, teamSearch],
  )

  const resetLeadFilters = useCallback(() => {
    setLeadFilters(LEAD_PICKER_FILTERS_INITIAL)
    setPage(1)
  }, [])

  const patchLeadFilters = useCallback((delta) => {
    setLeadFilters((prev) => ({ ...prev, ...delta }))
    setPage(1)
  }, [])

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

  const leadPickerColumns = useMemo(
    () => [
      {
        field: 'select',
        headerName: '',
        width: 50,
        sortable: false,
        renderCell: ({ row: l }) => (
          <input
            type="checkbox"
            checked={selected.has(l.id)}
            onChange={() => toggleLead(l.id)}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-neutral-300 text-brand-700 focus:ring-brand-500"
          />
        ),
      },
      {
        field: 'title',
        headerName: 'Lead',
        flex: 1,
        minWidth: 160,
        renderCell: ({ row: l }) => (
          <div>
            <button
              type="button"
              className="text-left font-semibold text-neutral-900 hover:text-brand-700"
              onClick={(e) => {
                e.stopPropagation()
                toggleLead(l.id)
              }}
            >
              {l.title || l.contactName || 'Untitled'}
            </button>
            <div className="text-[11px] text-neutral-500 sm:hidden">{l.company || '—'}</div>
          </div>
        ),
      },
      {
        field: 'company',
        headerName: 'Company',
        width: 140,
        valueGetter: (_v, l) => l.company || '—',
      },
      {
        field: 'source',
        headerName: 'Source',
        width: 120,
        renderCell: ({ row: l }) => <LeadSourceTag source={l.source} />,
      },
      { field: 'email', headerName: 'Email', width: 140, valueGetter: (_v, l) => l.email || '—' },
      { field: 'phone', headerName: 'Phone', width: 120, valueGetter: (_v, l) => l.phone || '—' },
      {
        field: 'type',
        headerName: 'Type',
        width: 110,
        renderCell: ({ row: l }) => (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold',
              l.isOpportunity ? 'bg-slate-100 text-brand-800' : 'bg-neutral-100 text-neutral-700',
            )}
          >
            {l.isOpportunity ? 'Opportunity' : 'Lead'}
          </span>
        ),
      },
    ],
    [selected, toggleLead],
  )

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
        currency: campaignCurrency,
      }
      const rawTarget = leadTarget.trim()
      if (rawTarget !== '') {
        const n = Number.parseFloat(rawTarget)
        if (Number.isFinite(n) && n >= 0) payload.leadTarget = n
      }
      if (endDate.trim()) payload.endDate = endDate.trim()
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
                <button type="button" className="text-xs font-semibold text-brand-700 hover:underline" onClick={selectAllOnPage}>
                  Add page
                </button>
                <button type="button" className="text-xs font-semibold text-neutral-600 hover:underline" onClick={clearSelection}>
                  Clear
                </button>
              </div>
            </div>
            <div className="mt-3 w-full min-w-0">
              <ListSearchToolbar
                search={leadFilters.search || ''}
                onSearchChange={(search) => patchLeadFilters({ search })}
                searchPlaceholder="Search leads by name, company, email…"
                filterOpen={leadFilterOpen}
                onFilterOpenChange={setLeadFilterOpen}
                filterCount={leadFilterCount}
                onClearAll={resetLeadFilters}
                filterPanel={
                  <FilterBuilder
                    filters={leadFilters}
                    workspaceOptions={canSwitchWorkspace ? workspaceList : null}
                    users={formUsers}
                    stageOptions={stageOptions}
                    isOpportunities={isOpportunitiesPicker}
                    onChange={(delta) => patchLeadFilters(delta)}
                    onReset={resetLeadFilters}
                    onDraftApply={(tree) => patchLeadFilters({ filterTree: tree })}
                  />
                }
              >
                <select
                  value={oppFilter}
                  onChange={(e) => {
                    setOppFilter(e.target.value)
                    setPage(1)
                  }}
                  className="h-10 shrink-0 rounded-xl border border-surface-border bg-white px-3 text-sm font-medium text-ink outline-none focus:border-brand-500"
                >
                  <option value="">All types</option>
                  <option value="false">Leads only</option>
                  <option value="true">Opportunities only</option>
                </select>
              </ListSearchToolbar>
            </div>
          </div>

          <div className="w-full min-w-0 px-4 py-4 sm:px-6">
            {isLoading ? (
              <p className="text-sm text-neutral-500">Loading leads…</p>
            ) : (
              <>
                <DataGrid
                  gridColumns
                  columns={leadPickerColumns}
                  data={leads}
                  loading={isLoading || isFetching}
                  searchable={false}
                  showColumnToggle={false}
                  showExportCsv={false}
                  hideFooter
                  getRowClassName={(params) => (selected.has(params.row.id) ? '!bg-brand-50/50' : '')}
                  maxHeightClass="max-h-[min(55vh,480px)]"
                  emptyTitle="No leads found"
                />
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

        <aside className="w-full shrink-0 border-t-2 border-brand-600/35 bg-white lg:w-[min(420px,40vw)] lg:border-l lg:border-t-0">
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
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                    placeholder="e.g. Q1 nurture"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-neutral-700">Description</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                    placeholder="What is this campaign for?"
                  />
                </label>
                <CurrencyPicker
                  value={campaignCurrency}
                  onChange={setCampaignCurrency}
                  label="Campaign currency"
                  required
                  className="mb-1"
                />
                <label className="block">
                  <span className="text-xs font-semibold text-neutral-700">
                    Campaign target ({campaignCurrency})
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="numeric"
                    value={leadTarget}
                    onChange={(e) => setLeadTarget(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                    placeholder="Optional amount goal"
                  />
                  <span className="mt-1 block text-[11px] text-neutral-500">Used on the campaign page for amount target vs. achieved amount.</span>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-neutral-700">Status</span>
                  <select
                    value={campaignStatus}
                    onChange={(e) => setCampaignStatus(e.target.value)}
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
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                  <span className="mt-1 block text-[11px] text-neutral-500">Optional — when this campaign is scheduled to finish.</span>
                </label>

                <div>
                  <span className="text-xs font-semibold text-neutral-700">Assign to team members</span>
                  <p className="mt-0.5 text-[11px] text-neutral-500">Leads are distributed across checked members (round-robin).</p>
                  <div className="mt-2">
                    <ListSearchToolbar
                      className="!px-0"
                      search={teamSearch}
                      onSearchChange={setTeamSearch}
                      searchPlaceholder="Search users by name or email…"
                      filterOpen={teamFilterOpen}
                      onFilterOpenChange={(open) => {
                        setTeamFilterOpen(open)
                        if (open) setTeamFiltersDraft({ ...teamFilters })
                      }}
                      filterCount={teamFilterCount}
                      onClearAll={() => {
                        setTeamFilters(CAMPAIGN_TEAM_FILTER_INITIAL)
                        setTeamFiltersDraft(CAMPAIGN_TEAM_FILTER_INITIAL)
                        setTeamSearch('')
                      }}
                      filterPanel={
                        <CampaignTeamFilterPanel
                          users={allTeamUsers}
                          filters={teamFiltersDraft}
                          onChange={(delta) => setTeamFiltersDraft((prev) => ({ ...prev, ...delta }))}
                          onApply={() => {
                            setTeamFilters(teamFiltersDraft)
                            setTeamFilterOpen(false)
                          }}
                          onReset={() => {
                            setTeamFiltersDraft(CAMPAIGN_TEAM_FILTER_INITIAL)
                            setTeamFilters(CAMPAIGN_TEAM_FILTER_INITIAL)
                          }}
                        />
                      }
                    />
                  </div>
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
                    {!teamUsers.length ? (
                      <li className="px-2 py-3 text-center text-[11px] text-neutral-500">No users match your search or filters.</li>
                    ) : null}
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
              </div>

              <div className="mt-auto border-t border-neutral-200 bg-white px-4 py-3 sm:px-5">
                <button
                  type="submit"
                  disabled={saving || selected.size < 1 || teamPick.size < 1 || !name.trim()}
                  className="w-full rounded-xl bg-[var(--brand-primary)] py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
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
