import { Calendar, CheckSquare, Circle, FileText, Hash, Heading, List, Mail, Minus, Phone, Type, Upload, ChevronDown, AlignLeft, EyeOff } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'

const FIELD_TYPES = {
  basic: [
    { type: 'text', label: 'Text', icon: Type },
    { type: 'email', label: 'Email', icon: Mail },
    { type: 'phone', label: 'Phone', icon: Phone },
    { type: 'number', label: 'Number', icon: Hash },
    { type: 'textarea', label: 'Long text', icon: AlignLeft },
  ],
  choice: [
    { type: 'select', label: 'Dropdown', icon: ChevronDown },
    { type: 'multiselect', label: 'Multi-select', icon: List },
    { type: 'radio', label: 'Radio', icon: Circle },
    { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  ],
  layout: [
    { type: 'heading', label: 'Heading', icon: Heading },
    { type: 'paragraph', label: 'Paragraph', icon: FileText },
    { type: 'divider', label: 'Divider', icon: Minus },
  ],
  advanced: [
    { type: 'file', label: 'File upload', icon: Upload },
    { type: 'date', label: 'Date picker', icon: Calendar },
    { type: 'hidden', label: 'Hidden field', icon: EyeOff },
  ],
}

function DraggablePaletteItem({ item }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `palette:${item.type}`, data: { source: 'palette', type: item.type } })
  const Icon = item.icon
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  return (
    <button
      ref={setNodeRef}
      type="button"
      className="flex h-10 w-full items-center gap-2 rounded-xl border border-surface-border bg-white px-3 text-left text-sm text-ink hover:bg-surface-muted"
      style={{ ...style, opacity: isDragging ? 0.6 : 1 }}
      {...listeners}
      {...attributes}
    >
      <Icon className="h-4 w-4 text-ink-muted" />
      <span>{item.label}</span>
    </button>
  )
}

export function FieldPalette() {
  return (
    <div className="rounded-2xl border border-surface-border bg-white p-4">
      {Object.entries(FIELD_TYPES).map(([group, items]) => (
        <div key={group} className="mb-4 space-y-2 last:mb-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{group}</p>
          <div className="space-y-2">{items.map((item) => <DraggablePaletteItem key={item.type} item={item} />)}</div>
        </div>
      ))}
    </div>
  )
}
