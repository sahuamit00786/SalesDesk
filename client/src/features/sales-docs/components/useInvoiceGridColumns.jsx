import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Pencil, Printer, Receipt, Trash2 } from 'lucide-react'
import {
  SalesDocActionIcon,
  SalesDocClientCell,
  SalesDocDealCell,
  SalesDocNumberLink,
  formatDocListDate,
} from '@/features/sales-docs/components/SalesDocListCells'
import { cn } from '@/utils/cn'

function fmtMoney(n, c = 'USD') {
  const v = Number(n ?? 0)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(v)
  } catch {
    return `${c} ${v.toFixed(2)}`
  }
}

const STATUS_STYLES = {
  paid: 'bg-emerald-50 text-emerald-800',
  draft: 'bg-surface-subtle text-ink-muted',
  issued: 'bg-blue-50 text-blue-800',
  partially_paid: 'bg-amber-50 text-amber-800',
  overdue: 'bg-red-50 text-red-700',
  cancelled: 'bg-surface-subtle text-ink-faint line-through',
  refunded: 'bg-purple-50 text-purple-800',
}

const STATUS_LABELS = {
  paid: 'Paid',
  draft: 'Draft',
  issued: 'Issued',
  partially_paid: 'Partial',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

export function useInvoiceGridColumns({ setAssignInvoice, onPaymentClick, setDeleteTarget, deleting, onDealClick }) {
  return useMemo(
    () => [
      {
        field: 'invoiceNumber',
        headerName: 'Number',
        flex: 1,
        minWidth: 120,
        renderCell: ({ row }) => (
          <SalesDocNumberLink to={`/invoices/new?invoiceId=${encodeURIComponent(row.id)}`}>
            {row.invoiceNumber}
          </SalesDocNumberLink>
        ),
      },
      {
        field: 'client',
        headerName: 'Client',
        flex: 1,
        minWidth: 140,
        sortable: false,
        renderCell: ({ row }) => <SalesDocClientCell row={row} />,
      },
      {
        field: 'deal',
        headerName: 'Deal',
        flex: 1,
        minWidth: 120,
        sortable: false,
        renderCell: ({ row }) => <SalesDocDealCell row={row} onDealClick={onDealClick} />,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 110,
        renderCell: ({ row }) => (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              STATUS_STYLES[row.status] || 'bg-surface-subtle text-ink-muted',
            )}
          >
            {STATUS_LABELS[row.status] || row.status}
          </span>
        ),
      },
      {
        field: 'grandTotal',
        headerName: 'Total',
        width: 110,
        valueGetter: (_v, row) => fmtMoney(row.grandTotal, row.currency),
      },
      {
        field: 'amountPaid',
        headerName: 'Paid',
        width: 110,
        valueGetter: (_v, row) => fmtMoney(row.amountPaid, row.currency),
      },
      {
        field: 'balanceDue',
        headerName: 'Balance Due',
        width: 120,
        sortable: false,
        renderCell: ({ row }) => {
          const due = Number(row.grandTotal ?? 0) - Number(row.amountPaid ?? 0)
          if (due <= 0) return <span className="text-xs text-ink-faint">—</span>
          return (
            <span
              className={cn(
                'tabular-nums text-sm font-medium',
                row.status === 'overdue' ? 'text-red-600' : 'text-amber-700',
              )}
            >
              {fmtMoney(due, row.currency)}
            </span>
          )
        },
      },
      {
        field: 'issueDate',
        headerName: 'Issue date',
        width: 110,
        valueGetter: (_v, row) => formatDocListDate(row.issueDate),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 200,
        sortable: false,
        filterable: false,
        hideable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }) => (
          <div className="inline-flex gap-1">
            <SalesDocActionIcon
              as={Link}
              to={`/invoices/new?invoiceId=${encodeURIComponent(row.id)}`}
              title="Edit invoice"
            >
              <Pencil className="h-4 w-4" />
            </SalesDocActionIcon>
            <SalesDocActionIcon as={Link} to={`/invoices/${row.id}/print`} title="Print / PDF">
              <Printer className="h-4 w-4" />
            </SalesDocActionIcon>
            <SalesDocActionIcon
              type="button"
              title={row.dealId ? 'Reassign deal' : 'Assign to deal'}
              onClick={() => setAssignInvoice(row)}
            >
              <Briefcase className="h-4 w-4" />
            </SalesDocActionIcon>
            <SalesDocActionIcon
              type="button"
              title="Payment history"
              onClick={() => onPaymentClick(row)}
            >
              <Receipt className="h-4 w-4" />
            </SalesDocActionIcon>
            <SalesDocActionIcon
              type="button"
              disabled={deleting}
              title="Delete invoice"
              className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              onClick={() => setDeleteTarget(row)}
            >
              <Trash2 className="h-4 w-4" />
            </SalesDocActionIcon>
          </div>
        ),
      },
    ],
    [setAssignInvoice, onPaymentClick, setDeleteTarget, deleting, onDealClick],
  )
}
