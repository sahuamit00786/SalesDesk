import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, LayoutList } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { Loader } from '@/components/shared/Loader'
import { cn } from '@/utils/cn'

function SortableTableRow({ row, columns, sortable, disabled, dragLabel }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: disabled || !sortable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'relative z-10 bg-white shadow-md ring-1 ring-brand-200')}
    >
      {sortable ? (
        <td className="w-12 whitespace-nowrap">
          <button
            type="button"
            className={cn(
              'inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-lg border border-transparent text-ink-faint',
              'hover:border-surface-border hover:bg-surface-muted active:cursor-grabbing',
              (disabled || !sortable) && 'cursor-not-allowed opacity-40',
            )}
            aria-label={dragLabel || 'Drag to reorder'}
            disabled={disabled || !sortable}
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
      ) : null}
      {columns.map((col) => (
        <td
          key={col.id}
          className={col.className}
          style={col.width ? { width: col.width, minWidth: col.width } : undefined}
        >
          {col.cell(row)}
        </td>
      ))}
    </tr>
  )
}

function StaticTableRow({ row, columns, sortable }) {
  return (
    <tr>
      {sortable ? <td className="w-12" /> : null}
      {columns.map((col) => (
        <td
          key={col.id}
          className={col.className}
          style={col.width ? { width: col.width, minWidth: col.width } : undefined}
        >
          {col.cell(row)}
        </td>
      ))}
    </tr>
  )
}

/**
 * @param {object} props
 * @param {Array} props.rows
 * @param {Array<{ id: string, header: string, width?: number, className?: string, headerClassName?: string, cell: (row) => React.ReactNode }>} props.columns
 * @param {boolean} [props.sortable]
 * @param {(ids: string[]) => void} [props.onReorder]
 */
export function ReorderableSetupTable({
  rows = [],
  columns = [],
  loading = false,
  disabled = false,
  sortable = false,
  onReorder,
  emptyTitle = 'No items found',
  emptyDescription = '',
  emptyIcon = LayoutList,
  className,
  getDragLabel,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event) {
    if (!sortable || !onReorder) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = rows.findIndex((r) => r.id === active.id)
    const newIndex = rows.findIndex((r) => r.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(rows, oldIndex, newIndex)
    onReorder(next.map((r) => r.id))
  }

  if (loading) {
    return (
      <div
        className={cn(
          'flex min-h-[280px] items-center justify-center rounded-2xl border border-surface-border bg-white',
          className,
        )}
      >
        <Loader label="Loading…" />
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div
        className={cn(
          'flex min-h-[280px] items-center justify-center rounded-2xl border border-surface-border bg-white p-8',
          className,
        )}
      >
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      </div>
    )
  }

  const tableBody = (
    <tbody>
      {sortable ? (
        <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          {rows.map((row) => (
            <SortableTableRow
              key={row.id}
              row={row}
              columns={columns}
              sortable={sortable}
              disabled={disabled}
              dragLabel={getDragLabel?.(row)}
            />
          ))}
        </SortableContext>
      ) : (
        rows.map((row) => <StaticTableRow key={row.id} row={row} columns={columns} sortable={sortable} />)
      )}
    </tbody>
  )

  const table = (
    <table className="cx-table cx-data-grid cx-table--dense min-w-[720px]" role="grid">
      <thead className="cx-table-sticky-head">
        <tr role="row">
          {sortable ? (
            <th scope="col" className="w-12 whitespace-nowrap" aria-label="Reorder" />
          ) : null}
          {columns.map((col) => (
            <th
              key={col.id}
              scope="col"
              className={cn('whitespace-nowrap', col.headerClassName)}
              style={col.width ? { width: col.width, minWidth: col.width } : undefined}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      {tableBody}
    </table>
  )

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm',
        className,
      )}
    >
      <div className="max-h-[min(65vh,640px)] overflow-auto scrollbar-subtle">
        {sortable ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {table}
          </DndContext>
        ) : (
          table
        )}
      </div>
    </div>
  )
}
