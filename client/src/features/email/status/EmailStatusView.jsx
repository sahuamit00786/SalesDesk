import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, RefreshCw, UserRound } from '@/components/ui/icons'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { DataGrid } from '@/components/shared/DataGrid'
import { useGetEmailStatusListQuery } from '@/features/email/emailApi'
import { useGetLeadQuery } from '@/features/leads/leadsApi'
import { LeadBillToPicker } from '@/components/shared/LeadBillToPicker'
import { getEmailTrackingBadge } from '@/features/gmail/emailTrackingBadge'
import { cn } from '@/utils/cn'

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All sources' },
  { value: 'direct', label: 'Direct (lead profile)' },
  { value: 'bulk', label: 'Bulk (template send)' },
  { value: 'workflow', label: 'Workflow automation' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'sent', label: 'Sent' },
  { value: 'opened', label: 'Opened' },
  { value: 'clicked', label: 'Clicked' },
  { value: 'replied', label: 'Replied' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
]

const SOURCE_LABEL = { direct: 'Direct', bulk: 'Bulk', workflow: 'Workflow' }
const SOURCE_COLOR = { direct: '#2563eb', bulk: '#7c3aed', workflow: '#0f766e' }

function defaultDateFrom() {
  const d = new Date()
  d.setDate(d.getDate() - 29)
  return d.toISOString().slice(0, 10)
}
function defaultDateTo() {
  return new Date().toISOString().slice(0, 10)
}
function formatSentAt(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const COLUMNS = [
  {
    field: 'to',
    headerName: 'Recipient',
    renderCell: ({ value, row }) => (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{value || '—'}</p>
        {row.leadId ? (
          <Link
            to={`/leads/${row.leadId}`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline"
          >
            <UserRound size={10} />
            {row.leadLabel || 'View lead'}
          </Link>
        ) : null}
      </div>
    ),
  },
  {
    field: 'source',
    headerName: 'Send type',
    renderCell: ({ value }) => (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{ background: `${SOURCE_COLOR[value] || '#6b7280'}18`, color: SOURCE_COLOR[value] || '#6b7280' }}
      >
        {SOURCE_LABEL[value] || value}
      </span>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    renderCell: ({ row }) => {
      const badge = getEmailTrackingBadge(row)
      return (
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', badge.className)}>
          {badge.label}
        </span>
      )
    },
  },
  { field: 'sentAt', headerName: 'Sent', renderCell: ({ value }) => <span className="whitespace-nowrap text-xs text-ink-muted">{formatSentAt(value)}</span> },
  { field: 'openCount', headerName: 'Opens', width: 120, renderCell: ({ value }) => value || 0 },
  { field: 'clickCount', headerName: 'Clicks', width: 120, renderCell: ({ value }) => value || 0 },
]

export function EmailStatusView() {
  const [dateFrom, setDateFrom] = useState(defaultDateFrom)
  const [dateTo, setDateTo] = useState(defaultDateTo)
  const [source, setSource] = useState('all')
  const [status, setStatus] = useState('all')
  const [leadId, setLeadId] = useState('')

  // BUG FIX (§15.2 of the bug audit) — resolves only the currently-selected filter
  // lead by id instead of fetching a `limit: 400` list that couldn't reach every lead.
  const { data: leadFilterRes } = useGetLeadQuery(leadId, { skip: !leadId })
  const selectedLeadFilter = leadFilterRes?.data || null

  const params = useMemo(
    () => ({ dateFrom, dateTo, source, status, leadId: leadId || undefined, page: 1, limit: 200 }),
    [dateFrom, dateTo, source, status, leadId],
  )
  const { data, isFetching, refetch } = useGetEmailStatusListQuery(params)
  const rows = useMemo(() => data?.data || [], [data?.data])

  const exportCsv = useCallback(() => {
    const headers = ['Recipient', 'Subject', 'Send type', 'Status', 'Sent', 'Opens', 'Clicks']
    const escape = (val) => {
      const s = val == null ? '' : String(val)
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [headers.map(escape).join(',')]
    for (const row of rows) {
      lines.push(
        [row.to, row.subject, SOURCE_LABEL[row.source] || row.source, row.status, formatSentAt(row.sentAt), row.openCount || 0, row.clickCount || 0]
          .map(escape)
          .join(','),
      )
    }
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'email-status.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [rows])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3">
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-muted">From</label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-xl border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-muted">To</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-xl border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-muted">Send type</label>
          <Select value={source} onChange={(e) => setSource(e.target.value)} className="h-9 w-44">
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-muted">Status</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-40">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-muted">Lead</label>
          <LeadBillToPicker
            selectedLead={selectedLeadFilter}
            onSelect={(l) => setLeadId(l?.id || '')}
            placeholder="All leads"
            filterResults={(l) => Boolean(l.email)}
            inputClassName="h-9 w-48 rounded-lg border border-surface-border bg-white px-2 text-sm"
          />
        </div>
        <Button variant="icon" onClick={refetch} disabled={isFetching} className="mt-auto border border-surface-border" aria-label="Refresh">
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </Button>
        <Button variant="icon" onClick={exportCsv} disabled={!rows.length} className="mt-auto border border-surface-border" aria-label="Export CSV">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      <DataGrid
        columns={COLUMNS}
        data={rows}
        loading={isFetching}
        searchable={false}
        showColumnToggle={false}
        showExportCsv={false}
        autoHeight={false}
        maxHeightClass="max-h-[calc(100dvh-260px)]"
        className="min-h-0 flex-1 border-surface-border"
        emptyTitle="No sent emails"
        emptyDescription="No emails match the selected filters for this date range."
      />
    </div>
  )
}
