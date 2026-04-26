import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FieldBlock } from './FieldBlock'

function SortableField({ field, selected, onSelect, onDelete, onDuplicate }) {
  const { setNodeRef, transform, transition, listeners, attributes } = useSortable({ id: field.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <FieldBlock
        field={field}
        selected={selected}
        onSelect={onSelect}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        dragListeners={listeners}
        dragAttributes={attributes}
      />
    </div>
  )
}

export function FormCanvas({ fields, selectedFieldId, onSelectField, onDeleteField, onDuplicateField }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'form-canvas' })
  return (
    <div ref={setNodeRef} className={`min-h-[420px] rounded-2xl border p-4 ${isOver ? 'border-brand-500 bg-brand-50/50' : 'border-surface-border bg-surface-muted/30'}`}>
      {!fields.length ? (
        <div className="rounded-2xl border border-dashed border-surface-border bg-white p-12 text-center text-sm text-ink-muted">
          Drag fields here to build your form
        </div>
      ) : (
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {fields.map((field) => (
              <SortableField
                key={field.id}
                field={field}
                selected={selectedFieldId === field.id}
                onSelect={() => onSelectField(field.id)}
                onDelete={() => onDeleteField(field.id)}
                onDuplicate={() => onDuplicateField(field.id)}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  )
}
