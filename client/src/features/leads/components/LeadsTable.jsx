import { Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LeadScorePill } from '@/features/leads/components/LeadScorePill'
import { LeadSourceTag } from '@/features/leads/components/LeadSourceTag'
import { LeadStatusBadge } from '@/features/leads/components/LeadStatusBadge'

function formatINR(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0))
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

export function LeadsTable({ rows = [], selected = [], onToggleRow, onToggleAll, onEdit, onDelete, sort, onSort }) {
  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-xs">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-surface-border/70">
              <th className="w-10 px-2.5 py-2 text-left"><input type="checkbox" checked={rows.length > 0 && selected.length === rows.length} onChange={(e) => onToggleAll(e.target.checked)} /></th>
              {['Lead', 'Status', 'Score', 'Source', 'Value', 'Owner', 'Last Activity'].map((label) => (
                <th key={label} className="px-2.5 py-2 text-left text-[11px] font-semibold text-ink-muted">
                  <button type="button" onClick={() => onSort(label.toLowerCase())} className="inline-flex items-center gap-1">{label} <span className="opacity-40">{sort.field === label.toLowerCase() ? (sort.order === 'asc' ? '↑' : '↓') : '↕'}</span></button>
                </th>
              ))}
              <th className="px-2.5 py-2 text-right text-[11px] font-semibold text-ink-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-ink">No leads yet</p>
                  <p className="mt-1 text-xs text-ink-muted">Add your first lead to populate this table.</p>
                </td>
              </tr>
            ) : (
              rows.map((lead) => (
                <tr key={lead.id} className="group border-b border-surface-border last:border-b-0 hover:bg-brand-50">
                  <td className="px-2.5 py-2"><input type="checkbox" checked={selected.includes(lead.id)} onChange={() => onToggleRow(lead.id)} /></td>
                  <td className="px-2.5 py-2">
                    <Link className="font-semibold text-ink hover:underline" to={`/leads/${lead.id}`}>{lead.contactName || lead.title}</Link>
                    <p className="text-xs text-ink-muted">{lead.company || '-'}</p>
                  </td>
                  <td className="px-2.5 py-2"><LeadStatusBadge status={lead.status} /></td>
                  <td className="px-2.5 py-2"><LeadScorePill score={lead.score || 0} /></td>
                  <td className="px-2.5 py-2"><LeadSourceTag source={lead.source} /></td>
                  <td className="px-2.5 py-2 font-semibold text-ink">{formatINR(lead.value)}</td>
                  <td className="px-2.5 py-2 text-ink-muted">{lead.assignee?.name || '-'}</td>
                  <td className="px-2.5 py-2 text-ink-muted">{fromNow(lead.updatedAt)}</td>
                  <td className="px-2.5 py-2 text-right">
                  <div className="inline-flex gap-1 opacity-100 transition">
                      <button type="button" onClick={() => onEdit(lead)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700" aria-label="Edit lead" title="Edit lead"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => onDelete(lead)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger" aria-label="Delete lead" title="Delete lead"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
