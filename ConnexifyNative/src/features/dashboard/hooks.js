import { useQuery } from '@tanstack/react-query';
import { useWorkspaceId } from '../../hooks/useListQuery';
import { dashboardApi } from './api';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Server contract: GET /analytics/dashboard-charts (analyticsController.dashboardCharts)
 * data.kpis { totalLeads, totalOpps, pipelineValue, wonValue, openTasks, overdueTasks }
 * data.charts { leadStatusDist[{name,value}], oppStatusDist[{name,value}],
 *   pipelineByStage[{name,count,value}], pipelineTrend[{month,created,won,...}],
 *   activitiesByType[{name,value}], tasksThroughput[{date,created,completed}] }
 * data.topMembers [{name, leadsOwned, tasksCompleted, activities, score}]
 */
export function useDashboard(rangeDays = 30, scope = 'all') {
  const ws = useWorkspaceId();
  const enabled = Boolean(ws);
  const now = new Date();
  const from = new Date(now.getTime() - rangeDays * DAY);

  const base = { staleTime: 60_000, enabled };
  const key = (name) => [ws, 'dashboard', name, rangeDays, scope];

  const charts = useQuery({
    ...base,
    queryKey: key('charts'),
    queryFn: () => dashboardApi.charts({ from, to: now, scope }),
    select: (r) => r.data || {},
  });

  const upcomingMeetings = useQuery({
    ...base,
    queryKey: key('upcoming-meetings'),
    queryFn: () =>
      dashboardApi.calendarEvents({ from: now, to: new Date(now.getTime() + 2 * DAY), types: 'meeting' }),
    select: (r) => (Array.isArray(r.data) ? r.data : []).slice(0, 8),
  });

  const expiringTasks = useQuery({
    ...base,
    queryKey: key('expiring-tasks'),
    queryFn: () =>
      dashboardApi.tasks({ page: 1, limit: 50, sort: 'dueAt', sortDir: 'asc', status: 'pending,in_progress' }),
    select: (r) => {
      const horizon = Date.now() + 7 * DAY;
      return (Array.isArray(r.data) ? r.data : [])
        .filter((t) => t.dueAt && new Date(t.dueAt).getTime() <= horizon)
        .slice(0, 6);
    },
  });

  const feed = useQuery({
    ...base,
    queryKey: key('feed'),
    queryFn: () => dashboardApi.activitiesFeed(10),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
  });

  const all = [charts, upcomingMeetings, expiringTasks, feed];

  return {
    charts,
    upcomingMeetings,
    expiringTasks,
    feed,
    refetchAll: () => Promise.all(all.map((q) => q.refetch())),
    isRefreshing: all.some((q) => q.isRefetching) && !all.some((q) => q.isPending),
  };
}
