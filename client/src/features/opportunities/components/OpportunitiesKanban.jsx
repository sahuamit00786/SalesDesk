import { useMemo, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { Building2, GripVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'
import { usePatchOpportunityStageMutation } from '@/features/opportunities/opportunitiesApi'
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

function KanbanCardOverlayPreview({ opp }) {
  return (
    <div className="rotate-1 scale-[1.02] rounded-xl border border-surface-border bg-white p-3 shadow-lg ring-2 ring-brand-400/40">
      <div className="flex gap-2">
        <div className="mt-0.5 shrink-0 text-ink-muted">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-semibold text-ink">
            {(opp.dealName || '').trim() || opp.fullName || '—'}
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-ink-muted">
            <Building2 className="h-3 w-3 shrink-0 opacity-60" />
            {opp.companyName || '—'}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-brand-700">
              {formatDealMoney(opp.dealValue, opp.dealCurrency)}
            </span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
              Score {opp.leadScore ?? 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function KanbanCard({ opp, onOpen, canCreateDeal, onCreateDeal }) {
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
      className={cn('rounded-xl border border-surface-border bg-white p-3 shadow-sm transition-shadow', isDragging && 'opacity-40')}
    >
      <div className="flex gap-2">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none text-ink-muted hover:text-ink active:cursor-grabbing"
          {...listeners}
          {...attributes}
          aria-label="Drag to change stage"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 space-y-1 text-left"
          onClick={() => onOpen(opp.id)}
        >
          <p className="truncate text-sm font-semibold text-ink">
            {(opp.dealName || '').trim() || opp.fullName || '—'}
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-ink-muted">
            <Building2 className="h-3 w-3 shrink-0 opacity-60" />
            {opp.companyName || '—'}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-brand-700">
              {formatDealMoney(opp.dealValue, opp.dealCurrency)}
            </span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
              Score {opp.leadScore ?? 0}
            </span>
          </div>
          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-ink-muted">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[9px] font-semibold text-brand-800">
              {initials(opp.owner?.name || opp.owner?.email)}
            </span>
            <span className="truncate">{opp.owner?.name || opp.owner?.email || 'Unassigned'}</span>
          </div>
          {canCreateDeal ? (
            <div className="pt-1">
              <button
                type="button"
                className="inline-flex h-7 items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100/90"
                onClick={(event) => {
                  event.stopPropagation()
                  onCreateDeal?.(opp)
                }}
              >
                Add to Deals
              </button>
            </div>
          ) : null}
        </button>
      </div>
    </div>
  )
}

function KanbanColumn({ stageName, displayLabel, opportunities, onOpen, dealStageName, onCreateDeal }) {
  const droppableId = `stage:${stageName}`
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })
  /** Same mint column as Deals pipeline “Won” — stage flagged `isDealStatus` in workspace config. */
  const isDealStageColumn = Boolean(dealStageName) && stageName === dealStageName

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full min-h-0 w-[280px] shrink-0 flex-col rounded-2xl border',
        isDealStageColumn
          ? 'border-neutral-200/60 bg-[#f0fae0]'
          : 'border-surface-border bg-surface-muted/50',
        isOver &&
          (isDealStageColumn
            ? 'ring-2 ring-emerald-500/45 ring-offset-1'
            : 'border-brand-400 bg-brand-50/60 ring-2 ring-brand-400/30'),
      )}
    >
      <div
        className={cn(
          'shrink-0 border-b px-3 py-2.5',
          isDealStageColumn ? 'border-neutral-200/70 bg-white' : 'border-surface-border',
        )}
      >
        <p className="text-xs font-semibold text-ink">{displayLabel}</p>
        <p className="text-[11px] text-ink-muted">{opportunities.length} card{opportunities.length === 1 ? '' : 's'}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5 scrollbar-subtle">
        {opportunities.length === 0 ? (
          <p
            className={cn(
              'rounded-lg border border-dashed px-3 py-6 text-center text-[11px] text-ink-muted',
              isDealStageColumn
                ? 'border-neutral-300/80 bg-white/50'
                : 'border-surface-border bg-white/60',
            )}
          >
            Drop opportunities here
          </p>
        ) : (
          opportunities.map((opp) => (
            <KanbanCard
              key={opp.id}
              opp={opp}
              onOpen={onOpen}
              canCreateDeal={Boolean(dealStageName) && opp.currentStage === dealStageName}
              onCreateDeal={onCreateDeal}
            />
          ))
        )}
      </div>
    </div>
  )
}

function KanbanOtherColumn({ displayLabel, opportunities, onOpen, dealStageName, onCreateDeal }) {
  return (
    <div className="flex h-full min-h-0 w-[280px] shrink-0 flex-col rounded-2xl border border-amber-200/80 bg-amber-50/30">
      <div className="shrink-0 border-b border-amber-200/80 px-3 py-2.5">
        <p className="text-xs font-semibold text-amber-900">{displayLabel}</p>
        <p className="text-[11px] text-amber-800/80">{opportunities.length} card{opportunities.length === 1 ? '' : 's'}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5 scrollbar-subtle">
        <p className="mb-2 rounded-lg bg-amber-100/80 px-2 py-1.5 text-[10px] text-amber-900/90">
          Status doesn’t match setup — drag into a column to fix.
        </p>
        {opportunities.map((opp) => (
          <KanbanCard
            key={opp.id}
            opp={opp}
            onOpen={onOpen}
            canCreateDeal={Boolean(dealStageName) && opp.currentStage === dealStageName}
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

export function OpportunitiesKanban({ opportunities = [], opportunityStages = [], isLoading, dealStageName = '', onCreateDeal }) {
  const navigate = useNavigate()
  const [patchStage] = usePatchOpportunityStageMutation()
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  const stageOrder = useMemo(() => {
    const ordered = [...opportunityStages].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    return ordered.map((s) => s.name).filter(Boolean)
  }, [opportunityStages])

  const merged = useMemo(() => groupByStage(opportunities, stageOrder), [opportunities, stageOrder])

  const activeOpp = useMemo(() => opportunities.find((o) => o.id === activeId), [activeId, opportunities])

  async function handleDragEnd(event) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    const overId = String(over.id)
    if (!overId.startsWith('stage:')) return
    const newStage = overId.slice('stage:'.length)
    const oppId = String(active.id)
    const opp = opportunities.find((o) => o.id === oppId)
    if (!opp || opp.currentStage === newStage) return
    try {
      await patchStage({ id: oppId, currentStage: newStage }).unwrap()
      toast.success(`Moved to ${formatStageLabel(newStage)}`)
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.error || 'Could not update stage')
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
        <p className="text-sm font-medium text-ink">No opportunity stages configured</p>
        <p className="mt-1 text-xs text-ink-muted">Add stages under Lead configuration → Opportunity stages.</p>
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
        {stageOrder.map((name) => (
          <KanbanColumn
            key={name}
            stageName={name}
            displayLabel={formatStageLabel(name)}
            opportunities={merged.byStage[name] || []}
            onOpen={handleOpen}
            dealStageName={dealStageName}
            onCreateDeal={onCreateDeal}
          />
        ))}
        {merged.other.length > 0 ? (
          <KanbanOtherColumn
            displayLabel="Other / unmapped stage"
            opportunities={merged.other}
            onOpen={handleOpen}
            dealStageName={dealStageName}
            onCreateDeal={onCreateDeal}
          />
        ) : null}
      </div>
      <DragOverlay dropAnimation={null}>{activeOpp ? <KanbanCardOverlayPreview opp={activeOpp} /> : null}</DragOverlay>
    </DndContext>
  )
}
