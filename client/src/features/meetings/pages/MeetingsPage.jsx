import { useEffect, useMemo, useState } from 'react'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Plus, Search } from '@/components/ui/icons'
import { PageShell } from '@/components/layout/PageShell'
import { CreateMeetingModal } from '@/features/meetings/components/CreateMeetingModal'
import { MeetingsListPanel } from '@/features/meetings/components/MeetingsListPanel'
import { useGetMeetingsQuery } from '@/features/meetings/meetingsApi'
import { useGetLeadFormMetaQuery } from '@/features/leads/leadsApi'
import { RequirePermission } from '@/components/auth/RequirePermission'

export function MeetingsPage() {
  const channel = 'video'
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [statusFilter, setStatusFilter] = useState('active')
  const [editMeeting, setEditMeeting] = useState(null)
  const [creatingMeeting, setCreatingMeeting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const queryParams = useMemo(() => {
    const q = {
      page: 1,
      limit: 100,
      sortField: 'scheduledStart',
      sortOrder,
    }
    if (debouncedSearch) q.search = debouncedSearch
    if (dateFrom) q.dateFrom = `${dateFrom}T00:00:00.000Z`
    if (dateTo) q.dateTo = `${dateTo}T23:59:59.999Z`
    return q
  }, [debouncedSearch, dateFrom, dateTo, sortOrder])

  const { data, isLoading, isFetching } = useGetMeetingsQuery(queryParams)
  const { data: formMeta } = useGetLeadFormMetaQuery()
  const users = formMeta?.data?.users || []

  const filteredMeetings = useMemo(() => {
    const meetings = Array.isArray(data?.data) ? data.data : []

    const getDisplayStatus = (m) => {
      const start = m.scheduledStart ? new Date(m.scheduledStart) : null
      const end = m.scheduledEnd ? new Date(m.scheduledEnd) : null
      if (!start || Number.isNaN(start.getTime())) return m.status
      const now = new Date()
      if (end && !Number.isNaN(end.getTime())) {
        if (now < start) return 'scheduled'
        if (now >= start && now <= end) return 'live'
        if (now > end) return 'expired'
      } else if (now < start) {
        return 'scheduled'
      } else {
        return 'expired'
      }
      return m.status
    }

    if (statusFilter === 'all') return meetings
    if (statusFilter === 'active') {
      return meetings.filter((m) => {
        const status = getDisplayStatus(m)
        return status === 'scheduled' || status === 'live'
      })
    }
    if (statusFilter === 'completed') {
      return meetings.filter((m) => {
        const status = getDisplayStatus(m)
        return status === 'completed' || status === 'cancelled' || status === 'missed' || status === 'expired'
      })
    }
    return meetings
  }, [data, statusFilter])

  return (
    <PageShell fullWidth flush mainClassName="bg-white p-6">
      <div className="w-full min-h-full">
        <div className="w-full border-b border-gray-100 pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="relative min-w-0 flex-1 sm:min-w-[260px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title…"
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                autoComplete="off"
              />
            </div>
            <label className="flex min-w-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Start
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              End
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
              />
            </label>
            <button
              type="button"
              onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
              className="inline-flex items-center justify-center gap-1.5 self-stretch rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:self-auto"
              title="Sort by meeting start time"
            >
              {sortOrder === 'asc' ? (
                <>
                  <ArrowUpNarrowWide className="h-4 w-4 text-brand-600" />
                  Earliest first
                </>
              ) : (
                <>
                  <ArrowDownWideNarrow className="h-4 w-4 text-brand-600" />
                  Latest first
                </>
              )}
            </button>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="all">All</option>
            </select>
            <RequirePermission menu="engage.meetings" action="create">
              <button
                type="button"
                onClick={() => setCreatingMeeting(true)}
                className="inline-flex items-center justify-center gap-1.5 self-stretch rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-semibold cx-icon-inherit text-white shadow-sm transition hover:bg-[var(--brand-primary-dark)] sm:self-auto"
              >
                <Plus className="h-4 w-4" aria-hidden />
                New meeting
              </button>
            </RequirePermission>
          </div>
        </div>

        {isFetching && !isLoading ? (
          <p className="py-2 text-center text-xs text-gray-400">Updating…</p>
        ) : null}

        <MeetingsListPanel
          meetings={filteredMeetings}
          channel={channel}
          isLoading={isLoading}
          onEdit={(m) => setEditMeeting(m)}
        />
      </div>

      <CreateMeetingModal
        open={!!editMeeting || creatingMeeting}
        initialData={editMeeting}
        onClose={() => {
          setEditMeeting(null)
          setCreatingMeeting(false)
        }}
        users={users}
        leadId={editMeeting?.leadId}
      />
    </PageShell>
  )
}
