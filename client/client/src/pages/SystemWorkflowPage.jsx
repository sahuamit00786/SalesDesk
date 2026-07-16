import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LeadNestLogo } from '@/components/shared/LeadNestLogo'
import { SystemWorkflowDiagram } from '@/features/systemWorkflow/SystemWorkflowDiagram'

/**
 * Public reference page — no auth required. Meant to be shared with
 * testers/stakeholders directly via /systemworkflow, so it renders its
 * own minimal chrome instead of the authenticated PageShell.
 */
export function SystemWorkflowPage() {
  useEffect(() => {
    const prevTitle = document.title
    document.title = 'System Workflow — LeadNest'
    return () => {
      document.title = prevTitle
    }
  }, [])

  return (
    <div className="flex h-dvh flex-col bg-surface-muted">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-surface-border bg-white px-4 py-2.5 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <LeadNestLogo className="h-8 w-auto sm:h-9" />
        </Link>
        <div className="text-right">
          <div className="text-sm font-bold text-ink">System Workflow</div>
          <div className="text-[11px] text-ink-muted">Click a node to trace its data flow</div>
        </div>
      </header>
      <main className="min-h-0 flex-1 p-2 sm:p-3">
        <SystemWorkflowDiagram className="h-full" />
      </main>
    </div>
  )
}
