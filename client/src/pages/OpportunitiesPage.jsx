import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Filter, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { CreateOpportunityModal } from '@/features/opportunities/components/CreateOpportunityModal'
import { useCreateOpportunityMutation, useGetOpportunitiesQuery } from '@/features/opportunities/opportunitiesApi'
import { useGetLeadFormMetaQuery } from '@/features/leads/leadsApi'

const STAGE_FILTER_FALLBACK = [
  'All Stages',
  'Lead Inbound',
  'New',
  'Contacted',
  'Qualified',
  'Proposal Made',
  'Negotiation',
  'Won',
  'Lost',
]

function initials(name) {
  return String(name || 'NA')
    .split(' ')
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function OpportunitiesPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('list')
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('All Stages')
  const [ownerUserId, setOwnerUserId] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [openCreate, setOpenCreate] = useState(false)
  const query = Object.fromEntries(
    Object.entries({
      page,
      limit,
      search: search ? search : undefined,
      stage: stage === 'All Stages' ? undefined : stage,
      ownerUserId: ownerUserId ? ownerUserId : undefined,
    }).filter(([, v]) => v !== undefined),
  )

  const { data, isLoading } = useGetOpportunitiesQuery(query)
  const { data: formMetaData } = useGetLeadFormMetaQuery()
  const [createOpportunity, { isLoading: saving }] = useCreateOpportunityMutation()

  const rows = data?.data || []
  const total = data?.meta?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const users = formMetaData?.data?.users || []
  const opportunityStages = formMetaData?.data?.opportunityStages || []

  const stageFilterOptions = useMemo(() => {
    const names = opportunityStages.map((s) => s.name).filter(Boolean)
    if (names.length) return ['All Stages', ...names]
    return STAGE_FILTER_FALLBACK
  }, [opportunityStages])

  useEffect(() => {
    if (stage === 'All Stages') return
    const allowed = new Set(stageFilterOptions)
    if (!allowed.has(stage)) setStage('All Stages')
  }, [stageFilterOptions, stage])

  const stageCounts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const s = String(row.currentStage || '').toLowerCase()
        if (s.includes('new')) acc.new += 1
        else if (s.includes('contact')) acc.contacted += 1
        else if (s.includes('qual')) acc.qualified += 1
        return acc
      },
      { new: 0, contacted: 0, qualified: 0 },
    )
  }, [rows])

  function exportVisibleRows() {
    if (!rows.length) {
      toast.error('No opportunities to export')
      return
    }
    const exportRows = rows.map((row) => ({
      Name: row.fullName || '',
      Company: row.companyName || '',
      JobTitle: row.jobTitle || '',
      Email: row.email || '',
      Phone: row.phoneNumber || '',
      Stage: row.currentStage || '',
      LeadScore: row.leadScore ?? 0,
      Owner: row.owner?.name || row.owner?.email || '',
      LastActivityType: row.lastActivityType || '',
      LastActivityAt: row.lastActivityAt ? new Date(row.lastActivityAt).toISOString() : '',
    }))
    const keys = Object.keys(exportRows[0])
    const csv = [keys.join(','), ...exportRows.map((r) => keys.map((k) => `"${String(r[k] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `opportunities-page-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported current opportunities')
  }

  async function handleSave(payload) {
    await createOpportunity(payload).unwrap()
    toast.success('Opportunity created')
    setOpenCreate(false)
  }

  async function handleSaveAddAnother(payload, reset) {
    await createOpportunity(payload).unwrap()
    toast.success('Opportunity created')
    reset()
  }

  return (
    <PageShell fullWidth>
      <div className="space-y-2 px-2 py-2 lg:px-3">
        <header className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-1.5">
            <div className="inline-flex rounded-md border border-surface-border bg-white p-0.5">
              <button type="button" onClick={() => setMode('list')} className={`h-7 rounded px-2.5 text-xs font-semibold ${mode === 'list' ? 'bg-brand-100 text-brand-700' : 'text-ink-muted'}`}>LIST</button>
              <button type="button" onClick={() => setMode('kanban')} className={`h-7 rounded px-2.5 text-xs font-semibold ${mode === 'kanban' ? 'bg-brand-100 text-brand-700' : 'text-ink-muted'}`}>KANBAN</button>
            </div>
            <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-surface-border bg-white px-2.5 text-xs font-semibold"><Filter className="h-3.5 w-3.5" />Filters</button>
            <button type="button" onClick={exportVisibleRows} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-surface-border bg-white px-2.5 text-xs font-semibold"><Download className="h-3.5 w-3.5" />Export</button>
            <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand-700 px-2.5 text-xs font-semibold text-white" onClick={() => setOpenCreate(true)}><Plus className="h-3.5 w-3.5" />New</button>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-surface-border px-3 py-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
              <input
                className="h-8 w-full rounded-md border border-surface-border pl-8 pr-2.5 text-xs"
                placeholder="Filter by name, company, or owner..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
              <span>Stage:</span>
              <select className="h-8 rounded-md border border-surface-border px-2 text-xs text-ink" value={stage} onChange={(e) => { setStage(e.target.value); setPage(1) }}>
                {stageFilterOptions.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div className="text-sm font-semibold text-ink">{total} Opportunities</div>
            <div className="ml-auto inline-flex items-center gap-1 text-xs text-ink-muted">
              <button type="button" className="rounded p-1 hover:bg-surface-subtle disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-[56px] text-center font-semibold text-ink">{page} of {totalPages}</span>
              <button type="button" className="rounded p-1 hover:bg-surface-subtle disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>

          {mode === 'kanban' ? (
            <div className="p-8 text-center text-sm text-ink-muted">Kanban view will be available in next iteration.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-surface-subtle/40 text-left text-[10px] uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Company & Role</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Stage</th>
                    <th className="px-3 py-2">Lead Score</th>
                    <th className="px-3 py-2">Owner</th>
                    <th className="px-3 py-2">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-6 text-sm text-ink-muted" colSpan={7}>Loading opportunities...</td>
                    </tr>
                  ) : rows.length ? (
                    rows.map((row) => (
                      <tr key={row.id} className="cursor-pointer border-t border-surface-border hover:bg-brand-50/40" onClick={() => navigate(`/opportunities/${row.id}`)}>
                        <td className="px-3 py-2">
                          <p className="text-sm font-semibold text-ink">{row.fullName}</p>
                          <p className="text-[11px] text-ink-muted">{row.location || '-'}</p>
                        </td>
                        <td className="px-3 py-2">
                          <p className="text-xs font-semibold text-ink">{row.jobTitle || '-'}</p>
                          <p className="text-[11px] text-ink-muted">{row.companyName || '-'}</p>
                        </td>
                        <td className="px-3 py-2">
                          <p className="text-xs text-ink">{row.email || '-'}</p>
                          <p className="text-[11px] text-ink-muted">{row.phoneNumber || '-'}</p>
                        </td>
                        <td className="px-3 py-2">
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{row.currentStage || 'New'}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-emerald-400 text-[10px] font-semibold text-ink">{row.leadScore ?? 0}</span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="inline-flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700">{initials(row.owner?.name || row.owner?.email || 'NA')}</span>
                            <span className="text-xs font-semibold text-ink">{row.owner?.name || 'Unassigned'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <p className="text-xs font-semibold text-ink">{row.lastActivityType || '-'}</p>
                          <p className="text-[11px] text-ink-muted">{row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleString() : '-'}</p>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-sm text-ink-muted" colSpan={7}>No opportunities found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-border px-3 py-2 text-xs text-ink-muted">
            <div className="flex items-center gap-5">
              <span>New: {stageCounts.new}</span>
              <span>Contacted: {stageCounts.contacted}</span>
              <span>Qualified: {stageCounts.qualified}</span>
            </div>
            <span>Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total} records</span>
          </div>
        </section>
      </div>

      <CreateOpportunityModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onSave={handleSave}
        onSaveAndAddAnother={handleSaveAddAnother}
        users={users}
        opportunityStages={opportunityStages}
        saving={saving}
      />
      <RightDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Opportunity Filters"
        description="Filter opportunities quickly"
        footer={
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="h-8 rounded-md border border-surface-border px-3 text-xs font-semibold text-ink-muted hover:bg-surface-subtle"
              onClick={() => {
                setStage('All Stages')
                setOwnerUserId('')
                setSearch('')
                setPage(1)
              }}
            >
              Reset
            </button>
            <button type="button" className="h-8 rounded-md bg-brand-700 px-3 text-xs font-semibold text-white" onClick={() => setFiltersOpen(false)}>
              Apply
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Search</label>
            <input
              className="h-8 w-full rounded-md border border-surface-border px-2 text-xs"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Name, company, owner"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Stage</label>
            <select className="h-8 w-full rounded-md border border-surface-border px-2 text-xs" value={stage} onChange={(e) => { setStage(e.target.value); setPage(1) }}>
              {stageFilterOptions.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Owner</label>
            <select className="h-8 w-full rounded-md border border-surface-border px-2 text-xs" value={ownerUserId} onChange={(e) => { setOwnerUserId(e.target.value); setPage(1) }}>
              <option value="">All owners</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email || 'User'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </RightDrawer>
    </PageShell>
  )
}

