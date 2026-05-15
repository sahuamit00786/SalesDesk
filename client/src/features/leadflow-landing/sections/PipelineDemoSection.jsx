import { useMemo, useState } from 'react'
import {
  closestCorners,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { Section } from '@/features/leadflow-landing/components/Section'
import { GlassPanel } from '@/features/leadflow-landing/components/GlassPanel'
import { cn } from '@/utils/cn'

const COLS = [
  { id: 'col-new', label: 'New', tint: 'border-sky-200/90 bg-gradient-to-b from-sky-100/80 to-white' },
  { id: 'col-qualified', label: 'Qualified', tint: 'border-violet-200/90 bg-gradient-to-b from-violet-100/80 to-white' },
  { id: 'col-proposal', label: 'Proposal', tint: 'border-fuchsia-200/90 bg-gradient-to-b from-fuchsia-100/80 to-white' },
]

function DroppableCol({ id, label, tint, children }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[220px] flex-col gap-2 rounded-xl border-2 p-2 transition',
        tint,
        isOver ? 'ring-2 ring-fuchsia-400 ring-offset-2 ring-offset-white shadow-lg shadow-violet-300/30' : '',
      )}
    >
      <p className="px-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{label}</p>
      {children}
    </div>
  )
}

function LeadCard({ id, title, value }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.85 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div className="cursor-grab rounded-lg border border-white/90 bg-gradient-to-br from-white to-violet-50/50 p-2.5 shadow-md ring-1 ring-violet-100 active:cursor-grabbing">
        <p className="text-xs font-semibold text-lf-ink">{title}</p>
        <p className="text-[10px] font-semibold text-violet-600">{value}</p>
      </div>
    </div>
  )
}

export function PipelineDemoSection() {
  const [items, setItems] = useState(() => [
    { id: 'l1', col: 'col-new', title: 'Finstack', value: '$24k' },
    { id: 'l2', col: 'col-new', title: 'Brightline', value: '$11k' },
    { id: 'l3', col: 'col-qualified', title: 'Orbital', value: '$58k' },
    { id: 'l4', col: 'col-proposal', title: 'Crest', value: '$102k' },
  ])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const total = useMemo(
    () =>
      items.reduce((acc, it) => acc + Number(String(it.value).replace(/[^0-9.]/g, '') || 0), 0),
    [items],
  )

  function onDragEnd(ev) {
    const overId = ev.over?.id
    const activeId = ev.active?.id
    if (!overId || !activeId) return
    if (!String(overId).startsWith('col-')) return
    setItems((prev) => prev.map((it) => (it.id === activeId ? { ...it, col: overId } : it)))
  }

  return (
    <Section id="pipeline" className="bg-gradient-to-b from-indigo-50/40 via-white to-fuchsia-50/30">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Pipeline</p>
            <h2 className="mt-2 bg-gradient-to-r from-indigo-800 via-violet-800 to-fuchsia-800 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
              Drag reality into your forecast.
            </h2>
            <p className="mt-3 text-sm text-lf-muted sm:text-base">
              Try moving a deal between stages — motion, totals, and ownership stay in sync.
            </p>
          </div>
          <GlassPanel className="flex items-center gap-6 px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase text-lf-muted">Pipeline value</p>
              <motion.p
                key={total}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-violet-700 to-fuchsia-600 bg-clip-text text-2xl font-bold text-transparent"
              >
                ${total}k
              </motion.p>
            </div>
            <div className="h-10 w-px bg-gradient-to-b from-transparent via-violet-300 to-transparent" />
            <div>
              <p className="text-[10px] font-semibold uppercase text-lf-muted">Win trend</p>
              <p className="text-sm font-bold text-emerald-600">+18% vs last quarter</p>
            </div>
          </GlassPanel>
        </div>

        <GlassPanel className="mt-10 p-4 sm:p-6">
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
            <div className="grid gap-3 sm:grid-cols-3">
              {COLS.map((c) => (
                <DroppableCol key={c.id} id={c.id} label={c.label} tint={c.tint}>
                  {items
                    .filter((it) => it.col === c.id)
                    .map((it) => (
                      <LeadCard key={it.id} id={it.id} title={it.title} value={it.value} />
                    ))}
                </DroppableCol>
              ))}
            </div>
          </DndContext>
        </GlassPanel>
      </div>
    </Section>
  )
}
