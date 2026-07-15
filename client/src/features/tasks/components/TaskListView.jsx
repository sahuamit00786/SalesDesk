import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flag,
  LayoutGrid,
  XCircle,
} from '@/components/ui/icons'
import { SkeletonList } from '@/components/shared/SkeletonLoader'
import { cn } from '@/utils/cn'
import { PRIORITY_META, SECTION_PAGE_SIZE, STATUS_META } from '../taskConstants'
import { TaskRow, TasksTableColGroup } from './TaskRow'

export function StatusSummaryBar({ counts, overdueOpen, showAllClear }) {
  const chips = [
    { id: 'pending', label: 'Pending', count: counts.pending, ring: 'ring-violet-200', bg: 'bg-violet-50', text: 'text-violet-800' },
    { id: 'in_progress', label: 'In progress', count: counts.in_progress, ring: 'ring-amber-200', bg: 'bg-amber-50', text: 'text-amber-900' },
    { id: 'completed', label: 'Completed', count: counts.completed, ring: 'ring-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-900' },
    { id: 'cancelled', label: 'Cancelled', count: counts.cancelled, ring: 'ring-gray-200', bg: 'bg-gray-50', text: 'text-gray-800' },
  ]
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2 py-2 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
      <p className="w-full text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:w-auto sm:pr-1.5">Totals by status</p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <div key={c.id} className={cn('inline-flex min-w-[6.25rem] items-center justify-between gap-2 rounded-md px-2 py-1 ring-1', c.ring, c.bg)}>
            <span className={cn('text-[11px] font-medium', c.text)}>{c.label}</span>
            <span className={cn('text-sm font-bold tabular-nums', c.text)}>{c.count}</span>
          </div>
        ))}
      </div>
      {overdueOpen > 0 ? (
        <div className="flex items-center sm:ml-auto">
          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-red-100">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {overdueOpen} open {overdueOpen === 1 ? 'task' : 'tasks'} overdue
          </span>
        </div>
      ) : showAllClear ? (
        <p className="text-xs text-gray-500 sm:ml-auto">No open overdue tasks.</p>
      ) : null}
    </div>
  )
}

function SectionHeader({ section, open, onToggle, count, action }) {
  return (
    <div className="flex w-full items-center justify-between gap-1.5 rounded-md bg-[#F9FAFB] px-2 py-1.5 transition hover:bg-gray-100">
      <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className="shrink-0 text-gray-500">{open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>
        {section.icon === 'grid' ? (
          <LayoutGrid className="h-4 w-4 shrink-0 text-violet-600" />
        ) : section.icon === 'dot' ? (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400" aria-hidden />
        ) : section.icon === 'check' ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        ) : section.icon === 'cancel' ? (
          <XCircle className="h-4 w-4 shrink-0 text-gray-500" />
        ) : section.icon === 'flag' ? (
          <Flag
            className={cn('h-4 w-4 shrink-0 fill-current', PRIORITY_META[section.id]?.flagClass || 'text-gray-400')}
            strokeWidth={1.5}
          />
        ) : <XCircle className="h-4 w-4 shrink-0 text-gray-500" />}
        <span className="text-xs font-semibold text-gray-900">{section.title}</span>
        <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-500 shadow-sm ring-1 ring-[#E5E7EB]">
          {count === 1 ? 'Task' : 'Tasks'} {count}
        </span>
      </button>
      {action}
    </div>
  )
}

export function TaskListView({
  sections,
  listGroupBy,
  openSections,
  onToggleSection,
  sectionPages,
  onSetSectionPage,
  isLoading,
  isError,
  error,
  onRetry,
  onMarkAllCompleted,
  markingAll,
  onToggleParentComplete,
  onToggleSubtaskDone,
  onOpenTask,
  onQuickPatch,
  patchingKey,
}) {
  if (isLoading) return <SkeletonList rows={8} />
  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-sm text-red-800">
        Could not load tasks.{error?.data?.error?.message ? ` ${error.data.error.message}` : ''}{' '}
        <button type="button" className="font-medium underline" onClick={onRetry}>Retry</button>
      </div>
    )
  }

  return (
    <>
      {sections.map((section) => {
        const secPage = sectionPages[section.id] ?? 1
        const secPages = Math.max(1, Math.ceil(section.count / SECTION_PAGE_SIZE))
        const secStart = (secPage - 1) * SECTION_PAGE_SIZE
        const visibleTasks = section.tasks.slice(secStart, secStart + SECTION_PAGE_SIZE)
        const accent = listGroupBy === 'priority'
          ? PRIORITY_META[section.id]?.accentBorder
          : STATUS_META[section.id]?.accentBorder
        return (
          <section
            key={section.id}
            className={cn(
              'overflow-hidden rounded-lg border border-l-4 border-[#E5E7EB] bg-white shadow-sm transition-shadow hover:shadow-md',
              accent || 'border-l-gray-200',
            )}
          >
            <div className="border-b border-[#E5E7EB] px-1.5 py-1">
              <SectionHeader
                section={section}
                open={openSections[section.id]}
                onToggle={() => onToggleSection(section.id)}
                count={section.count}
                action={listGroupBy === 'status' && section.id === 'in_progress' && section.count > 0 ? (
                  <button
                    type="button"
                    onClick={() => onMarkAllCompleted(section.tasks)}
                    disabled={markingAll}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {markingAll ? 'Marking…' : 'Mark all done'}
                  </button>
                ) : undefined}
              />
            </div>
            {openSections[section.id] ? (
              <>
                <div className="scrollbar-subtle overflow-x-auto">
                  <table className="cx-table cx-table--dense min-w-[960px] table-fixed">
                    <TasksTableColGroup />
                    <thead className="cx-table-sticky-head">
                      <tr>
                        <th>Task</th>
                        <th>Description</th>
                        <th>Lead</th>
                        <th className="text-center">Assignee</th>
                        <th className="whitespace-nowrap text-left">Due date</th>
                        <th className="whitespace-nowrap text-left">Status</th>
                        <th className="whitespace-nowrap text-left">Priority</th>
                        <th className="whitespace-nowrap text-left">Progress</th>
                        <th className="cx-table-cell-actions w-16 text-right" aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {section.count === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-2 py-5 text-center text-sm text-gray-500">
                            {listGroupBy === 'priority' ? 'No tasks with this priority.' : 'No tasks in this status.'}
                          </td>
                        </tr>
                      ) : (
                        visibleTasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            onToggleParentComplete={onToggleParentComplete}
                            onToggleSubtaskDone={onToggleSubtaskDone}
                            onOpenTask={onOpenTask}
                            onQuickPatch={onQuickPatch}
                            patchingKey={patchingKey}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {section.count > SECTION_PAGE_SIZE ? (
                  <div className="flex items-center justify-between border-t border-[#E5E7EB] bg-[#FAFAFA] px-4 py-2">
                    <p className="text-xs text-gray-500">
                      {secStart + 1}–{Math.min(secStart + SECTION_PAGE_SIZE, section.count)} of {section.count}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={secPage <= 1}
                        onClick={() => onSetSectionPage(section.id, secPage - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-[52px] text-center text-xs font-medium text-gray-700">
                        {secPage} / {secPages}
                      </span>
                      <button
                        type="button"
                        disabled={secPage >= secPages}
                        onClick={() => onSetSectionPage(section.id, secPage + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </section>
        )
      })}
    </>
  )
}
