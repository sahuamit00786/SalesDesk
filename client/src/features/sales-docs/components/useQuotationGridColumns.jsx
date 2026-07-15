import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FileInput, Pencil, Printer, Trash2 } from '@/components/ui/icons'
import {
  SalesDocActionIcon,
  SalesDocClientCell,
  SalesDocDealCell,
  SalesDocNumberLink,
  SalesDocStatusBadge,
  formatDocListDate,
  formatDocMoney as fmtMoney,
} from '@/features/sales-docs/components/SalesDocListCells'

export function useQuotationGridColumns({
  setDeleteTarget,
  deleting,
  converting,
  onConvert,
  onDealClick,
}) {
  return useMemo(
    () => [
      {
        field: 'quotationNumber',
        headerName: 'Number',
        flex: 1,
        minWidth: 120,
        renderCell: ({ row }) => (
          <SalesDocNumberLink to={`/quotations/new?quotationId=${encodeURIComponent(row.id)}`}>
            {row.quotationNumber}
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
        renderCell: ({ row }) => <SalesDocStatusBadge status={row.status} variant="quotation" />,
      },
      {
        field: 'grandTotal',
        headerName: 'Total',
        width: 110,
        valueGetter: (_v, row) => fmtMoney(row.grandTotal, row.currency),
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
        width: 220,
        sortable: false,
        filterable: false,
        hideable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }) => (
          <div className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
            <SalesDocActionIcon
              as={Link}
              to={`/quotations/new?quotationId=${encodeURIComponent(row.id)}`}
              title="Edit quotation"
              className="border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            >
              <Pencil className="h-4 w-4" />
            </SalesDocActionIcon>
            <SalesDocActionIcon
              as={Link}
              to={`/quotations/${row.id}/print`}
              title="Print / PDF"
              className="border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            >
              <Printer className="h-4 w-4" />
            </SalesDocActionIcon>
            {row.status !== 'converted' && row.status !== 'rejected' ? (
              <SalesDocActionIcon
                type="button"
                disabled={converting}
                title="Convert to invoice"
                className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                onClick={() => onConvert(row)}
              >
                <FileInput className="h-4 w-4" />
              </SalesDocActionIcon>
            ) : null}
            <SalesDocActionIcon
              type="button"
              disabled={deleting}
              title="Delete quotation"
              className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              onClick={() => setDeleteTarget(row)}
            >
              <Trash2 className="h-4 w-4" />
            </SalesDocActionIcon>
          </div>
        ),
      },
    ],
    [setDeleteTarget, deleting, converting, onConvert, onDealClick],
  )
}
