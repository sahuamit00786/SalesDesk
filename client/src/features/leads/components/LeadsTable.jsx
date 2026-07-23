import { useMemo, useState } from 'react'
import { Pencil, Trash2, Info } from '@/components/ui/icons'
import { Link } from 'react-router-dom'
import { LeadScorePill } from '@/features/leads/components/LeadScorePill'
import { LeadSourceTag } from '@/features/leads/components/LeadSourceTag'
import { LeadEngagementPopover } from '@/features/leads/components/LeadEngagementPopover'
import { AssigneeCell } from '@/features/leads/components/AssigneeCell'
import { formatStageLabel } from '@/features/opportunities/components/OpportunitiesKanban'
import { STATUS_OPTIONS, STATUS_STYLES } from '@/features/leads/constants'
import { formatDealMoney } from '@/features/deals/dealCurrencies'
import { cn } from '@/utils/cn'

function formatLeadValue(lead) {
  return formatDealMoney(lead?.value, lead?.valueCurrency ?? lead?.value_currency)
}

function fromNow(dateValue) {
  if (!dateValue) return '-'
  const delta = Date.now() - new Date(dateValue).getTime()
  const hours = Math.floor(delta / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours} hrs ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

function EmailSentBadge({ sent }) {
  if (sent) {
    return (
      <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
        Sent
      </span>
    )
  }
  return <span className="text-[10px] text-ink-faint">—</span>
}

function ContactedCell({ lead, onHoverInfo }) {
  const contacted = Boolean(lead.contacted)
  return (
    <div className="flex items-center justify-center gap-1">
      <span
        className={cn(
          'inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
          contacted ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'text-ink-faint',
        )}
      >
        {contacted ? 'Yes' : 'No'}
      </span>
      <button
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-ink-muted hover:border-surface-border hover:bg-white hover:text-brand-700"
        aria-label="Engagement breakdown"
        onMouseEnter={(e) => onHoverInfo(lead, e)}
        onMouseLeave={() => onHoverInfo(null, null)}
        onFocus={(e) => onHoverInfo(lead, e)}
        onBlur={() => onHoverInfo(null, null)}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

const ENGAGEMENT_COLUMNS = [
  { key: 'emailSent', label: 'Email sent', sortable: false },
  { key: 'contacted', label: 'Contacted', sortable: false },
]

function LeadStatusSelect({ lead, onStatusChange }) {
  const status = lead.status || 'new'
  return (
    <select
      value={status}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onStatusChange?.(lead, e.target.value)}
      aria-label={`Status for ${lead.contactName || lead.title || 'lead'}`}
      className={cn(
        'w-full cursor-pointer rounded-md border px-1.5 py-1 text-[10px] font-semibold capitalize outline-none',
        STATUS_STYLES[status] || STATUS_STYLES.new,
      )}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}

function OpportunityStageSelect({ lead, pipelineStatuses, onStageChange }) {
  const currentId = lead.pipelineStatusInfo?.id || lead.pipelineStatus || ''
  return (
    <select
      value={currentId}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onStageChange?.(lead, e.target.value)}
      aria-label={`Pipeline status for ${lead.contactName || lead.title || 'opportunity'}`}
      className="w-full cursor-pointer rounded-md border border-surface-border bg-surface-subtle px-1.5 py-1 text-[10px] font-semibold text-ink outline-none"
    >
      {!currentId ? <option value="">Select status</option> : null}
      {pipelineStatuses.map((s) => (
        <option key={s.id} value={s.id}>{formatStageLabel(s.name)}</option>
      ))}
    </select>
  )
}

/** @param {{ variant?: 'leads' | 'opportunities' }} props */
export function LeadsTable({
  rows = [],
  selected = [],
  onToggleRow,
  onToggleAll,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
  sort,
  onSort,
  variant = 'leads',
  pipelineStatuses = [],
  onStatusChange,
  onStageChange,
}) {
  const isOpp = variant === 'opportunities'
  const [hoverLead, setHoverLead] = useState(null)
  const [hoverAnchor, setHoverAnchor] = useState(null)
  const selectedSet = useMemo(() => new Set(selected), [selected])

  const baseColumns = isOpp
    ? [
        { key: 'opportunity', label: 'Opportunity', sortable: true, sortField: 'title' },
        { key: 'pipelineStatus', label: 'Pipeline status', sortable: true, sortField: 'opportunityStage' },
        { key: 'score', label: 'Score', sortable: true, sortField: 'score' },
        { key: 'source', label: 'Source', sortable: true, sortField: 'source' },
        { key: 'value', label: 'Value', sortable: true, sortField: 'value' },
        { key: 'owner', label: 'Owner', sortable: true, sortField: 'assignedTo' },
        { key: 'last', label: 'Last Activity', sortable: true, sortField: 'updatedAt' },
      ]
    : [
        { key: 'lead', label: 'Lead', sortable: true, sortField: 'title' },
        { key: 'status', label: 'Status', sortable: true, sortField: 'status' },
        { key: 'score', label: 'Score', sortable: true, sortField: 'score' },
        { key: 'source', label: 'Source', sortable: true, sortField: 'source' },
        { key: 'value', label: 'Value', sortable: true, sortField: 'value' },
        { key: 'owner', label: 'Owner', sortable: true, sortField: 'assignedTo' },
        { key: 'last', label: 'Last Activity', sortable: true, sortField: 'updatedAt' },
      ]

  const columns = [...baseColumns, ...ENGAGEMENT_COLUMNS]
  const colCount = columns.length + 2
  const focusedId = hoverLead?.id

  const handleHoverInfo = (lead, event) => {
    if (!lead || !event) {
      setHoverLead(null)
      setHoverAnchor(null)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    setHoverLead(lead)
    setHoverAnchor({ x: rect.right, y: rect.bottom })
  }

  return (
    <>
      <div className="overflow-hidden rounded-none border-0 bg-white">
        <div className="overflow-x-auto">
          <table className="cx-table cx-data-grid min-w-[1100px] text-xs">
            <thead className="cx-table-sticky-head">
              <tr>
                <th className="w-12 align-middle">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && rows.every((r) => selectedSet.has(r.id))}
                    onChange={(e) => onToggleAll(e.target.checked)}
                  />
                </th>
                {columns.map((col) => (
                  <th key={col.key} className="align-middle">
                    {!col.sortable ? (
                      <span className="inline-flex items-center gap-1">{col.label}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSort(col.sortField)}
                        className="inline-flex items-center gap-1 text-left text-inherit hover:text-brand-100"
                      >
                        {col.label}{' '}
                        <span className="opacity-40">
                          {sort.field === col.sortField ? (sort.order === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    )}
                  </th>
                ))}
                <th className="cx-table-cell-actions text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="py-10 text-center align-middle">
                    <p className="text-sm font-medium text-ink">{isOpp ? 'No opportunities yet' : 'No leads yet'}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {isOpp
                        ? 'Convert a lead or add one from Opportunities to see it here.'
                        : 'Add your first lead to populate this table.'}
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((lead) => {
                  const isFocused = focusedId === lead.id
                  const isDimmed = focusedId && !isFocused
                  return (
                    <tr
                      key={lead.id}
                      className={cn(
                        'group transition-[filter,opacity,background]',
                        isDimmed && 'opacity-35 blur-[0.4px] pointer-events-none',
                        isFocused && 'relative z-[2] bg-brand-50/90 opacity-100 blur-0 shadow-sm',
                      )}
                    >
                      <td className="align-middle">
                        <input type="checkbox" checked={selectedSet.has(lead.id)} onChange={() => onToggleRow(lead.id)} />
                      </td>
                      {isOpp ? (
                        <>
                          <td>
                            <Link className="font-semibold text-ink hover:underline" to={`/opportunities/${lead.id}`}>
                              {lead.contactName || lead.title}
                            </Link>
                            <p className="mt-0.5 text-xs text-ink-muted">{lead.company || '-'}</p>
                          </td>
                          <td>
                            <OpportunityStageSelect
                              lead={lead}
                              pipelineStatuses={pipelineStatuses}
                              onStageChange={onStageChange}
                            />
                          </td>
                          <td>
                            <LeadScorePill score={lead.score || 0} />
                          </td>
                          <td>
                            <LeadSourceTag source={lead.source} />
                          </td>
                          <td className="font-semibold text-ink">{formatLeadValue(lead)}</td>
                          <td className="text-ink-muted">
                            <AssigneeCell lead={lead} />
                          </td>
                          <td className="text-ink-muted">{fromNow(lead.updatedAt)}</td>
                        </>
                      ) : (
                        <>
                          <td>
                            <Link className="font-semibold text-ink hover:underline" to={`/leads/${lead.id}`}>
                              {lead.contactName || lead.title}
                            </Link>
                            <p className="mt-0.5 text-xs text-ink-muted">{lead.company || '-'}</p>
                          </td>
                          <td>
                            <LeadStatusSelect lead={lead} onStatusChange={onStatusChange} />
                          </td>
                          <td>
                            <LeadScorePill score={lead.score || 0} />
                          </td>
                          <td>
                            <LeadSourceTag source={lead.source} />
                          </td>
                          <td className="font-semibold text-ink">{formatLeadValue(lead)}</td>
                          <td className="text-ink-muted">
                            <AssigneeCell lead={lead} />
                          </td>
                          <td className="text-ink-muted">{fromNow(lead.updatedAt)}</td>
                        </>
                      )}
                      <td className="text-center align-middle">
                        <EmailSentBadge sent={lead.emailSent} />
                      </td>
                      <td className="align-middle">
                        <ContactedCell lead={lead} onHoverInfo={handleHoverInfo} />
                      </td>
                      <td className="cx-table-cell-actions text-right">
                        <div className="inline-flex gap-1 opacity-100 transition">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => onEdit(lead)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700"
                              aria-label="Edit lead"
                              title="Edit lead"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => onDelete(lead)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger"
                              aria-label="Delete lead"
                              title="Delete lead"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LeadEngagementPopover
        open={Boolean(hoverLead && hoverAnchor)}
        anchor={hoverAnchor}
        lead={hoverLead}
        onClose={() => {
          setHoverLead(null)
          setHoverAnchor(null)
        }}
      />
    </>
  )
}
