import { useEffect, useMemo, useState } from 'react'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Phone, Search } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { CreateMeetingModal } from '@/features/meetings/components/CreateMeetingModal'
import { MeetingsListPanel } from '@/features/meetings/components/MeetingsListPanel'
import { useGetMeetingsQuery } from '@/features/meetings/meetingsApi'
import { useGetLeadFormMetaQuery } from '@/features/leads/leadsApi'
import { cn } from '@/utils/cn'

/** Google Meet–style mark (not an official Google asset). */
function GoogleMeetLogo({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#fff" />
      <rect x="14" y="8" width="26" height="6" fill="#FBBC04" />
      <path fill="#EA4335" d="M8 8h6L8 13.5V8z" />
      <path fill="#4285F4" d="M8 14h6v26H8V14z" />
      <rect x="14" y="34" width="26" height="6" fill="#34A853" />
      <rect x="34" y="14" width="6" height="20" fill="#34A853" />
      <path fill="#34A853" d="M40 11.5L48 24L40 36.5z" />
    </svg>
  )
}

const CHANNEL_TABS = [
  { id: 'video', label: 'Meeting', Logo: GoogleMeetLogo, logoClass: 'h-4 w-4' },
  { id: 'call', label: 'Call', Logo: Phone, logoClass: 'h-4 w-4 text-emerald-700' },
]

function hasMeetLink(m) {
  return Boolean(String(m?.googleMeetLink || '').trim())
}

export function MeetingsPage() {
  const [channel, setChannel] = useState('video')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [editMeeting, setEditMeeting] = useState(null)

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
    const list = Array.isArray(data?.data) ? data.data : []
    if (channel === 'video') return list.filter(hasMeetLink)
    return list.filter((m) => !hasMeetLink(m))
  }, [data, channel])

  return (
    <PageShell fullWidth flush mainClassName="bg-white p-6">
      <div className="w-full min-h-full">
        <div className="w-full space-y-3 border-b border-gray-100 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {CHANNEL_TABS.map(({ id, label, Logo, logoClass }) => {
              const active = channel === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChannel(id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition',
                    active
                      ? id === 'video'
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  <Logo className={logoClass} aria-hidden />
                  {label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-2 border-t border-gray-100 bg-white pt-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="relative min-w-0 flex-1 sm:min-w-[260px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title…"
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                autoComplete="off"
              />
            </div>
            <label className="flex min-w-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Start
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              End
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
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
                  <ArrowUpNarrowWide className="h-4 w-4 text-indigo-600" />
                  Earliest first
                </>
              ) : (
                <>
                  <ArrowDownWideNarrow className="h-4 w-4 text-indigo-600" />
                  Latest first
                </>
              )}
            </button>
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
        open={!!editMeeting}
        initialData={editMeeting}
        onClose={() => setEditMeeting(null)}
        users={users}
        leadId={editMeeting?.leadId}
      />
    </PageShell>
  )
}
