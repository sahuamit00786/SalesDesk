import { LayoutList, Pencil, Trash2 } from '@/components/ui/icons'
import { ReorderableSetupTable } from '@/components/shared/ReorderableSetupTable'
import { formatCustomFieldTypeLabel } from '@/features/leads/customFieldTypes'
import { cn } from '@/utils/cn'

function YesNoPill({ yes }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold',
        yes
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-surface-border bg-surface-subtle text-ink-muted',
      )}
    >
      {yes ? 'Yes' : 'No'}
    </span>
  )
}

export function CustomFieldsSetupTable({ rows, loading, disabled, onEdit, onDelete, onReorder, className }) {
  return (
    <ReorderableSetupTable
      rows={rows}
      loading={loading}
      disabled={disabled}
      sortable
      onReorder={onReorder}
      emptyTitle="No custom fields yet"
      emptyDescription="Add fields to capture extra lead and opportunity data."
      emptyIcon={LayoutList}
      className={className}
      getDragLabel={(row) => `Drag to reorder ${row.label}`}
      columns={[
        {
          id: 'label',
          header: 'Label',
          cell: (row) => <span className="font-medium text-ink">{row.label}</span>,
        },
        {
          id: 'key',
          header: 'Key',
          width: 140,
          cell: (row) => <span className="font-mono text-xs text-ink-muted">{row.key}</span>,
        },
        {
          id: 'type',
          header: 'Type',
          width: 120,
          cell: (row) => <span className="text-xs text-ink-muted">{formatCustomFieldTypeLabel(row.type)}</span>,
        },
        {
          id: 'isRequired',
          header: 'Required',
          width: 88,
          cell: (row) => <YesNoPill yes={!!row.isRequired} />,
        },
        {
          id: 'options',
          header: 'Options',
          cell: (row) => (
            <span className="truncate text-xs text-ink-muted">
              {Array.isArray(row.options) && row.options.length ? row.options.join(', ') : '—'}
            </span>
          ),
        },
        {
          id: 'actions',
          header: 'Actions',
          width: 92,
          headerClassName: 'text-right',
          className: 'text-right',
          cell: (row) => (
            <div className="inline-flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onEdit(row)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                aria-label="Edit"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(row)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger hover:bg-red-100"
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ),
        },
      ]}
    />
  )
}
