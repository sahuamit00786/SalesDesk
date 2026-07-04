import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

const actionBtn =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50'

/** Icon-only table action with native tooltip via `title`. */
export function SalesDocActionIcon({ as: Tag = 'button', title, className, children, ...props }) {
  return (
    <Tag title={title} aria-label={title} className={cn(actionBtn, className)} {...props}>
      {children}
    </Tag>
  )
}

const docLinkClass = 'font-medium text-brand-600 hover:underline'

export function SalesDocNumberLink({ to, children }) {
  return (
    <Link to={to} className={cn(docLinkClass, 'tabular-nums')}>
      {children}
    </Link>
  )
}

export function SalesDocClientCell({ row }) {
  const name = row.clientName || '—'
  if (!row.leadId) {
    return <span className="font-medium text-neutral-900">{name}</span>
  }
  return (
    <Link to={`/leads/${row.leadId}`} className={docLinkClass} title="View client">
      {name}
    </Link>
  )
}

export function SalesDocDealCell({ row, onDealClick }) {
  if (!row.dealId && !row.dealName) {
    return <span className="text-neutral-400">—</span>
  }

  return (
    <div className="min-w-[7rem]">
      {row.dealId && onDealClick ? (
        <button
          type="button"
          className="font-medium text-brand-600 hover:underline"
          onClick={() => onDealClick(row)}
        >
          {row.dealName || 'View deal'}
        </button>
      ) : row.dealId ? (
        <Link to={`/deals/${row.dealId}`} className="font-medium text-brand-600 hover:underline">
          {row.dealName || 'View deal'}
        </Link>
      ) : (
        <span className="font-medium text-neutral-800">{row.dealName}</span>
      )}
    </div>
  )
}

export function formatDocListDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

export function formatDocMoney(n, c = 'USD') {
  const v = Number(n ?? 0)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(v)
  } catch {
    return `${c} ${v.toFixed(2)}`
  }
}

export const QUOTATION_STATUS_META = {
  draft: { label: 'Draft', cls: 'bg-surface-subtle text-ink-muted' },
  sent: { label: 'Sent', cls: 'bg-sky-50 text-sky-800' },
  viewed: { label: 'Viewed', cls: 'bg-blue-50 text-blue-800' },
  accepted: { label: 'Accepted', cls: 'bg-emerald-50 text-emerald-800' },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700' },
  expired: { label: 'Expired', cls: 'bg-amber-50 text-amber-800' },
  converted: { label: 'Converted', cls: 'bg-emerald-100 text-emerald-900' },
}

export const INVOICE_STATUS_META = {
  draft: { label: 'Draft', cls: 'bg-surface-subtle text-ink-muted' },
  issued: { label: 'Issued', cls: 'bg-blue-50 text-blue-800' },
  partially_paid: { label: 'Partial', cls: 'bg-amber-50 text-amber-800' },
  paid: { label: 'Paid', cls: 'bg-emerald-50 text-emerald-800' },
  overdue: { label: 'Overdue', cls: 'bg-red-50 text-red-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-surface-subtle text-ink-faint line-through' },
  refunded: { label: 'Refunded', cls: 'bg-purple-50 text-purple-800' },
}

export function SalesDocStatusBadge({ status, variant = 'quotation' }) {
  const meta = (variant === 'invoice' ? INVOICE_STATUS_META : QUOTATION_STATUS_META)[status]
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', meta?.cls || 'bg-surface-subtle text-ink-muted')}>
      {meta?.label || status}
    </span>
  )
}
