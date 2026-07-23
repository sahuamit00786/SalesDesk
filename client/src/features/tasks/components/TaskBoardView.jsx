import { useMemo, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { Building2, CalendarClock, ChevronsLeft, ChevronsRight, ListChecks, Paperclip, Pencil, StickyNote } from '@/components/ui/icons'
import { SkeletonCards } from '@/components/shared/SkeletonLoader'
import { cn } from '@/utils/cn'
import { PRIORITY_META, STATUS_META } from '../taskConstants'
import {
  buildTaskSections,
  computeTaskProgress,
  dueRemainingLabel,
  formatDueLabel,
  initialsFromName,
  isOpenTaskStatus,
  isTaskOverdueRow,
} from '../taskUtils'
import { PriorityFlag } from './PriorityFlag'

function sectionMeta(groupBy, id) {
  return (groupBy === 'priority' ? PRIORITY_META[id] : STATUS_META[id]) || {}
}

function TaskCardBody({ task, interactive = false, canUpdate = false, onOpenTask }) {
  const overdue = isTaskOverdueRow(task)
  const { pct, label } = computeTaskProgress(task)
  const subs = Array.isArray(task.subtasks) ? task.subtasks : []
  const subCount = subs.length
  const attCount = Array.isArray(task.attachments) ? task.attachments.length : 0
  const hasNote = Boolean(String(task.description || '').trim())
  const assigneeName = task.assignee?.name || task.assignee?.email || ''
  const leadName = task.lead?.title || task.lead?.contactName || ''
  const remaining = isOpenTaskStatus(task.status) ? dueRemainingLabel(task.dueAt) : ''

  return (
    <div className="p-3">
      <div className="flex items-start justify-between gap-2">
        {interactive ? (
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onOpenTask?.(task)}
          >
            <p className="text-xs font-semibold leading-snug text-gray-900 hover:text-[var(--brand-primary)]">{task.title}</p>
          </button>
        ) : (
          <p className="min-w-0 flex-1 text-xs font-semibold leading-snug text-gray-900">{task.title}</p>
        )}
        {interactive && canUpdate ? (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onOpenTask?.(task) }}
            className="shrink-0 rounded-md p-1 text-gray-300 transition hover:bg-gray-100 hover:text-[var(--brand-primary)]"
            aria-label="Edit task"
            title="Edit task"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {leadName ? (
        <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-gray-500">
          <Building2 className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
          <span className="truncate">{leadName}</span>
        </p>
      ) : null}
      {hasNote ? (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-gray-500">{task.description}</p>
      ) : null}
      {subCount > 0 ? (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <span className={cn('inline-flex items-center gap-1', pct === 100 && 'text-emerald-600')}>
              <ListChecks className="h-3 w-3" aria-hidden />
              Subtasks {label}
            </span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-emerald-500' : 'bg-[var(--brand-primary)]')}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : null}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {task.dueAt ? (
          <span
            className={cn(
              'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium',
              overdue ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200',
            )}
          >
            {formatDueLabel(task.dueAt)}
          </span>
        ) : null}
        {remaining ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
              overdue ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : remaining === 'Due today' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
            )}
          >
            <CalendarClock className="h-3 w-3" aria-hidden />
            {remaining}
          </span>
        ) : null}
        <PriorityFlag value={task.priority || 'medium'} className="text-[10px]" />
        {hasNote ? (
          <span className="inline-flex items-center text-[10px] text-gray-400" title="Has notes">
            <StickyNote className="h-3 w-3" aria-hidden />
          </span>
        ) : null}
        {attCount > 0 ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500" title={`${attCount} attachment${attCount === 1 ? '' : 's'}`}>
            <Paperclip className="h-3 w-3" aria-hidden />
            {attCount}
          </span>
        ) : null}
        {assigneeName ? (
          <span
            title={assigneeName}
            className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-[8px] font-semibold text-slate-700"
          >
            {initialsFromName(assigneeName)}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function TaskBoardCard({ task, canUpdate, onOpenTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: !canUpdate,
  })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(canUpdate ? listeners : null)}
      {...(canUpdate ? attributes : null)}
      className={cn(
        'overflow-hidden rounded-lg border border-gray-200/90 bg-white shadow-sm transition-shadow hover:shadow-md',
        canUpdate ? 'cursor-grab touch-none active:cursor-grabbing' : 'cursor-default',
        isDragging && 'opacity-40 ring-2 ring-[var(--brand-primary)]/40',
      )}
    >
      <TaskCardBody task={task} interactive canUpdate={canUpdate} onOpenTask={onOpenTask} />
    </div>
  )
}

function TaskColumn({ section, groupBy, collapsed, onToggleCollapse, onOpenTask, canUpdate }) {
  const droppableId = `col:${section.id}`
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })
  const meta = sectionMeta(groupBy, section.id)

  if (collapsed) {
    return (
      <div ref={setNodeRef} className={cn('flex h-full w-10 shrink-0 flex-col items-center rounded-lg border border-gray-200/70 py-2', meta.columnBg, isOver && 'ring-2 ring-[var(--brand-primary)]/50')}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded p-1 text-gray-400 hover:bg-white/70 hover:text-gray-700"
          aria-label={`Expand ${section.title}`}
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', meta.dot)} aria-hidden />
        <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-gray-700 [writing-mode:vertical-rl]">
          {section.title} · {section.count}
        </p>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full min-h-0 w-[364px] shrink-0 flex-col rounded-lg border border-gray-200/70',
        meta.columnBg || 'bg-gray-50/60',
        isOver && 'ring-2 ring-[var(--brand-primary)]/50 ring-offset-1',
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 rounded-t-lg border-b border-gray-200/70 bg-white px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', meta.dot)} aria-hidden />
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-gray-900">{section.title}</p>
          <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-gray-600">
            {section.count}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label={`Collapse ${section.title}`}
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2 scrollbar-subtle">
        {section.tasks.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-300/80 bg-white/50 px-3 py-8 text-center text-[11px] text-gray-400">
            No tasks
          </p>
        ) : (
          section.tasks.map((task) => <TaskBoardCard key={task.id} task={task} canUpdate={canUpdate} onOpenTask={onOpenTask} />)
        )}
      </div>
    </div>
  )
}

export function TaskBoardView({ tasks, groupBy, isLoading, onOpenTask, onMove, canUpdate = true }) {
  const [activeId, setActiveId] = useState(null)
  const [collapsedCols, setCollapsedCols] = useState({})
  // Optimistic local override: null means use server rows
  const [localTasks, setLocalTasks] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const effectiveTasks = localTasks ?? tasks
  const sections = useMemo(() => buildTaskSections(effectiveTasks, groupBy), [effectiveTasks, groupBy])
  const activeTask = useMemo(() => effectiveTasks.find((t) => t.id === activeId), [effectiveTasks, activeId])
  const field = groupBy === 'priority' ? 'priority' : 'status'

  async function handleDragEnd(event) {
    const { active, over } = event
    setActiveId(null)
    if (!over?.id) return
    const overId = String(over.id)
    if (!overId.startsWith('col:')) return
    const nextValue = overId.slice('col:'.length)
    const dragged = effectiveTasks.find((t) => t.id === active.id)
    if (!dragged || !nextValue) return
    const currentValue = field === 'priority' ? String(dragged.priority || 'medium') : String(dragged.status || 'pending')
    if (nextValue === currentValue) return

    const original = [...effectiveTasks]
    setLocalTasks(original.map((t) => (t.id === dragged.id ? { ...t, [field]: nextValue } : t)))
    try {
      await onMove(dragged, field, nextValue)
      setLocalTasks(null)
    } catch {
      setLocalTasks(original)
    }
  }

  if (isLoading && !effectiveTasks.length) {
    return <SkeletonCards count={4} cols="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" cardHeight="h-44" />
  }

  return (
    <DndContext sensors={sensors} onDragStart={({ active }) => setActiveId(active.id)} onDragEnd={handleDragEnd}>
      <div className="flex h-[calc(100dvh-13rem)] min-h-[480px] gap-3 overflow-x-auto pb-2 scrollbar-subtle">
        {sections.map((section) => (
          <TaskColumn
            key={section.id}
            section={section}
            groupBy={groupBy}
            collapsed={Boolean(collapsedCols[section.id])}
            onToggleCollapse={() => setCollapsedCols((c) => ({ ...c, [section.id]: !c[section.id] }))}
            onOpenTask={onOpenTask}
            canUpdate={canUpdate}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="w-[344px] rotate-2 scale-[1.03] overflow-hidden rounded-lg border border-gray-200/90 bg-white shadow-xl">
            <TaskCardBody task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
