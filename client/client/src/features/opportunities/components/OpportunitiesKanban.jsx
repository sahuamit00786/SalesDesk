import { useMemo, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { Building2, CalendarClock, GripVertical, Inbox, User } from '@/components/ui/icons'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'
import { usePatchPipelineStatusMutation } from '@/features/opportunities/opportunitiesApi'
import { formatDealMoney } from '@/features/deals/dealCurrencies'

export function formatStageLabel(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function initials(name) {
  return String(name || 'NA')
    .split(' ')
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const STAGE_ACCENTS = [
  { border: 'border-l-brand-500', dot: 'bg-brand-500' },
  { border: 'border-l-violet-500', dot: 'bg-violet-500' },
  { border: 'border-l-amber-500', dot: 'bg-amber-500' },
  { border: 'border-l-emerald-500', dot: 'bg-emerald-500' },
  { border: 'border-l-sky-500', dot: 'bg-sky-500' },
  { border: 'border-l-rose-500', dot: 'bg-rose-500' },
  { border: 'border-l-teal-500', dot: 'bg-teal-500' },
]

function stageAccent(stageIndex) {
  return STAGE_ACCENTS[stageIndex % STAGE_ACCENTS.length]
}

function priorityFromScore(score) {
  const n = Number(score || 0)
  if (n >= 80) return { label: 'High', className: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200' }
  if (n >= 50) return { label: 'Medium', className: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200' }
  return { label: 'Low', className: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200' }
}

function formatCloseDate(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function KanbanCardBody({ opp }) {
  const priority = priorityFromScore(opp.leadScore)
  const closeDate = formatCloseDate(opp.lastActivityAt)
  return (
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-semibold leading-tight text-ink">
          {(opp.dealName || '').trim() || opp.fullName || '—'}
        </p>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', priority.className)}>
          {priority.label}
        </span>
      </div>
      <p className="flex items-center gap-1.5 truncate text-xs text-ink-muted">
        <Building2 className="h-3.5 w-3.5 shrink-0 opacity-60" />
        {opp.companyName || '—'}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink">
          {formatDealMoney(opp.dealValue, opp.dealCurrency)}
        </span>
        {opp.currentStage ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-subtle px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {formatStageLabel(opp.currentStage)}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-semibold text-brand-800">
            {opp.owner ? initials(opp.owner?.name || opp.owner?.email) : <User className="h-2.5 w-2.5" />}
          </span>
          <span className="max-w-[7rem] truncate">{opp.owner?.name || opp.owner?.email || 'Unassigned'}</span>
        </span>
        {closeDate ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
            <CalendarClock className="h-3 w-3" />
            {closeDate}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function KanbanCardOverlayPreview({ opp, accent }) {
  return (
    <div
      className={cn(
        'w-[264px] rotate-1 scale-[1.03] rounded-xl border border-l-4 border-surface-border bg-white p-3 shadow-xl ring-2 ring-brand-400/40',
        accent.border,
      )}
    >
      <div className="flex gap-2">
        <div className="mt-0.5 shrink-0 text-ink-muted">
          <GripVertical className="h-4 w-4" />
        </div>
        <KanbanCardBody opp={opp} />
      </div>
    </div>
  )
}

function KanbanCard({ opp, accent, onOpen, onCreateDeal }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opp.id,
    data: { opp },
  })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-xl border border-l-4 border-surface-border bg-white p-3 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md',
        accent.border,
        isDragging && 'opacity-40 shadow-none',
      )}
    >
      <div className="flex gap-2">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none rounded text-ink-muted opacity-0 transition-opacity duration-200 hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
          {...listeners}
          {...attributes}
          aria-label="Drag to change stage"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(opp.id)}>
          <KanbanCardBody opp={opp} />
        </button>
      </div>
      <div className="mt-2 border-t border-surface-border/70 pt-2">
        <button
          type="button"
          className="inline-flex h-7 items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-800 shadow-sm transition-colors duration-200 hover:bg-emerald-100/90"
          onClick={(event) => {
            event.stopPropagation()
            onCreateDeal?.(opp)
          }}
        >
          Add to Deals
        </button>
      </div>
    </div>
  )
}

function ColumnEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-surface-border/80 bg-white/60 px-3 py-10 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-subtle text-ink-muted">
        <Inbox className="h-4 w-4" />
      </span>
      <p className="text-xs font-medium text-ink-muted">No opportunities in this stage.</p>
    </div>
  )
}

function KanbanColumn({ stageName, displayLabel, opportunities, accent, onOpen, onCreateDeal }) {
  const droppableId = `stage:${stageName}`
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full min-h-0 w-[280px] shrink-0 flex-col rounded-2xl border border-surface-border bg-surface-muted/50 shadow-sm transition-colors duration-200',
        isOver && 'border-brand-400 bg-brand-50/60 ring-2 ring-brand-400/30',
      )}
    >
      <div className="sticky top-0 z-10 flex shrink-0 items-center gap-2 rounded-t-2xl border-b border-surface-border bg-white/95 px-3 py-2.5 backdrop-blur">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', accent.dot)} />
        <p className="truncate text-xs font-semibold text-ink">{displayLabel}</p>
        <span className="ml-auto shrink-0 rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
          {opportunities.length}
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5 scrollbar-subtle">
        {opportunities.length === 0 ? (
          <ColumnEmptyState />
        ) : (
          opportunities.map((opp) => (
            <KanbanCard
              key={opp.id}
              opp={opp}
              accent={accent}
              onOpen={onOpen}
              onCreateDeal={onCreateDeal}
            />
          ))
        )}
      </div>
    </div>
  )
}

function KanbanOtherColumn({ displayLabel, opportunities, onOpen, onCreateDeal }) {
  const accent = { border: 'border-l-amber-500', dot: 'bg-amber-500' }
  return (
    <div className="flex h-full min-h-0 w-[280px] shrink-0 flex-col rounded-2xl border border-amber-200/80 bg-amber-50/30 shadow-sm">
      <div className="sticky top-0 z-10 flex shrink-0 items-center gap-2 rounded-t-2xl border-b border-amber-200/80 bg-amber-50/95 px-3 py-2.5 backdrop-blur">
        <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
        <p className="truncate text-xs font-semibold text-amber-900">{displayLabel}</p>
        <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
          {opportunities.length}
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5 scrollbar-subtle">
        <p className="mb-2 rounded-lg bg-amber-100/80 px-2 py-1.5 text-[10px] text-amber-900/90">
          Status doesn't match setup — drag into a column to fix.
        </p>
        {opportunities.map((opp) => (
          <KanbanCard
            key={opp.id}
            opp={opp}
            accent={accent}
            onOpen={onOpen}
            onCreateDeal={onCreateDeal}
          />
        ))}
      </div>
    </div>
  )
}

function groupByStage(opportunities, stageOrder) {
  const byStage = {}
  for (const name of stageOrder) {
    byStage[name] = []
  }
  const other = []
  for (const o of opportunities) {
    const s = o.currentStage
    if (s && Object.prototype.hasOwnProperty.call(byStage, s)) {
      byStage[s].push(o)
    } else {
      other.push(o)
    }
  }
  return { byStage, other }
}

export function OpportunitiesKanban({ opportunities = [], pipelineStatuses = [], isLoading, onCreateDeal }) {
  const navigate = useNavigate()
  const [patchPipelineStatus] = usePatchPipelineStatusMutation()
  const [activeId, setActiveId] = useState(null)
  // Optimistic local state: null means use the server-side `opportunities` prop
  const [localOpportunities, setLocalOpportunities] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  const stageOrder = useMemo(() => {
    const ordered = [...pipelineStatuses].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    return ordered.map((s) => s.name).filter(Boolean)
  }, [pipelineStatuses])

  // Use local optimistic state if present, else server data
  const effectiveOpportunities = localOpportunities ?? opportunities

  const merged = useMemo(() => groupByStage(effectiveOpportunities, stageOrder), [effectiveOpportunities, stageOrder])

  const activeOpp = useMemo(() => effectiveOpportunities.find((o) => o.id === activeId), [activeId, effectiveOpportunities])
  const activeAccent = useMemo(() => {
    if (!activeOpp) return stageAccent(0)
    const idx = stageOrder.indexOf(activeOpp.currentStage)
    return stageAccent(idx >= 0 ? idx : 0)
  }, [activeOpp, stageOrder])

  async function handleDragEnd(event) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    const overId = String(over.id)
    if (!overId.startsWith('stage:')) return
    const newStageName = overId.slice('stage:'.length)
    const oppId = String(active.id)
    const opp = effectiveOpportunities.find((o) => o.id === oppId)
    if (!opp || opp.currentStage === newStageName) return
    const status = pipelineStatuses.find((s) => s.name === newStageName)
    if (!status) return

    // Save original state for rollback
    const originalOpportunities = [...effectiveOpportunities]

    // 1. Optimistic update: move the card immediately
    setLocalOpportunities(
      originalOpportunities.map((o) =>
        o.id === oppId ? { ...o, currentStage: newStageName } : o,
      ),
    )

    try {
      await patchPipelineStatus({ id: oppId, pipelineStatusId: status.id }).unwrap()
      toast.success(`Moved to ${formatStageLabel(newStageName)}`)
      // Clear local override so server data takes over
      setLocalOpportunities(null)
    } catch (err) {
      // 3. Rollback on failure
      setLocalOpportunities(originalOpportunities)
      toast.error(err?.data?.error?.message || err?.error || 'Failed to move opportunity. Please try again.')
    }
  }

  function handleOpen(id) {
    navigate(`/opportunities/${id}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-ink-muted">Loading board…</p>
      </div>
    )
  }

  if (!stageOrder.length) {
    return (
      <div className="rounded-2xl border border-dashed border-surface-border bg-white px-6 py-14 text-center">
        <p className="text-sm font-medium text-ink">No pipeline statuses configured</p>
        <p className="mt-1 text-xs text-ink-muted">Add statuses under Lead configuration → Pipeline status.</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full min-h-0 items-stretch gap-3 overflow-x-auto pb-3 pt-1">
        {stageOrder.map((name, idx) => (
          <KanbanColumn
            key={name}
            stageName={name}
            displayLabel={formatStageLabel(name)}
            opportunities={merged.byStage[name] || []}
            accent={stageAccent(idx)}
            onOpen={handleOpen}
            onCreateDeal={onCreateDeal}
          />
        ))}
        {merged.other.length > 0 ? (
          <KanbanOtherColumn
            displayLabel="Other / unmapped status"
            opportunities={merged.other}
            onOpen={handleOpen}
            onCreateDeal={onCreateDeal}
          />
        ) : null}
      </div>
      <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeOpp ? <KanbanCardOverlayPreview opp={activeOpp} accent={activeAccent} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
