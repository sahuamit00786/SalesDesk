import { arrayMove } from '@dnd-kit/sortable'

export function reorderFields(fields, activeId, overId) {
  const oldIndex = fields.findIndex((x) => x.id === activeId)
  const newIndex = fields.findIndex((x) => x.id === overId)
  if (oldIndex < 0 || newIndex < 0) return fields
  return arrayMove(fields, oldIndex, newIndex).map((field, idx) => ({ ...field, order: idx }))
}
