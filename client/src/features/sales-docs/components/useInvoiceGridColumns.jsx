import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, Briefcase, Pencil, Printer, Trash2 } from 'lucide-react'
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

export function useInvoiceGridColumns({ setAssignInvoice, setPaymentInvoice, setPayAmount, setDeleteTarget, deleting, onDealClick }) {
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
        width: 100,
        renderCell: ({ row }) => (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              row.status === 'paid'
                ? 'bg-emerald-50 text-emerald-800'
                : row.status === 'draft'
                  ? 'bg-surface-subtle text-ink-muted'
                  : 'bg-amber-50 text-amber-900',
            )}
          >
            {row.status}
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
            {row.status !== 'paid' && row.status !== 'cancelled' ? (
              <SalesDocActionIcon
                type="button"
                title="Record payment"
                onClick={() => {
                  setPaymentInvoice(row)
                  setPayAmount(String(Number(row.grandTotal) - Number(row.amountPaid || 0) || ''))
                }}
              >
                <Banknote className="h-4 w-4" />
              </SalesDocActionIcon>
            ) : null}
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
    [setAssignInvoice, setPaymentInvoice, setPayAmount, setDeleteTarget, deleting, onDealClick],
  )
}
