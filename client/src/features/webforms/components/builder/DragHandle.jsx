import { GripVertical } from 'lucide-react'

export function DragHandle(props) {
  return (
    <button
      type="button"
      className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-lg border border-surface-border text-ink-faint hover:bg-surface-muted"
      {...props}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  )
}
