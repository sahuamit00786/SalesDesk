import { useCallback, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpDown,
  CalendarDays,
  Filter,
  List,
  Plus,
  Search,
  SquareKanban,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { CalendarWorkspace } from '@/features/calendar/components/CalendarWorkspace'
import { LeadTaskDrawer } from '@/features/leads/components/LeadTaskDrawer'
import { usePatchLeadTaskMutation } from '@/features/leads/leadsApi'
import { useGetTasksQuery, usePatchTaskByIdMutation } from '@/features/tasks/tasksApi'
import {
  DEFAULT_OPEN,
  DEFAULT_SECTION_PAGES,
  DUE_QUICK_FILTERS,
  LIST_GROUP_TABS,
  PAGE_LIMIT,
} from '@/features/tasks/taskConstants'
import {
  buildTaskSections,
  isTaskOverdueRow,
  localDateToIso,
  todayLocalDateKey,
  tomorrowLocalDateKey,
} from '@/features/tasks/taskUtils'
import { TaskBoardView } from '@/features/tasks/components/TaskBoardView'
import { TaskDetailDrawer } from '@/features/tasks/components/TaskDetailDrawer'
import { TaskListView, StatusSummaryBar } from '@/features/tasks/components/TaskListView'
import { TasksFilterModal } from '@/features/tasks/components/TasksFilterModal'
import { TasksSortPopover } from '@/features/tasks/components/TasksSortPopover'
import { cn } from '@/utils/cn'

const VIEWS = [
  { id: 'list', label: 'List', icon: List },
  { id: 'board', label: 'Board', icon: SquareKanban },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
]

export function TasksPage() {
  const [activeView, setActiveView] = useState('list')
  const [listGroupBy, setListGroupBy] = useState('status')
  const [dueQuickFilter, setDueQuickFilter] = useState('all')
  const [openSections, setOpenSections] = useState(() => ({ ...DEFAULT_OPEN }))
  const [patchingKey, setPatchingKey] = useState(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('dueAt')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [sectionPages, setSectionPages] = useState(() => ({ ...DEFAULT_SECTION_PAGES }))
  const [showSortPopover, setShowSortPopover] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [drawerTask, setDrawerTask] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState({
    leadId: '', leadLabel: '', assigneeId: '', dueFrom: '', dueTo: '',
  })

  const sortBtnRef = useRef(null)

  const taskQuery = useMemo(() => {
    const params = { page, limit: PAGE_LIMIT, sort: sortBy, sortDir }
    if (search.trim()) params.search = search.trim()
    if (appliedFilters.assigneeId) params.assignedTo = appliedFilters.assigneeId
    if (appliedFilters.leadId) params.leadId = appliedFilters.leadId
    if (appliedFilters.dueFrom) params.dueFrom = localDateToIso(appliedFilters.dueFrom)
    if (appliedFilters.dueTo) params.dueTo = localDateToIso(appliedFilters.dueTo, true)
    if (dueQuickFilter === 'overdue') params.status = 'overdue'
    else if (dueQuickFilter === 'not_overdue') params.overdue = 'false'
    else if (dueQuickFilter === 'due_today') {
      const day = todayLocalDateKey()
      params.dueFrom = localDateToIso(day)
      params.dueTo = localDateToIso(day, true)
    } else if (dueQuickFilter === 'upcoming') {
      params.dueFrom = localDateToIso(tomorrowLocalDateKey())
    }
    return params
  }, [page, sortBy, sortDir, search, appliedFilters, dueQuickFilter])

  const { data: tasksRes, isLoading, isError, error, refetch } = useGetTasksQuery(taskQuery)
  const [patchLeadTask] = usePatchLeadTaskMutation()
  const [patchTaskById] = usePatchTaskByIdMutation()

  const allRows = useMemo(() => Array.isArray(tasksRes?.data) ? tasksRes.data : [], [tasksRes])

  const statusCounts = useMemo(() => {
    const c = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 }
    for (const t of allRows) {
      const k = t.status && c[t.status] != null ? t.status : 'pending'
      c[k] += 1
    }
    return c
  }, [allRows])

  const overdueOpenCount = useMemo(() => allRows.filter(isTaskOverdueRow).length, [allRows])
  const taskSections = useMemo(() => buildTaskSections(allRows, listGroupBy), [allRows, listGroupBy])

  const activeFilterCount =
    [appliedFilters.leadId, appliedFilters.assigneeId, appliedFilters.dueFrom, appliedFilters.dueTo].filter(Boolean).length +
    (dueQuickFilter !== 'all' ? 1 : 0)

  const toggleSection = useCallback((id) => {
    setOpenSections((s) => ({ ...s, [id]: !s[id] }))
  }, [])

  const setSectionPage = useCallback((id, p) => {
    setSectionPages((s) => ({ ...s, [id]: p }))
  }, [])

  const onQuickPatch = useCallback(async (task, patch) => {
    if (!task?.id) return
    try {
      await patchTaskById({ taskId: task.id, leadId: task.leadId, listArgs: taskQuery, ...patch }).unwrap()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not update task.')
      throw err
    }
  }, [patchTaskById, taskQuery])

  const onBoardMove = useCallback(
    (task, field, value) => onQuickPatch(task, { [field]: value }).catch(() => {}),
    [onQuickPatch],
  )

  const onRowQuickPatch = useCallback(
    (task, patch) => onQuickPatch(task, patch).catch(() => {}),
    [onQuickPatch],
  )

  const onToggleParentComplete = useCallback(async (task) => {
    const leadId = task.leadId
    const taskId = task.id
    if (!leadId || !taskId) return
    const next = task.status === 'completed' ? 'pending' : 'completed'
    const key = `${leadId}:${taskId}`
    setPatchingKey(key)
    try {
      await patchLeadTask({ id: leadId, taskId, status: next }).unwrap()
    } catch {
      toast.error('Could not update task.')
    } finally {
      setPatchingKey(null)
    }
  }, [patchLeadTask])

  const [markingAll, setMarkingAll] = useState(false)
  const onMarkAllCompleted = useCallback(async (tasks) => {
    const open = tasks.filter((t) => t.status !== 'completed' && t.leadId && t.id)
    if (!open.length) return
    if (!window.confirm(`Mark all ${open.length} ${open.length === 1 ? 'task' : 'tasks'} as completed?`)) return
    setMarkingAll(true)
    let failed = 0
    try {
      const CHUNK = 15
      for (let i = 0; i < open.length; i += CHUNK) {
        const results = await Promise.allSettled(
          open.slice(i, i + CHUNK).map((t) => patchLeadTask({ id: t.leadId, taskId: t.id, status: 'completed' }).unwrap()),
        )
        failed += results.filter((r) => r.status === 'rejected').length
      }
    } finally {
      setMarkingAll(false)
    }
    if (failed) toast.error(`${failed} of ${open.length} tasks could not be updated.`)
    else toast.success(`${open.length} ${open.length === 1 ? 'task' : 'tasks'} marked completed.`)
  }, [patchLeadTask])

  const onToggleSubtaskDone = useCallback(async (parentTask, sub) => {
    const leadId = parentTask.leadId
    const taskId = parentTask.id
    if (!leadId || !taskId) return
    const subs = Array.isArray(parentTask.subtasks) ? parentTask.subtasks : []
    const next = subs.map((s) => ({
      title: String(s.title || '').trim() || 'Item',
      done: s.id === sub.id ? !s.done : Boolean(s.done),
    }))
    setPatchingKey(`${leadId}:${taskId}:sub`)
    try {
      await patchLeadTask({ id: leadId, taskId, subtasks: next }).unwrap()
    } catch {
      toast.error('Could not update checklist.')
    } finally {
      setPatchingKey(null)
    }
  }, [patchLeadTask])

  const showListControls = activeView !== 'calendar'

  return (
    <PageShell fullWidth>
      <div className="bg-white">
        {/* Top bar */}
        <div className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
          <div className="flex flex-col gap-2 px-2 py-2 sm:px-3 lg:flex-row lg:items-center lg:justify-between lg:px-4">
            {/* View toggle */}
            <div className="flex flex-wrap gap-1.5">
              {VIEWS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveView(id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                    activeView === id
                      ? 'border-[#7c3aed] bg-violet-50 text-[#7c3aed]'
                      : 'border-[#E5E7EB] bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Search + action buttons */}
            <div className="flex flex-wrap items-center gap-1.5 lg:ml-auto">
              {showListControls ? (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    className="h-9 w-48 rounded-lg border border-[#E5E7EB] bg-white pl-8 pr-3 text-xs outline-none focus:border-[#7c3aed]"
                    placeholder="Search tasks…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  />
                </div>
              ) : null}

              {/* Filter button */}
              <button
                type="button"
                onClick={() => setShowFilterModal(true)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                  activeFilterCount > 0
                    ? 'border-violet-400 bg-violet-50 text-violet-700'
                    : 'border-[#E5E7EB] bg-white text-gray-700 hover:bg-gray-50',
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                Filter
                {activeFilterCount > 0 ? (
                  <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>

              {/* Sort By button + popover */}
              <div className="relative" ref={sortBtnRef}>
                <button
                  type="button"
                  onClick={() => setShowSortPopover((v) => !v)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                    showSortPopover
                      ? 'border-violet-400 bg-violet-50 text-violet-700'
                      : 'border-[#E5E7EB] bg-white text-gray-700 hover:bg-gray-50',
                  )}
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  Sort By
                  {sortBy !== 'dueAt' || sortDir !== 'asc' ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  ) : null}
                </button>
                {showSortPopover ? (
                  <TasksSortPopover
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onChange={(field, dir) => {
                      setSortBy(field)
                      setSortDir(dir)
                      setPage(1)
                      setShowSortPopover(false)
                    }}
                    onClose={() => setShowSortPopover(false)}
                  />
                ) : null}
              </div>

              {/* Clear filters chip */}
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setAppliedFilters({ leadId: '', leadLabel: '', assigneeId: '', dueFrom: '', dueTo: '' })
                    setDueQuickFilter('all')
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                >
                  <X className="h-3 w-3" />
                  Clear filters
                </button>
              ) : null}

              {/* New task */}
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--brand-primary-dark)]"
              >
                <Plus className="h-3.5 w-3.5" />
                New Task
              </button>
            </div>
          </div>

          {/* Group by + due quick filters */}
          {showListControls ? (
            <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2 sm:px-3 lg:px-4">
              {LIST_GROUP_TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setListGroupBy(id)}
                  className={cn(
                    'inline-flex items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                    listGroupBy === id
                      ? 'border-[#7c3aed] bg-violet-50 text-[#7c3aed]'
                      : 'border-[#E5E7EB] bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  {label}
                </button>
              ))}
              <span className="mx-0.5 hidden h-5 w-px bg-[#E5E7EB] sm:inline" aria-hidden />
              {DUE_QUICK_FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setDueQuickFilter(id)
                    setPage(1)
                  }}
                  className={cn(
                    'inline-flex items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                    dueQuickFilter === id
                      ? id === 'overdue'
                        ? 'border-rose-300 bg-rose-50 text-rose-800'
                        : 'border-[#7c3aed] bg-violet-50 text-[#7c3aed]'
                      : 'border-[#E5E7EB] bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  {id === 'overdue' ? <AlertTriangle className="mr-1 h-3 w-3 shrink-0" aria-hidden /> : null}
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {showListControls ? (
          <div className="space-y-3 px-2 py-3 sm:px-3 lg:px-4">
            {/* Active filter chips */}
            {activeFilterCount > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {appliedFilters.leadLabel ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200">
                    Lead: {appliedFilters.leadLabel}
                  </span>
                ) : null}
                {appliedFilters.assigneeId ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200">
                    Assignee filter active
                  </span>
                ) : null}
                {(appliedFilters.dueFrom || appliedFilters.dueTo) ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200">
                    Due: {appliedFilters.dueFrom || '…'} → {appliedFilters.dueTo || '…'}
                  </span>
                ) : null}
                {dueQuickFilter !== 'all' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200">
                    {DUE_QUICK_FILTERS.find((f) => f.id === dueQuickFilter)?.label || dueQuickFilter}
                    <button
                      type="button"
                      className="rounded p-0.5 hover:bg-violet-100"
                      aria-label="Clear due quick filter"
                      onClick={() => setDueQuickFilter('all')}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Summary bar */}
            {activeView === 'list' && listGroupBy === 'status' && !isLoading && !isError ? (
              <StatusSummaryBar
                counts={statusCounts}
                overdueOpen={overdueOpenCount}
                showAllClear={Boolean(allRows.length > 0 && overdueOpenCount === 0)}
              />
            ) : null}

            {activeView === 'list' ? (
              <TaskListView
                sections={taskSections}
                listGroupBy={listGroupBy}
                openSections={openSections}
                onToggleSection={toggleSection}
                sectionPages={sectionPages}
                onSetSectionPage={setSectionPage}
                isLoading={isLoading}
                isError={isError}
                error={error}
                onRetry={refetch}
                onMarkAllCompleted={onMarkAllCompleted}
                markingAll={markingAll}
                onToggleParentComplete={onToggleParentComplete}
                onToggleSubtaskDone={onToggleSubtaskDone}
                onOpenTask={setDrawerTask}
                onQuickPatch={onRowQuickPatch}
                patchingKey={patchingKey}
              />
            ) : (
              <TaskBoardView
                tasks={allRows}
                groupBy={listGroupBy}
                isLoading={isLoading}
                onOpenTask={setDrawerTask}
                onMove={onBoardMove}
              />
            )}
          </div>
        ) : null}

        {activeView === 'calendar' ? (
          <CalendarWorkspace
            lockedTypes={['task']}
            filterAssignedTo={appliedFilters.assigneeId || undefined}
            filterLeadId={appliedFilters.leadId || undefined}
            className="min-h-[520px] h-[calc(100dvh-9rem)] w-full min-w-0 rounded-none border-x-0 border-b-0 border-t border-gray-200"
          />
        ) : null}
      </div>

      {/* Filter modal */}
      <TasksFilterModal
        open={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={appliedFilters}
        onApply={(f) => { setAppliedFilters(f); setPage(1); setSectionPages({ ...DEFAULT_SECTION_PAGES }) }}
      />

      {/* Task detail drawer */}
      <TaskDetailDrawer
        open={Boolean(drawerTask)}
        taskRow={drawerTask}
        onClose={() => setDrawerTask(null)}
      />

      {/* Create task drawer */}
      <LeadTaskDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </PageShell>
  )
}
