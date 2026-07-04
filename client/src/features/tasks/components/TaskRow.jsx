import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronRight, ExternalLink, PanelRight } from 'lucide-react'
import { TaskAttachmentIcons } from '@/features/leads/components/TaskAttachmentIcons'
import { cn } from '@/utils/cn'
import {
  computeTaskProgress,
  formatDueLabel,
  initialsFromName,
  isSubtaskOverdueRow,
  isTaskOverdueRow,
} from '../taskUtils'
import { PriorityFlag, PriorityFlagMenu } from './PriorityFlag'
import { StatusPill, StatusPillMenu } from './StatusPill'

const ACCENT = 'var(--brand-primary, #5B21B6)'

export function ProgressRing({ value, size = 32, stroke = 2.5 }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, value))
  const offset = c - (pct / 100) * c
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={ACCENT} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
      />
    </svg>
  )
}

export function AvatarStack({ people }) {
  if (!people?.length) return <span className="text-xs text-gray-400">—</span>
  return (
    <div className="flex -space-x-2">
      {people.map((p, i) => (
        <span
          key={`${p.initials}-${i}`}
          title={p.name || p.initials}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-slate-200 to-slate-300 text-[8px] font-semibold text-slate-700"
        >
          {p.initials}
        </span>
      ))}
    </div>
  )
}

export function TasksTableColGroup() {
  return (
    <colgroup>
      <col style={{ width: '22%' }} />
      <col style={{ width: '16%' }} />
      <col style={{ width: '13%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '64px' }} />
    </colgroup>
  )
}

export function TaskRow({
  task,
  subtask,
  depth = 0,
  isLastChild = false,
  onToggleParentComplete,
  onToggleSubtaskDone,
  onOpenTask,
  onQuickPatch,
  patchingKey,
}) {
  const isChild = Boolean(subtask)
  const parent = isChild ? task : null
  const title = isChild ? subtask.title : task.title
  const description = isChild ? '' : (task.description || '').trim()
  const priKey = (isChild ? parent?.priority : task?.priority) || 'medium'
  const padLeft = depth > 0 ? 32 + (depth - 1) * 22 : 0

  const assigneeUser = isChild ? parent?.assignee : task?.assignee
  const assignees = assigneeUser?.name || assigneeUser?.email
    ? [{ initials: initialsFromName(assigneeUser.name || assigneeUser.email), name: assigneeUser.name || assigneeUser.email }]
    : []

  const dueLabel = isChild ? (parent?.dueAt ? formatDueLabel(parent.dueAt) : '—') : formatDueLabel(task?.dueAt)
  const overdue = isChild ? isSubtaskOverdueRow(parent, subtask) : isTaskOverdueRow(task)

  const { pct, label } = isChild
    ? { pct: subtask.done ? 100 : 0, label: subtask.done ? 'Done' : 'Open' }
    : computeTaskProgress(task)

  const parentComplete = task?.status === 'completed'
  const parentCancelled = task?.status === 'cancelled'
  const rowPatchKey = isChild ? `${parent.leadId}:${parent.id}:sub` : `${task.leadId}:${task.id}`
  const isPatching = patchingKey === rowPatchKey

  return (
    <>
      <tr className={cn('group bg-white transition-colors hover:bg-violet-50/40', parentCancelled && 'opacity-70')}>
        <td className="max-w-0 overflow-hidden align-middle" style={{ paddingLeft: `${8 + padLeft}px` }}>
          <div className="relative flex min-w-0 items-center gap-1">
            {depth > 0 ? (
              <>
                <span className={cn('pointer-events-none absolute -left-5 w-px bg-violet-200', isLastChild ? 'top-[-4px] h-[calc(50%+4px)]' : 'top-[-4px] h-[calc(100%+20px)]')} aria-hidden />
                <span className="pointer-events-none absolute -left-5 top-1/2 h-px w-4 -translate-y-1/2 bg-violet-300" aria-hidden />
              </>
            ) : null}
            <input
              type="checkbox"
              className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-[#7c3aed] focus:ring-[#7c3aed]"
              checked={isChild ? Boolean(subtask.done) : parentComplete}
              disabled={isPatching || (!isChild && parentCancelled)}
              onChange={() => isChild ? onToggleSubtaskDone?.(task, subtask) : onToggleParentComplete?.(task)}
            />
            <div className="min-w-0 flex-1">
              {!isChild ? (
                <button
                  type="button"
                  onClick={() => onOpenTask?.(task)}
                  className="block w-full truncate text-left text-xs font-medium text-gray-900 hover:text-[#7c3aed]"
                >
                  {title}
                </button>
              ) : (
                <span className="inline-flex max-w-full items-center gap-1 truncate text-xs font-medium text-gray-800">
                  <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />
                  <span className="truncate">{title}</span>
                </span>
              )}
              {!isChild ? <TaskAttachmentIcons attachments={task.attachments} variant="compact" className="mt-1" /> : null}
            </div>
          </div>
        </td>
        <td className="max-w-0 overflow-hidden align-middle">
          {description ? <p className="line-clamp-2 break-words text-xs text-gray-500">{description}</p> : <span className="text-xs text-gray-400">—</span>}
        </td>
        <td className="max-w-0 overflow-hidden align-middle">
          {!isChild && (task.lead?.title || task.lead?.contactName) ? (
            <Link
              to={`/leads/${task.leadId}`}
              className="block truncate text-xs font-medium text-gray-700 hover:text-violet-600 hover:underline"
              title={task.lead?.title || task.lead?.contactName}
            >
              {task.lead?.title || task.lead?.contactName}
            </Link>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>
        <td className="align-middle text-center">
          <div className="flex justify-center"><AvatarStack people={assignees} /></div>
        </td>
        <td className={cn('whitespace-nowrap align-middle text-left text-xs', overdue ? 'font-medium text-red-600' : 'text-gray-700')}>
          {dueLabel}
        </td>
        <td className="whitespace-nowrap align-middle text-left">
          {!isChild ? (
            <span className="inline-flex items-center gap-1">
              <StatusPillMenu
                value={task.status || 'pending'}
                disabled={isPatching}
                onChange={(status) => onQuickPatch?.(task, { status })}
              />
              {overdue ? <AlertTriangle className="h-3 w-3 shrink-0 text-red-600" aria-label="Overdue" /> : null}
            </span>
          ) : (
            <StatusPill value={subtask.done ? 'completed' : 'pending'} />
          )}
        </td>
        <td className="whitespace-nowrap align-middle text-left">
          {!isChild ? (
            <PriorityFlagMenu
              value={priKey}
              disabled={isPatching}
              onChange={(priority) => onQuickPatch?.(task, { priority })}
            />
          ) : (
            <PriorityFlag value={priKey} />
          )}
        </td>
        <td className="max-w-0 overflow-hidden align-middle text-left">
          <div className="flex min-w-0 items-center gap-1">
            <ProgressRing value={pct} size={22} />
            <span className="min-w-0 truncate text-xs text-gray-600">{label}</span>
          </div>
        </td>
        <td className="cx-table-cell-actions w-16 shrink-0 text-right">
          {!isChild && task.leadId ? (
            <span className="inline-flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onOpenTask?.(task)}
                className="inline-flex rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-[#7c3aed]"
                aria-label="Open task"
                title="Open task"
              >
                <PanelRight className="h-3.5 w-3.5" />
              </button>
              <Link
                to={`/leads/${task.leadId}`}
                className="inline-flex rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-[#7c3aed]"
                aria-label="Open lead"
                title="Open lead"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </span>
          ) : <span className="inline-block w-8" />}
        </td>
      </tr>
      {!isChild && Array.isArray(task.subtasks) && task.subtasks.length
        ? task.subtasks.map((s, idx, arr) => (
            <TaskRow
              key={s.id}
              task={task}
              subtask={s}
              depth={depth + 1}
              isLastChild={idx === arr.length - 1}
              onToggleParentComplete={onToggleParentComplete}
              onToggleSubtaskDone={onToggleSubtaskDone}
              onOpenTask={onOpenTask}
              onQuickPatch={onQuickPatch}
              patchingKey={patchingKey}
            />
          ))
        : null}
    </>
  )
}
