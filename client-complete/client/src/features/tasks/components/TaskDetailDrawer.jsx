import { useMemo } from 'react'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { LeadTaskDrawer } from '@/features/leads/components/LeadTaskDrawer'
import { useGetLeadTasksQuery } from '@/features/leads/leadsApi'

/**
 * Safety wrapper around LeadTaskDrawer for rows coming from GET /tasks.
 * Those rows lack `reminders` (and other detail fields); passing one straight
 * into LeadTaskDrawer would save `reminders: []` and wipe them server-side.
 * Resolve the full task from the per-lead endpoint first.
 */
export function TaskDetailDrawer({ open, taskRow, onClose }) {
  const leadId = taskRow?.leadId
  const { data, isFetching } = useGetLeadTasksQuery(leadId, { skip: !open || !leadId })

  const fullTask = useMemo(() => {
    const rows = Array.isArray(data?.data) ? data.data : []
    return rows.find((t) => t.id === taskRow?.id) || null
  }, [data, taskRow])

  if (!open) return null

  if (!fullTask) {
    return (
      <RightDrawer open={open} onClose={onClose} title="Task" description={isFetching ? 'Loading task…' : 'Task not found.'}>
        <div className="space-y-3 p-1">
          {isFetching ? (
            <>
              <div className="h-6 w-2/3 animate-pulse rounded-md bg-gray-100" />
              <div className="h-20 animate-pulse rounded-md bg-gray-100" />
              <div className="h-6 w-1/2 animate-pulse rounded-md bg-gray-100" />
            </>
          ) : (
            <p className="text-sm text-gray-500">This task may have been deleted.</p>
          )}
        </div>
      </RightDrawer>
    )
  }

  return (
    <LeadTaskDrawer
      open={open}
      onClose={onClose}
      leadId={leadId}
      task={fullTask}
      leadTitle={taskRow?.lead?.title || taskRow?.lead?.contactName || ''}
    />
  )
}
