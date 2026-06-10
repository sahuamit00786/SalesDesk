import { useMemo, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { Building2, MoreHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'
import { SkeletonCards } from '@/components/shared/SkeletonLoader'
import { usePatchDealStageMutation } from '@/features/deals/dealsApi'
import { formatStageLabel } from '@/features/opportunities/components/OpportunitiesKanban'
import { formatDealMoney, normalizeDealCurrency } from '@/features/deals/dealCurrencies'

const ACCENT_PALETTE = ['var(--brand-primary)', 'var(--brand-primary-dark)', '#7C3AED', '#6D28D9']

function initials(name) {
  return String(name || 'NA')
    .split(' ')
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function accentForId(id) {
  const n = Number(String(id).replace(/\D/g, '') || 0) || String(id).length
  return ACCENT_PALETTE[n % ACCENT_PALETTE.length]
}

function shortRelative(iso) {
  if (!iso) return '—'
  const t = Date.now() - new Date(iso).getTime()
  if (t < 0) return '0m'
  const m = Math.floor(t / 60000)
  if (m < 1) return '1m'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 14) return `${d}d`
  const w = Math.floor(d / 7)
  return `${Math.max(1, w)}w`
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

function DealCardBody({ opp, interactive = false, onOpen, onOpenClient, onEdit }) {
  const accent = accentForId(opp.id)
  const hasDealName = Boolean(String(opp.dealName || '').trim())
  const headline = (hasDealName ? opp.dealName : opp.companyName || opp.fullName || 'Deal').trim()
  const companyLine = (opp.companyName || '').trim() || '—'
  const clientName = (opp.fullName || '').trim() || '—'
  const rel = shortRelative(opp.updatedAt || opp.createdAt)

  const clientInner = (
    <>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-neutral-500">Client</p>
      <div className="mt-1 flex items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white shadow-inner"
          style={{ backgroundColor: accent }}
          aria-hidden
        >
          {initials(clientName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900">{clientName}</p>
          {opp.email ? (
            <p className="truncate text-[11px] text-neutral-500">{opp.email}</p>
          ) : opp.jobTitle ? (
            <p className="truncate text-[11px] text-neutral-500">{opp.jobTitle}</p>
          ) : null}
        </div>
      </div>
    </>
  )

  return (
    <>
      <div className="h-1 w-full" style={{ backgroundColor: accent }} />
      <div className="relative p-3 pt-2.5">
        {interactive ? (
          <button
            type="button"
            className="absolute right-2 top-2 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Edit deal"
            title="Edit deal"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.(opp)
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        ) : (
          <span className="absolute right-2 top-2 p-1 text-neutral-400">
            <MoreHorizontal className="h-4 w-4" />
          </span>
        )}
        {interactive ? (
          <button
            type="button"
            className="w-full text-left"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onOpen?.(opp.id)}
          >
            <p className="pr-7 text-sm font-bold leading-snug text-neutral-900">{headline}</p>
            {hasDealName ? (
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-neutral-600">
                <Building2 className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                <span className="truncate">{companyLine}</span>
              </p>
            ) : null}
          </button>
        ) : (
          <div className="text-left">
            <p className="pr-7 text-sm font-bold leading-snug text-neutral-900">{headline}</p>
            {hasDealName ? (
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-neutral-600">
                <Building2 className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                <span className="truncate">{companyLine}</span>
              </p>
            ) : null}
          </div>
        )}

        {interactive ? (
          <button
            type="button"
            className="mt-3 w-full cursor-pointer rounded-md border border-neutral-100 bg-neutral-50/80 px-2.5 py-2 text-left transition-colors hover:border-neutral-200 hover:bg-neutral-100/90"
            aria-label={
              opp.parentOpportunityLeadId
                ? `View opportunity — ${clientName}`
                : `View deal — ${clientName}`
            }
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onOpenClient?.(opp)
            }}
          >
            {clientInner}
          </button>
        ) : (
          <div className="mt-3 rounded-md border border-neutral-100 bg-neutral-50/80 px-2.5 py-2">{clientInner}</div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-base font-bold tabular-nums text-neutral-900">
            {formatDealMoney(opp.dealValue, opp.dealCurrency)}
          </span>
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-neutral-200 text-[9px] font-bold text-neutral-600 shadow-sm">
            {opp.owner?.name || opp.owner?.email ? (
              <span title={opp.owner?.name || opp.owner?.email}>{initials(opp.owner?.name || opp.owner?.email)}</span>
            ) : (
              '?'
            )}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 text-[10px] text-neutral-400">
          <span>Updated {rel}</span>
          <span className="max-w-[7rem] truncate font-medium text-neutral-500">
            {opp.owner?.name || opp.owner?.email || 'Unassigned'}
          </span>
        </div>
      </div>
    </>
  )
}

function DealCardOverlay({ opp }) {
  return (
    <div className="w-[268px] rotate-1 scale-[1.02] overflow-hidden rounded-lg border border-neutral-200/90 bg-white shadow-xl">
      <DealCardBody opp={opp} />
    </div>
  )
}

function DealKanbanCard({ opp, onOpen, onOpenClient, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opp.id,
    data: { opp },
  })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'cursor-grab touch-none overflow-hidden rounded-lg border border-neutral-200/90 bg-white shadow-sm transition-shadow active:cursor-grabbing',
        isDragging && 'opacity-50 ring-2 ring-brand-500/40',
      )}
    >
      <DealCardBody opp={opp} interactive onOpen={onOpen} onOpenClient={onOpenClient} onEdit={onEdit} />
    </div>
  )
}

function DealColumn({ stageName, displayLabel, opportunities, isWonColumn, onOpen, onOpenClient, onEdit }) {
  const droppableId = `stage:${stageName}`
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })
  const columnSum = opportunities.reduce((acc, o) => acc + Number(o.dealValue || 0), 0)
  const currencies = [...new Set(opportunities.map((o) => normalizeDealCurrency(o.dealCurrency)))]
  const sumLabel =
    opportunities.length === 0
      ? formatDealMoney(0, 'USD')
      : currencies.length === 1
        ? formatDealMoney(columnSum, currencies[0])
        : `${columnSum.toLocaleString(undefined, { maximumFractionDigits: 0 })} · mixed`

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full min-h-0 w-[280px] shrink-0 flex-col rounded-lg border border-neutral-200/60',
        isWonColumn ? 'bg-emerald-50/80' : 'bg-brand-50/60',
        isOver && 'ring-2 ring-brand-500/50 ring-offset-1',
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 rounded-t-lg border-b border-neutral-200/70 bg-white px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-900">{displayLabel}</p>
          <p className="mt-1 text-sm font-bold text-neutral-900">{sumLabel}</p>
          <p className="text-[11px] text-neutral-500">
            {opportunities.length} deal{opportunities.length === 1 ? '' : 's'}
          </p>
        </div>
        <button type="button" className="shrink-0 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600" aria-label="Column menu">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5 scrollbar-subtle">
        {opportunities.length === 0 ? (
          <p className="rounded-md border border-dashed border-neutral-300/80 bg-white/50 px-3 py-8 text-center text-[11px] text-neutral-400">No deals</p>
        ) : (
          opportunities.map((opp) => <DealKanbanCard key={opp.id} opp={opp} onOpen={onOpen} onOpenClient={onOpenClient} onEdit={onEdit} />)
        )}
      </div>
    </div>
  )
}

function DealOtherColumn({ displayLabel, opportunities, onOpen, onOpenClient, onEdit }) {
  return (
    <div className="flex h-full min-h-0 w-[280px] shrink-0 flex-col rounded-lg border border-amber-200 bg-amber-50/90">
      <div className="shrink-0 border-b border-amber-200 px-3 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-amber-900">{displayLabel}</p>
        <p className="text-[11px] text-amber-800/90">{opportunities.length} deal{opportunities.length === 1 ? '' : 's'}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5 scrollbar-subtle">
        {opportunities.map((opp) => (
          <DealKanbanCard key={opp.id} opp={opp} onOpen={onOpen} onOpenClient={onOpenClient} onEdit={onEdit} />
        ))}
      </div>
    </div>
  )
}

export function DealsPipelineKanban({
  opportunities = [],
  opportunityStages = [],
  isLoading,
  dealStageName = '',
  onOpenDeal,
  /**
   * Client block: navigate to parent opportunity when present. Override with `(dealRow) => void` for custom routing.
   * Default: `/opportunities/:parentOpportunityLeadId` if set, else `/deals/:id`.
   */
  onOpenDealPage,
  onEditOpportunity,
}) {
  const navigate = useNavigate()
  const [patchStage] = usePatchDealStageMutation()

  function openDeal(id) {
    if (onOpenDeal) onOpenDeal(id)
    else navigate(`/deals/${id}`)
  }

  function openClientFromDeal(opp) {
    if (onOpenDealPage) {
      onOpenDealPage(opp)
      return
    }
    const parentLeadId = opp?.parentOpportunityLeadId
    if (parentLeadId) navigate(`/opportunities/${parentLeadId}`)
    else navigate(`/deals/${opp.id}`)
  }
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

  const { byStage, other } = useMemo(() => groupByStage(opportunities, stageOrder), [opportunities, stageOrder])

  const activeOpp = useMemo(() => opportunities.find((o) => o.id === activeId), [opportunities, activeId])

  async function handleDragEnd(event) {
    const { active, over } = event
    setActiveId(null)
    if (!over?.id) return
    const dragged = opportunities.find((o) => o.id === active.id)
    if (!dragged) return
    const overId = String(over.id)
    if (!overId.startsWith('stage:')) return
    const nextStage = overId.slice('stage:'.length)
    if (!nextStage || nextStage === dragged.currentStage) return
    try {
      await patchStage({ id: dragged.id, currentStage: nextStage }).unwrap()
      toast.success(`Moved to ${formatStageLabel(nextStage)}`)
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.error || 'Could not update stage')
    }
  }

  if (isLoading && !opportunities.length) {
    return <SkeletonCards count={5} cols="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" cardHeight="h-44" />
  }

  if (!stageOrder.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-sm text-neutral-500">
        <p>No opportunity stages configured.</p>
        <p className="text-xs">Add stages under Lead configuration to use the deals board.</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragStart={({ active }) => setActiveId(active.id)} onDragEnd={handleDragEnd}>
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2 scrollbar-subtle">
        {stageOrder.map((name) => {
          const list = byStage[name] || []
          return (
            <DealColumn
              key={name}
              stageName={name}
              displayLabel={formatStageLabel(name)}
              opportunities={list}
              isWonColumn={Boolean(dealStageName && name === dealStageName)}
              onOpen={openDeal}
              onOpenClient={openClientFromDeal}
              onEdit={onEditOpportunity}
            />
          )
        })}
        {other.length > 0 ? (
          <DealOtherColumn
            displayLabel="Other stages"
            opportunities={other}
            onOpen={openDeal}
            onOpenClient={openClientFromDeal}
            onEdit={onEditOpportunity}
          />
        ) : null}
      </div>
      <DragOverlay>{activeOpp ? <DealCardOverlay opp={activeOpp} /> : null}</DragOverlay>
    </DndContext>
  )
}
