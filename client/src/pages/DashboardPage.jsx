import { PageShell } from '@/components/layout/PageShell'
import { EmptyState } from '@/components/shared/EmptyState'
import { Loader } from '@/components/shared/Loader'
import { useGetDashboardStatsQuery } from '@/features/analytics/analyticsApi'
import { BarChart2 } from 'lucide-react'

function StatCard({ label, value, hint }) {
  return (
    <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-sm text-ink-muted">{hint}</p> : null}
    </div>
  )
}

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useGetDashboardStatsQuery()

  const stats = data?.success ? data.data : null

  return (
    <PageShell
      title="Dashboard"
      description="KPIs, funnel, and tasks due today will populate here."
    >
      {isLoading ? <Loader label="Loading dashboard" /> : null}

      {isError ? (
        <EmptyState
          icon={BarChart2}
          title="Could not load stats"
          description={error?.data?.error?.message ?? 'Check the API server and try again.'}
          action={
            <button
              type="button"
              className="h-10 px-5 rounded-xl border border-surface-border bg-white text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface-muted"
              onClick={() => refetch()}
            >
              Retry
            </button>
          }
        />
      ) : null}

      {!isLoading && !isError && stats ? (
        <div className="grid gap-6 md:grid-cols-3">
          <StatCard label="Open leads" value={stats.openLeads ?? '—'} hint="Across all owners" />
          <StatCard label="Pipeline value" value={stats.pipelineValue ?? '—'} hint="Weighted forecast" />
          <StatCard label="Tasks due" value={stats.tasksDue ?? '—'} hint="Today & overdue" />
        </div>
      ) : null}

      {!isLoading && !isError && !stats ? (
        <EmptyState
          icon={BarChart2}
          title="No analytics yet"
          description="Wire your analytics service to see live KPIs."
        />
      ) : null}
    </PageShell>
  )
}
