import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useGetLeadsQuery } from '@/features/leads/leadsApi'
import { useTeamUsersQuery } from '@/features/team/teamApi'

export function TasksFilterModal({ open, onClose, filters, onApply }) {
  const [draft, setDraft] = useState(filters)
  const [leadSearch, setLeadSearch] = useState('')

  useEffect(() => {
    if (open) {
      setDraft(filters)
      setLeadSearch(filters.leadLabel || '')
    }
  }, [open, filters])

  const { data: teamData } = useTeamUsersQuery(undefined, { skip: !open })
  const teamUsers = useMemo(() => {
    const items = Array.isArray(teamData?.data?.items) ? teamData.data.items : []
    return items
  }, [teamData])

  const { data: leadsData } = useGetLeadsQuery(
    { search: leadSearch.trim(), limit: 20, page: 1 },
    { skip: !open || leadSearch.trim().length < 1 },
  )
  const leadOptions = useMemo(() => {
    const rows = Array.isArray(leadsData?.data)
      ? leadsData.data
      : Array.isArray(leadsData?.data?.rows)
        ? leadsData.data.rows
        : []
    return rows.map((l) => ({ id: l.id, label: l.title || l.contactName || l.email || l.id }))
  }, [leadsData])

  function set(key, val) {
    setDraft((d) => ({ ...d, [key]: val }))
  }

  function handleSelectLead(lead) {
    setDraft((d) => ({ ...d, leadId: lead.id, leadLabel: lead.label }))
    setLeadSearch(lead.label)
  }

  function handleClearLead() {
    setDraft((d) => ({ ...d, leadId: '', leadLabel: '' }))
    setLeadSearch('')
  }

  const activeCount = [draft.leadId, draft.assigneeId, draft.dueFrom, draft.dueTo].filter(Boolean).length

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filter Tasks"
      maxWidthClassName="max-w-md"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              const cleared = { leadId: '', leadLabel: '', assigneeId: '', dueFrom: '', dueTo: '' }
              setDraft(cleared)
              setLeadSearch('')
            }}
            className="text-sm text-ink-faint hover:text-ink underline underline-offset-2"
          >
            Clear all
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-subtle"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { onApply(draft); onClose() }}
              className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Apply{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">

        {/* Lead */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Lead</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <Input
              className="pl-9 pr-9"
              placeholder="Search lead name…"
              value={leadSearch}
              onChange={(e) => {
                setLeadSearch(e.target.value)
                if (!e.target.value) handleClearLead()
              }}
            />
            {draft.leadId ? (
              <button
                type="button"
                onClick={handleClearLead}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {draft.leadId ? (
            <p className="mt-1.5 text-xs text-brand-600">
              Selected: <span className="font-medium">{draft.leadLabel}</span>
            </p>
          ) : leadSearch.length >= 1 && leadOptions.length > 0 ? (
            <ul className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-surface-border bg-white shadow-md">
              {leadOptions.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectLead(l)}
                    className="w-full px-3.5 py-2.5 text-left text-sm text-ink hover:bg-brand-50"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : leadSearch.length >= 1 && leadOptions.length === 0 ? (
            <p className="mt-1.5 text-xs text-ink-faint">No leads found.</p>
          ) : null}
        </div>

        {/* Assigned to */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Assigned to</label>
          <Select
            value={draft.assigneeId || ''}
            onChange={(e) => set('assigneeId', e.target.value)}
          >
            <option value="">Anyone</option>
            {teamUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.name || u.email}</option>
            ))}
          </Select>
        </div>

        {/* Due date range */}
        <div className="pb-4">
          <label className="mb-1.5 block text-sm font-medium text-ink">Due date range</label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="mb-1 text-xs text-ink-faint">From</p>
              <Input
                type="date"
                value={draft.dueFrom || ''}
                onChange={(e) => set('dueFrom', e.target.value)}
              />
            </div>
            <span className="mt-5 text-ink-faint">—</span>
            <div className="flex-1">
              <p className="mb-1 text-xs text-ink-faint">To</p>
              <Input
                type="date"
                value={draft.dueTo || ''}
                onChange={(e) => set('dueTo', e.target.value)}
              />
            </div>
          </div>
        </div>

      </div>
    </Modal>
  )
}
